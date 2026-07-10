// ============================================================
// COMBAT RULES ENGINE — damage types, defenses, conditions,
// riders, undo, and the player-request pipeline.
// The DM app is always the authority; players only send requests.
// ============================================================

var DAMAGE_TYPES = ['slashing','piercing','bludgeoning','fire','cold','lightning','thunder','poison','acid','necrotic','radiant','force','psychic'];

// Mechanical effects of 5e conditions the engine can adjudicate.
// attackersAdv/attackersDis: attacks AGAINST this creature.
// selfDis: this creature's own attacks. autoCritMelee: melee hits auto-crit.
// cantAct: no actions. speedZero / halfSpeed: movement gating.
var CONDITION_EFFECTS = {
  'Prone':        { meleeAttackersAdv: true, rangedAttackersDis: true, selfDis: true, halfSpeed: true },
  'Poisoned':     { selfDis: true },
  'Blinded':      { attackersAdv: true, selfDis: true },
  'Restrained':   { attackersAdv: true, selfDis: true, speedZero: true },
  'Grappled':     { speedZero: true },
  'Paralyzed':    { attackersAdv: true, autoCritMelee: true, cantAct: true, speedZero: true },
  'Stunned':      { attackersAdv: true, cantAct: true, speedZero: true },
  'Unconscious':  { attackersAdv: true, autoCritMelee: true, cantAct: true, speedZero: true },
  'Incapacitated':{ cantAct: true },
  'Invisible':    { attackersDis: true, selfAdv: true },
  'Frightened':   { selfDis: true },
  'Petrified':    { attackersAdv: true, cantAct: true, speedZero: true, resistAll: true },
  'Charmed':      {}, // can't attack the charmer — needs source tracking, DM adjudicates
  'Deafened':     {},
  'Exhaustion':   { selfDis: true },
  'Stable':       {}
};

// ─── Dice ────────────────────────────────────────────────────
function rollDiceExpr(str) {
  var m = String(str || '').trim().match(/^(\d*)d(\d+)\s*([+-]\s*\d+)?$/i);
  if (!m) return { total: 0, rolls: [], mod: 0, text: str };
  var count = Math.min(parseInt(m[1]) || 1, 40);
  var sides = parseInt(m[2]);
  var mod = m[3] ? parseInt(m[3].replace(/\s/g, '')) : 0;
  var rolls = [];
  for (var i = 0; i < count; i++) rolls.push(Math.floor(Math.random() * sides) + 1);
  var total = rolls.reduce(function(a, b) { return a + b; }, 0) + mod;
  return { total: Math.max(0, total), rolls: rolls, mod: mod, text: str };
}

function rollD20WithAdvState(advState) {
  var a = Math.floor(Math.random() * 20) + 1;
  if (advState === 0) return a;
  var b = Math.floor(Math.random() * 20) + 1;
  return advState > 0 ? Math.max(a, b) : Math.min(a, b);
}

// ─── Defenses: resistance / immunity / vulnerability ─────────
// Returns {taken, notes[]} applying 5e order: immune → resist → vulnerable.
function applyDamageWithDefenses(target, amount, dmgType) {
  var notes = [];
  var taken = amount;
  var conds = target.conditions || [];
  var resistAll = conds.some(function(c) { return (CONDITION_EFFECTS[c] || {}).resistAll; });
  if (dmgType && DAMAGE_TYPES.indexOf(dmgType) >= 0) {
    if ((target.immune || []).indexOf(dmgType) >= 0) {
      notes.push('immune to ' + dmgType + ' — no damage');
      return { taken: 0, notes: notes };
    }
    if ((target.resist || []).indexOf(dmgType) >= 0 || resistAll) {
      taken = Math.floor(taken / 2);
      notes.push('halved to ' + taken + ' (' + (resistAll ? 'petrified' : 'resistant to ' + dmgType) + ')');
    }
    if ((target.vuln || []).indexOf(dmgType) >= 0) {
      taken = taken * 2;
      notes.push('doubled to ' + taken + ' (vulnerable to ' + dmgType + ')');
    }
  } else if (resistAll) {
    taken = Math.floor(taken / 2);
    notes.push('halved to ' + taken + ' (petrified)');
  }
  return { taken: taken, notes: notes };
}

// ─── Condition queries ───────────────────────────────────────
function combatantCanAct(c) {
  var conds = c.conditions || [];
  for (var i = 0; i < conds.length; i++) {
    var eff = CONDITION_EFFECTS[conds[i]];
    if (eff && eff.cantAct) return { ok: false, reason: conds[i] };
  }
  if (c.hp <= 0) return { ok: false, reason: 'at 0 HP' };
  return { ok: true };
}

function combatantSpeedFt(c, baseFt) {
  var speed = baseFt || 30;
  var conds = c.conditions || [];
  for (var i = 0; i < conds.length; i++) {
    var eff = CONDITION_EFFECTS[conds[i]];
    if (!eff) continue;
    if (eff.speedZero) return 0;
    if (eff.halfSpeed) speed = Math.floor(speed / 2);
  }
  return speed;
}

// Net advantage state for an attack: +1 adv, -1 dis, 0 normal (adv+dis cancel per RAW)
function computeAttackContext(attacker, target, action) {
  var isMelee = (parseInt(action.range) || 5) <= 5;
  var adv = false, dis = false, autoCrit = false;
  var notes = [];
  (attacker.conditions || []).forEach(function(cn) {
    var eff = CONDITION_EFFECTS[cn]; if (!eff) return;
    if (eff.selfDis) { dis = true; notes.push('you are ' + cn.toLowerCase() + ' (disadvantage)'); }
    if (eff.selfAdv) { adv = true; notes.push('you are ' + cn.toLowerCase() + ' (advantage)'); }
  });
  (target.conditions || []).forEach(function(cn) {
    var eff = CONDITION_EFFECTS[cn]; if (!eff) return;
    if (eff.attackersAdv) { adv = true; notes.push('target is ' + cn.toLowerCase() + ' (advantage)'); }
    if (eff.attackersDis) { dis = true; notes.push('target is ' + cn.toLowerCase() + ' (disadvantage)'); }
    if (eff.meleeAttackersAdv && isMelee) { adv = true; notes.push('target is ' + cn.toLowerCase() + ', melee (advantage)'); }
    if (eff.rangedAttackersDis && !isMelee) { dis = true; notes.push('target is ' + cn.toLowerCase() + ', ranged (disadvantage)'); }
    if (eff.autoCritMelee && isMelee) { autoCrit = true; notes.push('target is ' + cn.toLowerCase() + ' — melee hits are CRITICAL'); }
  });
  var net = (adv && dis) ? 0 : adv ? 1 : dis ? -1 : 0;
  if (adv && dis) notes.push('advantage and disadvantage cancel — roll normally');
  return { net: net, autoCrit: autoCrit, isMelee: isMelee, notes: notes };
}

// Ability mod for saves: PCs use their sheet; monsters estimate +1
function saveBonusFor(combatant, ability) {
  var pc = (typeof party !== 'undefined' ? party : []).find(function(p) { return p.name === combatant.name; });
  if (pc && pc[ability]) return Math.floor((pc[ability] - 10) / 2);
  return 1;
}

function pvLogTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function logCombat(text, type) {
  combatLog.unshift({ round: currentRound || 0, text: text, type: type || 'info', time: pvLogTime() });
  if (combatLog.length > 200) combatLog.pop();
  if (typeof renderCombatLog === 'function') renderCombatLog();
}

// ─── Undo ────────────────────────────────────────────────────
var lastActionSnapshot = null;
function snapshotBeforeAction() {
  try {
    lastActionSnapshot = {
      combatants: JSON.parse(JSON.stringify(combatants)),
      tokens: typeof mapState !== 'undefined' ? JSON.parse(JSON.stringify(mapState.tokens || {})) : null,
      round: round, currentTurn: currentTurn
    };
    var btn = document.getElementById('undo-action-btn');
    if (btn) btn.style.display = 'inline-flex';
  } catch(e) {}
}

function undoLastAction() {
  if (!lastActionSnapshot) { showToast('Nothing to undo', 'info'); return; }
  combatants = lastActionSnapshot.combatants;
  round = lastActionSnapshot.round;
  currentTurn = lastActionSnapshot.currentTurn;
  if (lastActionSnapshot.tokens && typeof mapState !== 'undefined') mapState.tokens = lastActionSnapshot.tokens;
  lastActionSnapshot = null;
  var btn = document.getElementById('undo-action-btn');
  if (btn) btn.style.display = 'none';
  window.lastActionResult = null;
  if (typeof updateRoundDisplay === 'function' && combatActive) updateRoundDisplay();
  renderCombatants();
  if (typeof renderMap === 'function') renderMap();
  logCombat('↶ Last action undone by DM', 'round');
  showToast('↶ Undone', 'success');
  if (window.cloudSave) window.cloudSave();
}

// ─── Core resolver (used by both player requests and DM act-as) ─
// opts: { roll: number|null (raw d20; null = engine rolls with adv/dis), source: 'player'|'dm' }
function resolveCombatAction(attackerId, targetId, action, opts) {
  opts = opts || {};
  var attacker = combatants.find(function(x) { return x.id === attackerId; });
  var target = combatants.find(function(x) { return x.id === targetId; });
  var a = action || {};
  if (!attacker || !target || !a.name) return null;

  var can = combatantCanAct(attacker);
  if (!can.ok) {
    showToast('🚫 ' + attacker.name + ' can\'t act — ' + can.reason, 'warn');
    return null;
  }

  snapshotBeforeAction();

  var result = {
    id: Date.now(),
    kind: a.kind === 'heal' ? 'heal' : 'attack',
    attacker: attacker.name,
    target: target.name,
    actionName: a.name,
    notes: [],
    ts: new Date().toISOString()
  };

  if (result.kind === 'attack') {
    var ctx = computeAttackContext(attacker, target, a);
    result.advState = ctx.net;
    result.advNotes = ctx.notes;
    var roll = opts.roll !== null && opts.roll !== undefined
      ? Math.max(1, Math.min(20, parseInt(opts.roll) || 1))
      : rollD20WithAdvState(ctx.net);
    var bonus = parseInt(a.bonus) || 0;
    var total = roll + bonus;
    var crit = roll === 20 || (ctx.autoCrit && total >= (target.ac || 10));
    var hit = roll === 20 ? true : roll === 1 ? false : total >= (target.ac || 10);
    result.roll = roll; result.bonus = bonus; result.total = total;
    result.targetAC = target.ac || 10; result.hit = hit; result.crit = hit && crit;

    if (hit) {
      var dmg = rollDiceExpr(a.dice);
      var amount = dmg.total;
      if (result.crit) amount += rollDiceExpr(String(a.dice).replace(/[+-]\s*\d+$/, '')).total;
      var def = applyDamageWithDefenses(target, amount, a.damageType);
      result.rawAmount = amount;
      result.amount = def.taken;
      result.damageType = a.damageType || '';
      result.notes = result.notes.concat(def.notes);
      var prevHp = target.hp;
      target.hp = Math.max(0, target.hp - def.taken);
      if (typeof checkConcentration === 'function' && def.taken > 0) checkConcentration(target, def.taken);
      if (target.hp === 0 && prevHp > 0) result.notes.push(target.name + ' drops to 0 HP!');

      // Condition rider: on-hit save-or-suffer
      if (a.applyCondition && CONDITION_EFFECTS[a.applyCondition] !== undefined) {
        var applied = false;
        if (a.saveAbility && a.saveDC) {
          var sb = saveBonusFor(target, a.saveAbility);
          var saveRoll = Math.floor(Math.random() * 20) + 1;
          var saveTotal = saveRoll + sb;
          var saved = saveTotal >= a.saveDC;
          result.save = { ability: a.saveAbility.toUpperCase(), dc: a.saveDC, roll: saveRoll, bonus: sb, total: saveTotal, saved: saved };
          if (!saved) applied = true;
          result.notes.push(target.name + ' ' + a.saveAbility.toUpperCase() + ' save: ' + saveRoll + (sb >= 0 ? '+' : '') + sb + '=' + saveTotal + ' vs DC ' + a.saveDC + ' — ' + (saved ? 'SAVED' : 'FAILED'));
        } else {
          applied = true;
        }
        if (applied) {
          target.conditions = target.conditions || [];
          if (target.conditions.indexOf(a.applyCondition) < 0) target.conditions.push(a.applyCondition);
          result.appliedCondition = a.applyCondition;
          result.notes.push(target.name + ' is now ' + a.applyCondition + '!');
        }
      }

      logCombat('⚔ ' + attacker.name + (result.crit ? ' CRIT ' : ' hit ') + target.name + ' with ' + a.name + ' (' + roll + '+' + bonus + '=' + total + ' vs AC ' + result.targetAC + ') — ' + def.taken + (a.damageType ? ' ' + a.damageType : '') + ' dmg (' + prevHp + '→' + target.hp + ' HP)' + (result.notes.length ? ' · ' + result.notes.join(' · ') : ''), 'damage');
      showToast((result.crit ? '💥 CRIT! ' : '⚔ ') + attacker.name + ' hit ' + target.name + ' for ' + def.taken, 'success');
    } else {
      result.amount = 0;
      logCombat('⚔ ' + attacker.name + ' missed ' + target.name + ' with ' + a.name + ' (' + roll + '+' + bonus + '=' + total + ' vs AC ' + result.targetAC + ')', 'info');
      showToast('🛡 ' + attacker.name + ' missed ' + target.name, 'info');
    }
  } else {
    var heal = rollDiceExpr(a.dice);
    var prev = target.hp;
    target.hp = Math.min(target.maxHp, target.hp + heal.total);
    result.amount = target.hp - prev;
    result.hit = true;
    // Healing wakes the unconscious
    if (prev === 0 && target.hp > 0 && (target.conditions || []).indexOf('Unconscious') >= 0) {
      target.conditions = target.conditions.filter(function(x) { return x !== 'Unconscious'; });
      result.notes.push(target.name + ' regains consciousness!');
    }
    logCombat('❤ ' + attacker.name + ' healed ' + target.name + ' with ' + a.name + ' for ' + result.amount + ' (' + prev + '→' + target.hp + ' HP)' + (result.notes.length ? ' · ' + result.notes.join(' · ') : ''), 'heal');
    showToast('❤ ' + attacker.name + ' healed ' + target.name + ' for ' + result.amount, 'success');
  }

  window.lastActionResult = result;
  renderCombatants();
  if (typeof renderMap === 'function') renderMap();
  if (window.cloudSave) window.cloudSave();
  return result;
}

// ─── Player request pipeline ─────────────────────────────────
function processPlayerAction(req) {
  if (!req || !req.type) return;
  try {
    if (req.type === 'move') processPlayerMove(req);
    else if (req.type === 'action') processPlayerCombatAction(req);
    else if (req.type === 'endTurn') processPlayerEndTurn(req);
  } catch(e) {
    console.error('processPlayerAction', e);
  }
}

function requireTurn(c) {
  if (combatActive && combatants[currentTurn] && combatants[currentTurn].id !== c.id) {
    showToast('🚫 ' + c.name + ' tried to act out of turn', 'warn');
    return false;
  }
  return true;
}

function processPlayerMove(req) {
  var c = combatants.find(function(x) { return x.id === req.combatantId; });
  if (!c || c.type !== 'ally') return;
  if (!requireTurn(c)) return;
  var can = combatantCanAct(c);
  var speed = combatantSpeedFt(c, req.baseSpeed || 30);
  if (speed === 0 || (!can.ok && can.reason !== 'at 0 HP')) {
    showToast('🚫 ' + c.name + ' can\'t move (' + ((c.conditions || []).join(', ') || can.reason) + ')', 'warn');
    return;
  }
  if (typeof mapState === 'undefined') return;
  var x = Math.max(0, Math.min(mapState.cols - 1, parseInt(req.x) || 0));
  var y = Math.max(0, Math.min(mapState.rows - 1, parseInt(req.y) || 0));
  snapshotBeforeAction();
  mapState.tokens[c.id] = { x: x, y: y };
  if (typeof renderMap === 'function') renderMap();
  logCombat('🥾 ' + c.name + ' moved', 'info');
  showToast('🥾 ' + c.name + ' moved', 'info');
  if (window.cloudSave) window.cloudSave();
}

function processPlayerCombatAction(req) {
  var attacker = combatants.find(function(x) { return x.id === req.combatantId; });
  if (!attacker) return;
  if (!requireTurn(attacker)) return;
  resolveCombatAction(req.combatantId, req.targetId, req.action, { roll: req.roll, source: 'player' });
}

function processPlayerEndTurn(req) {
  var c = combatants.find(function(x) { return x.id === req.combatantId; });
  if (!c || !requireTurn(c)) return;
  if (!combatActive) return;
  logCombat('⏭ ' + c.name + ' ended their turn', 'round');
  if (typeof nextTurn === 'function') nextTurn();
  if (window.cloudSave) window.cloudSave();
}

// ─── DM act-as: run any combatant's actions through the engine ─
function dmOpenActMenu(combatantId) {
  var c = combatants.find(function(x) { return x.id === combatantId; });
  if (!c) return;
  var pc = (typeof party !== 'undefined' ? party : []).find(function(p) { return p.name === c.name; });
  var actions = (c.actions && c.actions.length) ? c.actions : (pc && pc.actions) || [];
  if (!actions.length) { showToast('No structured actions on ' + c.name + ' — add some via the character sheet or encounter generator', 'info'); return; }

  var existing = document.getElementById('dm-act-modal');
  if (existing) existing.remove();
  var ov = document.createElement('div');
  ov.id = 'dm-act-modal';
  ov.className = 'modal-overlay show';
  ov.style.zIndex = '2600';
  var inner = '<div class="modal" style="max-width:420px;width:95%;">' +
    '<h3 style="font-family:Cinzel,serif;color:var(--gold);margin-bottom:4px;">⚔ ' + c.name + ' acts</h3>' +
    '<div style="font-size:12px;color:var(--text-dim);margin-bottom:12px;">Pick an action, then a target. The engine handles defenses, conditions, and crits.</div>';
  actions.forEach(function(a, i) {
    inner += '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--border);border-radius:6px;margin-bottom:6px;background:rgba(0,0,0,0.25);">' +
      '<span>' + (a.kind === 'heal' ? '❤' : '⚔') + '</span>' +
      '<div style="flex:1;">' +
        '<div style="font-size:14px;color:var(--parchment);">' + a.name + '</div>' +
        '<div style="font-size:11px;color:var(--text-dim);">' + (a.range || 5) + ' ft · ' + (a.dice || '') + (a.kind !== 'heal' ? ' · +' + (a.bonus || 0) + (a.damageType ? ' · ' + a.damageType : '') : '') + '</div>' +
      '</div>' +
      '<button class="btn btn-gold btn-sm" onclick="dmPickTarget(' + combatantId + ',' + i + ')">Use</button>' +
    '</div>';
  });
  inner += '<div class="modal-btns"><button class="btn btn-ghost" onclick="document.getElementById(\'dm-act-modal\').remove()">Cancel</button></div></div>';
  ov.innerHTML = inner;
  ov.addEventListener('click', function(e) { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
  window.__dmActActions = actions;
}

function dmPickTarget(attackerId, actionIdx) {
  var a = (window.__dmActActions || [])[actionIdx];
  var attacker = combatants.find(function(x) { return x.id === attackerId; });
  if (!a || !attacker) return;
  var modal = document.getElementById('dm-act-modal');
  var targets = combatants.filter(function(c) {
    if (a.kind === 'heal') return c.type === 'ally';
    return c.id !== attackerId && c.hp > 0;
  });
  var inner = '<div class="modal" style="max-width:420px;width:95%;">' +
    '<h3 style="font-family:Cinzel,serif;color:var(--gold);margin-bottom:12px;">' + a.name + ' → target?</h3>';
  targets.forEach(function(t) {
    inner += '<button style="display:flex;width:100%;align-items:center;gap:8px;padding:9px 12px;border:1px solid var(--border);border-radius:6px;margin-bottom:6px;background:rgba(0,0,0,0.25);color:var(--parchment);cursor:pointer;font-size:14px;" ' +
      'onclick="dmExecuteAction(' + attackerId + ',' + t.id + ',' + actionIdx + ')">' +
      '<span style="color:' + (t.type === 'ally' ? '#90c8ff' : '#ff9090') + ';">' + t.name + '</span>' +
      '<span style="margin-left:auto;font-size:12px;color:var(--text-dim);">' + t.hp + '/' + t.maxHp + ' HP · AC ' + t.ac + '</span>' +
    '</button>';
  });
  inner += '<div class="modal-btns"><button class="btn btn-ghost" onclick="document.getElementById(\'dm-act-modal\').remove()">Cancel</button></div></div>';
  modal.innerHTML = inner;
}

function dmExecuteAction(attackerId, targetId, actionIdx) {
  var a = (window.__dmActActions || [])[actionIdx];
  var modal = document.getElementById('dm-act-modal');
  if (modal) modal.remove();
  if (!a) return;
  // DM rolls digitally — the engine applies advantage/disadvantage automatically
  resolveCombatAction(attackerId, targetId, a, { roll: null, source: 'dm' });
}
