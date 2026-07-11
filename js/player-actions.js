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
  'Stable':       {},
  // Class-feature stances (toggled, not afflictions)
  'Raging':       { resistPhysical: true, bonusMeleeDamage: 2 },
  'Reckless':     { selfAdv: true, attackersAdv: true },
  'Dodging':      { attackersDis: true }
};

// Toggleable class features → the stance condition they apply + action cost
var FEATURE_TOGGLES = {
  'Rage':            { condition: 'Raging',   cost: 'bonus'  },
  'Reckless Attack': { condition: 'Reckless', cost: 'free'   },
  'Dodge':           { condition: 'Dodging',  cost: 'action' }
};

// ─── Action economy ──────────────────────────────────────────
function ensureTurnUsed(c) {
  if (!c.turnUsed) c.turnUsed = { action: false, bonus: false, movedFt: 0 };
  return c.turnUsed;
}

// Called when a combatant's turn STARTS: fresh economy, stances that
// last "until the start of your next turn" fall off.
function startTurnFor(c) {
  if (!c) return;
  c.turnUsed = { action: false, bonus: false, movedFt: 0 };
  var expiring = ['Reckless', 'Dodging'];
  if (c.conditions && c.conditions.some(function(x) { return expiring.indexOf(x) >= 0; })) {
    c.conditions = c.conditions.filter(function(x) { return expiring.indexOf(x) < 0; });
  }
}

// Called when a combatant's turn ENDS: repeat saves + durations (all auto)
function endTurnProcessing(c) {
  if (!c || !c.conditions || !c.conditions.length) return;
  var meta = c.condMeta || {};
  c.conditions.slice().forEach(function(cond) {
    var m = meta[cond];
    if (!m) return;
    if (m.saveAbility && m.saveDC) {
      var bonus = saveBonusFor(c, m.saveAbility);
      var roll = Math.floor(Math.random() * 20) + 1;
      var total = roll + bonus;
      if (total >= m.saveDC) {
        c.conditions = c.conditions.filter(function(x) { return x !== cond; });
        delete meta[cond];
        logCombat('✓ ' + c.name + ' shook off ' + cond + ' (' + m.saveAbility.toUpperCase() + ' save ' + roll + (bonus >= 0 ? '+' : '') + bonus + '=' + total + ' vs DC ' + m.saveDC + ')', 'heal');
        showToast('✓ ' + c.name + ' is no longer ' + cond, 'success');
      } else {
        logCombat('✗ ' + c.name + ' still ' + cond + ' (' + m.saveAbility.toUpperCase() + ' save ' + total + ' vs DC ' + m.saveDC + ')', 'info');
      }
    } else if (m.rounds !== undefined && m.rounds !== null) {
      m.rounds--;
      if (m.rounds <= 0) {
        c.conditions = c.conditions.filter(function(x) { return x !== cond; });
        delete meta[cond];
        logCombat('⏳ ' + cond + ' expired on ' + c.name, 'info');
        showToast('⏳ ' + c.name + ' — ' + cond + ' wore off', 'info');
      }
    }
  });
}

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
    var physRes = ['slashing','piercing','bludgeoning'].indexOf(dmgType) >= 0 &&
      conds.some(function(c) { return (CONDITION_EFFECTS[c] || {}).resistPhysical; });
    if ((target.resist || []).indexOf(dmgType) >= 0 || resistAll || physRes) {
      taken = Math.floor(taken / 2);
      notes.push('halved to ' + taken + ' (' + (resistAll ? 'petrified' : physRes ? 'raging — resists physical' : 'resistant to ' + dmgType) + ')');
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

  // Action economy: attacks/heals cost your Action (or Bonus if flagged)
  var cost = a.cost === 'bonus' ? 'bonus' : 'action';
  if (combatActive) {
    var tu = ensureTurnUsed(attacker);
    if (tu[cost] && opts.source === 'player') {
      showToast('🚫 ' + attacker.name + ' already used their ' + cost + ' this turn', 'warn');
      return null;
    }
    tu[cost] = true; // spent whether it hits or not — DM act-as spends it too but is never blocked
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
      if (ctx.isMelee) {
        (attacker.conditions || []).forEach(function(cn) {
          var bmd = (CONDITION_EFFECTS[cn] || {}).bonusMeleeDamage;
          if (bmd) { amount += bmd; result.notes.push('+' + bmd + ' rage damage'); }
        });
      }
      var dmgType = a.damageType || inferDamageType(a.name);
      var def = applyDamageWithDefenses(target, amount, dmgType);
      result.rawAmount = amount;
      result.amount = def.taken;
      result.damageType = dmgType || '';
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
          if (a.saveAbility && a.saveDC) {
            target.condMeta = target.condMeta || {};
            target.condMeta[a.applyCondition] = { saveAbility: a.saveAbility, saveDC: a.saveDC };
          }
          result.appliedCondition = a.applyCondition;
          result.notes.push(target.name + ' is now ' + a.applyCondition + (a.saveAbility ? ' (repeats the save at end of turn)' : '') + '!');
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
    else if (req.type === 'addCharacter') processPlayerAddCharacter(req);
    else if (req.type === 'deathSave') processPlayerDeathSave(req);
    else if (req.type === 'toggleFeature') processToggleFeature(req);
    else if (req.type === 'equipItem') processEquipItem(req);
    else if (req.type === 'journal') processJournal(req);
    else if (req.type === 'castSpell') processCastSpell(req);
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
  // Movement budget: distance walked accumulates across the whole turn
  var from = mapState.tokens[c.id];
  var dist = from ? dmDistFt(from, { x: x, y: y }) : 0;
  if (combatActive) {
    var tu = ensureTurnUsed(c);
    if (tu.movedFt + dist > speed) {
      showToast('🚫 ' + c.name + ' only has ' + Math.max(0, speed - tu.movedFt) + ' ft of movement left', 'warn');
      return;
    }
    tu.movedFt += dist;
  }
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
  var actions = (c.actions && c.actions.length) ? c.actions : (pc ? effectiveActions(pc) : []);
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

// ─── Damage type inference from action names ─────────────────
// "Fireball" → fire, "Longsword" → slashing, etc. Used when no
// explicit type is set, so attacks Just Work.
var DMG_TYPE_HINTS = [
  [/fire|flame|burn|scorch|ember|inferno|meteor/i, 'fire'],
  [/frost|ice|cold|freez|blizzard|chill/i, 'cold'],
  [/lightning|shock|storm|bolt(?!.*cross)/i, 'lightning'],
  [/thunder|boom|sonic/i, 'thunder'],
  [/poison|venom|toxi/i, 'poison'],
  [/acid|corro|melt/i, 'acid'],
  [/necro|drain|wither|blight|shadow/i, 'necrotic'],
  [/radiant|holy|smite|sacred|divine|sunbeam/i, 'radiant'],
  [/psychic|mind|psi/i, 'psychic'],
  [/force|magic missile|eldritch/i, 'force'],
  [/sword|blade|scimitar|axe|slash|claw|scythe|glaive|halberd/i, 'slashing'],
  [/bow|arrow|dagger|spear|pierc|rapier|bite|sting|javelin|lance|pike|trident|dart|crossbow|shortsword|stab|fang/i, 'piercing'],
  [/club|mace|hammer|maul|slam|staff|fist|punch|flail|bludgeon|smash/i, 'bludgeoning']
];

function inferDamageType(name) {
  var n = String(name || '');
  for (var i = 0; i < DMG_TYPE_HINTS.length; i++) {
    if (DMG_TYPE_HINTS[i][0].test(n)) return DMG_TYPE_HINTS[i][1];
  }
  return '';
}

// ─── Player self-registration from the Player View ───────────
function processPlayerAddCharacter(req) {
  var ch = req.character || {};
  var name = String(ch.name || '').trim().slice(0, 40);
  if (!name) return;
  if (party.some(function(p) { return p.name.toLowerCase() === name.toLowerCase(); })) {
    showToast('🧝 "' + name + '" already exists — player asked to join with a duplicate name', 'warn');
    return;
  }
  var clamp = function(v, lo, hi, dflt) { v = parseInt(v); return isNaN(v) ? dflt : Math.max(lo, Math.min(hi, v)); };
  var pc = {
    id: typeof uniqueId === 'function' ? uniqueId() : Date.now(),
    name: name,
    player: String(ch.player || '').trim().slice(0, 40),
    cls: ['Barbarian','Bard','Cleric','Druid','Fighter','Monk','Paladin','Ranger','Rogue','Sorcerer','Warlock','Wizard','Other'].indexOf(ch.cls) >= 0 ? ch.cls : 'Other',
    race: String(ch.race || '').trim().slice(0, 30),
    level: clamp(ch.level, 1, 20, 1),
    maxhp: clamp(ch.maxhp, 1, 999, 10),
    ac: clamp(ch.ac, 1, 30, 10),
    initBonus: clamp(ch.initBonus, -5, 15, 0),
    speed: clamp(ch.speed, 0, 120, 30),
    str: clamp(ch.str, 1, 30, 10), dex: clamp(ch.dex, 1, 30, 10), con: clamp(ch.con, 1, 30, 10),
    int: clamp(ch.int, 1, 30, 10), wis: clamp(ch.wis, 1, 30, 10), cha: clamp(ch.cha, 1, 30, 10),
    moves: '',
    actions: [],
    skills: {},
    spellSlots: typeof getDefaultSlots === 'function' ? getDefaultSlots(ch.cls, clamp(ch.level, 1, 20, 1)) : []
  };
  party.push(pc);
  if (typeof savePartyStorage === 'function') savePartyStorage();
  if (typeof renderParty === 'function') renderParty();
  showToast('🧝 New character joined the party: ' + name + (pc.player ? ' (' + pc.player + ')' : ''), 'success');
  logCombat('🧝 ' + name + ' joined the party (added from Player View)', 'info');
  if (window.cloudSaveNow) window.cloudSaveNow();
}

// ─── DM-side 5-10-5 distance (same math as the player view) ──
function dmDistFt(a, b) {
  var dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y);
  var diag = Math.min(dx, dy), straight = Math.max(dx, dy) - diag;
  return straight * 5 + diag * 5 + Math.floor(diag / 2) * 5;
}

// ─── Player-entered death saves (private: that player + DM) ──
function applyDeathSaveRoll(c, roll) {
  if (roll === 20) {
    c.hp = 1;
    c.deathSuccess = 0; c.deathFail = 0;
    c.conditions = (c.conditions || []).filter(function(x) { return x !== 'Unconscious'; });
    logCombat('🎉 ' + c.name + ' rolled a natural 20 on a death save — back up with 1 HP!', 'heal');
    showToast('🎉 ' + c.name + ' nat 20 death save — regains 1 HP!', 'success');
  } else if (roll === 1) {
    c.deathFail = (c.deathFail || 0) + 2;
    logCombat('💀 ' + c.name + ' rolled a natural 1 on a death save — two failures', 'damage');
  } else if (roll >= 10) {
    c.deathSuccess = (c.deathSuccess || 0) + 1;
    logCombat(c.name + ' death save success (' + roll + ')', 'info');
  } else {
    c.deathFail = (c.deathFail || 0) + 1;
    logCombat(c.name + ' death save failure (' + roll + ')', 'damage');
  }
  if (c.deathSuccess >= 3) {
    c.conditions = (c.conditions || []).filter(function(x) { return x !== 'Unconscious'; });
    if (c.conditions.indexOf('Stable') < 0) c.conditions.push('Stable');
    c.deathSuccess = 0; c.deathFail = 0;
    logCombat('⚕ ' + c.name + ' stabilized!', 'heal');
    showToast('⚕ ' + c.name + ' stabilized!', 'success');
  } else if (c.deathFail >= 3) {
    c.isDead = true;
    logCombat('💀 ' + c.name + ' has died', 'damage');
    showToast('💀 ' + c.name + ' has died', 'danger');
  }
}

function processPlayerDeathSave(req) {
  var c = combatants.find(function(x) { return x.id === req.combatantId; });
  if (!c || c.type !== 'ally' || c.hp > 0) return;
  var roll = Math.max(1, Math.min(20, parseInt(req.roll) || 1));
  snapshotBeforeAction();
  applyDeathSaveRoll(c, roll);
  renderCombatants();
  if (window.cloudSave) window.cloudSave();
}

// ─── Toggleable class features (Rage / Reckless / Dodge) ────
function processToggleFeature(req) {
  var c = combatants.find(function(x) { return x.id === req.combatantId; });
  var ft = FEATURE_TOGGLES[req.feature];
  if (!c || !ft) return;
  c.conditions = c.conditions || [];
  var active = c.conditions.indexOf(ft.condition) >= 0;

  if (active) {
    // Turning off is always free
    c.conditions = c.conditions.filter(function(x) { return x !== ft.condition; });
    logCombat('◦ ' + c.name + ' ends ' + req.feature, 'info');
    showToast(c.name + ' — ' + req.feature + ' ended', 'info');
  } else {
    if (!requireTurn(c)) return;
    var can = combatantCanAct(c);
    if (!can.ok) { showToast('🚫 ' + c.name + ' can\'t use ' + req.feature + ' — ' + can.reason, 'warn'); return; }
    if (combatActive && ft.cost !== 'free') {
      var tu = ensureTurnUsed(c);
      if (tu[ft.cost]) {
        showToast('🚫 ' + c.name + ' already used their ' + ft.cost + ' this turn', 'warn');
        return;
      }
      tu[ft.cost] = true;
    }
    c.conditions.push(ft.condition);
    logCombat('⚡ ' + c.name + ' uses ' + req.feature + '!', 'info');
    showToast('⚡ ' + c.name + ' — ' + req.feature + '!', 'success');
  }
  renderCombatants();
  if (window.cloudSave) window.cloudSave();
}

// ============================================================
// INVENTORY & EQUIPMENT — items shape stats, weapons make actions
// ============================================================
var ITEM_PRESETS = {
  'torch':          { slot: 'light',  lightFt: 20 },
  'lantern':        { slot: 'light',  lightFt: 30 },
  'hooded lantern': { slot: 'light',  lightFt: 30 },
  'candle':         { slot: 'light',  lightFt: 5 },
  'shield':         { slot: 'shield', acBonus: 2 },
  'leather armor':  { slot: 'armor',  acBonus: 1 },
  'studded leather':{ slot: 'armor',  acBonus: 2 },
  'hide armor':     { slot: 'armor',  acBonus: 2 },
  'chain shirt':    { slot: 'armor',  acBonus: 3 },
  'scale mail':     { slot: 'armor',  acBonus: 4 },
  'breastplate':    { slot: 'armor',  acBonus: 4 },
  'half plate':     { slot: 'armor',  acBonus: 5 },
  'chain mail':     { slot: 'armor',  acBonus: 6 },
  'plate':          { slot: 'armor',  acBonus: 8 },
  'plate armor':    { slot: 'armor',  acBonus: 8 },
  'dagger':         { slot: 'weapon', dice: '1d4', range: 20, damageType: 'piercing' },
  'shortsword':     { slot: 'weapon', dice: '1d6', range: 5,  damageType: 'piercing' },
  'longsword':      { slot: 'weapon', dice: '1d8', range: 5,  damageType: 'slashing' },
  'greatsword':     { slot: 'weapon', dice: '2d6', range: 5,  damageType: 'slashing' },
  'greataxe':       { slot: 'weapon', dice: '1d12', range: 5, damageType: 'slashing' },
  'handaxe':        { slot: 'weapon', dice: '1d6', range: 20, damageType: 'slashing' },
  'battleaxe':      { slot: 'weapon', dice: '1d8', range: 5,  damageType: 'slashing' },
  'warhammer':      { slot: 'weapon', dice: '1d8', range: 5,  damageType: 'bludgeoning' },
  'mace':           { slot: 'weapon', dice: '1d6', range: 5,  damageType: 'bludgeoning' },
  'quarterstaff':   { slot: 'weapon', dice: '1d6', range: 5,  damageType: 'bludgeoning' },
  'spear':          { slot: 'weapon', dice: '1d6', range: 20, damageType: 'piercing' },
  'rapier':         { slot: 'weapon', dice: '1d8', range: 5,  damageType: 'piercing' },
  'shortbow':       { slot: 'weapon', dice: '1d6', range: 80, damageType: 'piercing' },
  'longbow':        { slot: 'weapon', dice: '1d8', range: 150, damageType: 'piercing' },
  'light crossbow': { slot: 'weapon', dice: '1d8', range: 80, damageType: 'piercing' },
  'crossbow':       { slot: 'weapon', dice: '1d8', range: 80, damageType: 'piercing' }
};

function itemPresetFor(name) {
  return ITEM_PRESETS[String(name || '').trim().toLowerCase()] || null;
}

// Effective AC = base AC + everything equipped (armor, shield, magic items)
function effectiveAC(pc) {
  var ac = pc.ac || 10;
  (pc.inventory || []).forEach(function(it) {
    if (it.equipped && it.acBonus) ac += it.acBonus;
  });
  return ac;
}

// An equipped weapon becomes an attack action automatically:
// to-hit = ability mod + proficiency, damage = dice + ability mod
function weaponToAction(pc, item) {
  var strMod = Math.floor(((pc.str || 10) - 10) / 2);
  var dexMod = Math.floor(((pc.dex || 10) - 10) / 2);
  var isRanged = (item.range || 5) > 20;
  var abilityMod = isRanged ? dexMod : Math.max(strMod, dexMod); // melee uses best (finesse-friendly)
  var prof = typeof getProfBonus === 'function' ? getProfBonus(pc.level || 1) : 2;
  return {
    name: item.name,
    kind: 'attack',
    range: item.range || 5,
    bonus: abilityMod + prof,
    dice: (item.dice || '1d6') + (abilityMod !== 0 ? (abilityMod > 0 ? '+' : '') + abilityMod : ''),
    damageType: item.damageType || inferDamageType(item.name),
    fromItem: true
  };
}

// Full action list: manual sheet actions + equipped weapons
function effectiveActions(pc) {
  var acts = (pc.actions || []).slice();
  (pc.inventory || []).forEach(function(it) {
    if (it.equipped && it.slot === 'weapon' && it.dice) {
      // Don't duplicate a manual action with the same name
      if (!acts.some(function(a) { return a.name.toLowerCase() === it.name.toLowerCase(); })) {
        acts.push(weaponToAction(pc, it));
      }
    }
  });
  return acts;
}

// Recompute the linked combatant's AC after equipment changes
function recomputePcAC(pc) {
  var c = combatants.find(function(x) { return x.name === pc.name && x.type === 'ally'; });
  if (c) c.ac = effectiveAC(pc);
}

function processEquipItem(req) {
  var pc = party.find(function(p) { return p.id === req.pcId; });
  if (!pc) return;
  var item = (pc.inventory || []).find(function(i) { return i.id === req.itemId; });
  if (!item) return;
  item.equipped = !!req.equipped;
  if (item.acBonus) recomputePcAC(pc);
  if (typeof savePartyStorage === 'function') savePartyStorage();
  if (typeof renderParty === 'function') renderParty();
  renderCombatants();
  showToast((item.equipped ? '🎒 ' : '📦 ') + pc.name + (item.equipped ? ' equipped ' : ' unequipped ') + item.name, 'info');
}

function processJournal(req) {
  var pc = party.find(function(p) { return p.id === req.pcId; });
  if (!pc) return;
  pc.journal = String(req.text || '').slice(0, 20000);
  if (typeof savePartyStorage === 'function') savePartyStorage();
}

// ============================================================
// SPELLCASTING — slots burn, AoE auto-targets, saves auto-roll
// ============================================================
var CASTING_ABILITY = { Wizard: 'int', Cleric: 'wis', Druid: 'wis', Ranger: 'wis', Bard: 'cha', Sorcerer: 'cha', Warlock: 'cha', Paladin: 'cha' };

function spellSaveDC(pc, spell) {
  if (spell.saveDC) return spell.saveDC;
  var ability = CASTING_ABILITY[pc.cls] || 'int';
  var mod = Math.floor(((pc[ability] || 10) - 10) / 2);
  var prof = typeof getProfBonus === 'function' ? getProfBonus(pc.level || 1) : 2;
  return 8 + prof + mod;
}

function spellAttackBonus(pc) {
  var ability = CASTING_ABILITY[pc.cls] || 'int';
  var mod = Math.floor(((pc[ability] || 10) - 10) / 2);
  var prof = typeof getProfBonus === 'function' ? getProfBonus(pc.level || 1) : 2;
  return prof + mod;
}

function processCastSpell(req) {
  var caster = combatants.find(function(x) { return x.id === req.combatantId; });
  var pc = party.find(function(p) { return p.id === req.pcId; });
  var spell = req.spell || {};
  if (!caster || !pc || !spell.name) return;
  if (!requireTurn(caster)) return;
  var can = combatantCanAct(caster);
  if (!can.ok) { showToast('🚫 ' + caster.name + ' can\'t cast — ' + can.reason, 'warn'); return; }

  // Action economy
  if (combatActive) {
    var tu = ensureTurnUsed(caster);
    var cost = spell.cost === 'bonus' ? 'bonus' : 'action';
    if (tu[cost]) { showToast('🚫 ' + caster.name + ' already used their ' + cost, 'warn'); return; }
    tu[cost] = true;
  }

  // Burn the slot (cantrips are free)
  var slotLevel = parseInt(req.slotLevel) || spell.level || 0;
  if ((spell.level || 0) > 0) {
    var slot = (pc.spellSlots || [])[slotLevel - 1];
    if (!slot || slot.used >= slot.max) {
      showToast('🚫 ' + pc.name + ' has no level ' + slotLevel + ' slots left', 'warn');
      return;
    }
    slot.used++;
    if (typeof savePartyStorage === 'function') savePartyStorage();
    if (typeof renderParty === 'function') renderParty();
  }

  snapshotBeforeAction();

  // Concentration: casting a new concentration spell drops the old one
  if (spell.concentration) {
    if (caster.concentrating) logCombat('💫 ' + caster.name + ' drops "' + caster.concentrating + '" to cast ' + spell.name, 'info');
    caster.concentrating = spell.name;
  }

  // Resolve targets
  var targets = [];
  if (spell.aoeFt && req.center) {
    var rCells = Math.max(1, Math.round(spell.aoeFt / 5));
    combatants.forEach(function(c) {
      if (c.hp <= 0 && c.type === 'enemy') return;
      var pos = (typeof mapState !== 'undefined' && mapState.tokens) ? mapState.tokens[c.id] : null;
      if (pos && dmDistFt(pos, req.center) <= spell.aoeFt) targets.push(c);
    });
    // Drop a visible AoE ring on the map for the table
    if (typeof mapState !== 'undefined') {
      mapState.props.push({ id: Date.now(), kind: 'aoe', x: req.center.x, y: req.center.y, r: rCells, color: '255,120,30' });
      if (typeof renderMap === 'function') renderMap();
    }
  } else if (req.targetId) {
    var t = combatants.find(function(x) { return x.id === req.targetId; });
    if (t) targets.push(t);
  }
  if (!targets.length) { showToast('✨ ' + spell.name + ' hits nothing — no targets in the area', 'info'); }

  // Upcast: +upcastDice per level above base
  var dice = spell.dice || '';
  var extraLevels = Math.max(0, slotLevel - (spell.level || 0));

  var feed = {
    id: Date.now(), kind: 'spell', attacker: caster.name, caster: caster.name,
    spellName: spell.name, actionName: spell.name, slotLevel: slotLevel,
    aoeFt: spell.aoeFt || 0, damageType: spell.damageType || '',
    targets: [], notes: [], ts: new Date().toISOString()
  };

  var dc = spell.kind === 'save' ? spellSaveDC(pc, spell) : null;

  targets.forEach(function(t) {
    var entry = { name: t.name, type: t.type };
    var baseDamage = req.damageRoll ? Math.max(0, parseInt(req.damageRoll) || 0) : rollDiceExpr(dice).total;
    if (extraLevels > 0 && spell.upcastDice && !req.damageRoll) {
      for (var u = 0; u < extraLevels; u++) baseDamage += rollDiceExpr(spell.upcastDice).total;
    }

    if (spell.kind === 'heal') {
      var prev = t.hp;
      t.hp = Math.min(t.maxHp, t.hp + baseDamage);
      entry.healed = t.hp - prev;
      if (prev === 0 && t.hp > 0) {
        t.conditions = (t.conditions || []).filter(function(x) { return x !== 'Unconscious'; });
        feed.notes.push(t.name + ' regains consciousness!');
      }
      logCombat('✨ ' + caster.name + ' — ' + spell.name + ' heals ' + t.name + ' for ' + entry.healed, 'heal');
    } else if (spell.kind === 'attack') {
      var roll = req.roll ? Math.max(1, Math.min(20, parseInt(req.roll))) : rollD20WithAdvState(0);
      var bonus = spell.bonus !== undefined ? spell.bonus : spellAttackBonus(pc);
      var total = roll + bonus;
      var hit = roll === 20 ? true : roll === 1 ? false : total >= (t.ac || 10);
      entry.roll = roll; entry.bonus = bonus; entry.total = total; entry.ac = t.ac || 10; entry.hit = hit;
      if (hit) {
        var amt = roll === 20 ? baseDamage + rollDiceExpr(dice.replace(/[+-]\s*\d+$/, '')).total : baseDamage;
        var def = applyDamageWithDefenses(t, amt, spell.damageType);
        t.hp = Math.max(0, t.hp - def.taken);
        entry.taken = def.taken;
        entry.defNotes = def.notes;
        if (def.taken > 0 && typeof checkConcentration === 'function') checkConcentration(t, def.taken);
        logCombat('✨ ' + caster.name + ' — ' + spell.name + ' hits ' + t.name + ' (' + total + ' vs AC ' + entry.ac + ') for ' + def.taken + (def.notes.length ? ' · ' + def.notes.join(' · ') : ''), 'damage');
      } else {
        logCombat('✨ ' + caster.name + ' — ' + spell.name + ' misses ' + t.name + ' (' + total + ' vs AC ' + entry.ac + ')', 'info');
      }
    } else {
      // Save-based (Fireball et al): target saves, half on success
      var sb = saveBonusFor(t, spell.saveAbility || 'dex');
      var sRoll = Math.floor(Math.random() * 20) + 1;
      var sTotal = sRoll + sb;
      var saved = sTotal >= dc;
      entry.save = { ability: (spell.saveAbility || 'dex').toUpperCase(), dc: dc, roll: sRoll, bonus: sb, total: sTotal, saved: saved };
      var amt2 = saved && spell.halfOnSave !== false ? Math.floor(baseDamage / 2) : (saved ? 0 : baseDamage);
      var def2 = applyDamageWithDefenses(t, amt2, spell.damageType);
      t.hp = Math.max(0, t.hp - def2.taken);
      entry.taken = def2.taken;
      entry.defNotes = def2.notes;
      if (def2.taken > 0 && typeof checkConcentration === 'function') checkConcentration(t, def2.taken);
      logCombat('✨ ' + spell.name + ' → ' + t.name + ': ' + entry.save.ability + ' save ' + sTotal + ' vs DC ' + dc + ' — ' + (saved ? 'SAVED, ' : 'FAILED, ') + def2.taken + ' dmg' + (def2.notes.length ? ' · ' + def2.notes.join(' · ') : ''), saved ? 'info' : 'damage');
    }
    feed.targets.push(entry);
  });

  window.lastActionResult = feed;
  showToast('✨ ' + caster.name + ' casts ' + spell.name + (slotLevel > (spell.level||0) ? ' (level ' + slotLevel + ')' : '') + ' — ' + targets.length + ' target' + (targets.length !== 1 ? 's' : ''), 'success');
  renderCombatants();
  if (window.cloudSave) window.cloudSave();
}
