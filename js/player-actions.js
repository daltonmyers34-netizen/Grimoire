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
  'Dodging':      { attackersDis: true },
  'Hastened':     { extraAction: 1, acMod: 2, speedFactor: 2 },
  'Slowed':       { acMod: -2, halfSpeed: true },
  'Shielded':     { acMod: 5 }, // Shield spell — until the start of their next turn
  'Blessed':      { attackMod: 2, saveMod: 2 },   // Bless (≈ +1d4)
  'Baned':        { attackMod: -2, saveMod: -2 }, // Bane (≈ -1d4)
  'Bardic Die':   {},                             // spend it at the table, DM removes
  'Half Cover':   { acMod: 2, dexSaveMod: 2 },
  '3/4 Cover':    { acMod: 5, dexSaveMod: 5 },
  'Disengaged':   {}
};

// Toggleable class features → the stance condition they apply + action cost
var FEATURE_TOGGLES = {
  'Rage':            { condition: 'Raging',   cost: 'bonus'  },
  'Reckless Attack': { condition: 'Reckless', cost: 'free'   },
  'Dodge':           { condition: 'Dodging',  cost: 'action' },
  'Action Surge':    { instant: 'extraAction', cost: 'free'  }, // fighter: one more action, once per rest
  'Second Wind':     { instant: 'secondWind',  cost: 'bonus' }, // fighter: self-heal 1d10+level, once per rest
  'Disengage':       { condition: 'Disengaged', cost: 'action' } // no opportunity attacks until your next turn
};

// ─── Action economy ──────────────────────────────────────────
function ensureTurnUsed(c) {
  if (!c.turnUsed) c.turnUsed = { actions: 0, bonus: false, movedFt: 0 };
  // migrate the old boolean shape
  if (c.turnUsed.actions === undefined) c.turnUsed.actions = c.turnUsed.action ? 1 : 0;
  return c.turnUsed;
}

// Attacks per Attack action: Extra Attack feature (PCs) or the
// multiattack count set in the monster action editor
function attacksPerActionFor(c) {
  var pc = (typeof party !== 'undefined' ? party : []).find(function(p) { return p.name === c.name; });
  if (pc && (pc.features || []).indexOf('Extra Attack') >= 0) return 2;
  if (c.multiattack > 1) return c.multiattack;
  return 1;
}

// How many Actions this creature gets this turn (Haste, Action Surge...)
function maxActionsFor(c) {
  var max = 1 + (c._surgeExtra || 0);
  (c.conditions || []).forEach(function(cn) {
    var eff = CONDITION_EFFECTS[cn];
    if (eff && eff.extraAction) max += eff.extraAction;
  });
  return max;
}

function actionAvailable(c, cost) {
  var tu = ensureTurnUsed(c);
  if (cost === 'bonus') return !tu.bonus;
  return tu.actions < maxActionsFor(c);
}

function spendActionFor(c, cost) {
  var tu = ensureTurnUsed(c);
  if (cost === 'bonus') tu.bonus = true;
  else tu.actions++;
}

// Effective AC including condition modifiers (Haste +2, Slow -2)
function conditionACMod(c) {
  var m = 0;
  (c.conditions || []).forEach(function(cn) {
    var eff = CONDITION_EFFECTS[cn];
    if (eff && eff.acMod) m += eff.acMod;
  });
  return m;
}

// Called when a combatant's turn STARTS: fresh economy, stances that
// last "until the start of your next turn" fall off.
function startTurnFor(c) {
  if (!c) return;
  c.turnUsed = { actions: 0, bonus: false, movedFt: 0 };
  c._surgeExtra = 0;
  c.reactionUsed = false;
  if (c.legendary) c.legendary.used = 0; // legendary pool refreshes on its own turn
  // Summons/minions share their owner's turn — fresh economy for them too
  combatants.forEach(function(u) {
    if (u.owner && u.owner === c.name) { u.turnUsed = { actions: 0, bonus: false, movedFt: 0 }; u.reactionUsed = false; }
  });
  var expiring = ['Reckless', 'Dodging', 'Disengaged', 'Shielded'];
  if (c.conditions && c.conditions.some(function(x) { return expiring.indexOf(x) >= 0; })) {
    c.conditions = c.conditions.filter(function(x) { return expiring.indexOf(x) < 0; });
  }
}

// Called when a combatant's turn ENDS: repeat saves + durations (all auto)
function endTurnProcessing(c) {
  if (!c || !c.conditions || !c.conditions.length) return;
  var meta = c.condMeta || {};
  var saveEntries = [];
  c.conditions.slice().forEach(function(cond) {
    var m = meta[cond];
    if (!m) return;
    if (m.saveAbility && m.saveDC) {
      var bonus = saveBonusFor(c, m.saveAbility);
      saveEntries.push({ id: cond, label: c.name + ' — ' + m.saveAbility.toUpperCase() + ' save vs ' + cond, sub: 'DC ' + m.saveDC + ' · bonus ' + (bonus >= 0 ? '+' : '') + bonus, adv: 0, _dc: m.saveDC, _bonus: bonus });
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
  if (saveEntries.length) {
    requestRolls('⏳ End of ' + c.name + '\'s turn — condition saves', saveEntries, function(results) {
      saveEntries.forEach(function(en) {
        var total = (results[en.id] || 10) + en._bonus;
        if (total >= en._dc) {
          c.conditions = (c.conditions || []).filter(function(x) { return x !== en.id; });
          delete (c.condMeta || {})[en.id];
          logCombat('✓ ' + c.name + ' shook off ' + en.id + ' (' + total + ' vs DC ' + en._dc + ')', 'heal');
          showToast('✓ ' + c.name + ' is no longer ' + en.id, 'success');
        } else {
          logCombat('✗ ' + c.name + ' still ' + en.id + ' (' + total + ' vs DC ' + en._dc + ')', 'info');
        }
      });
      renderCombatants();
      if (window.cloudSave) window.cloudSave();
    });
  }
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
    if (eff.speedFactor) speed = speed * eff.speedFactor;
    if (eff.halfSpeed) speed = Math.floor(speed / 2);
  }
  return speed;
}

// Net advantage state for an attack: +1 adv, -1 dis, 0 normal (adv+dis cancel per RAW)
function computeAttackContext(attacker, target, action) {
  var isMelee = (parseInt(action.range) || 5) <= 5;
  var adv = false, dis = false, autoCrit = false;
  var notes = [];
  // Firing a bow with a sword in your face: disadvantage
  if (!isMelee && typeof mapState !== 'undefined' && mapState.tokens) {
    var aPos = mapState.tokens[attacker.id];
    if (aPos) {
      var crowded = combatants.some(function(en) {
        if (en.id === attacker.id || en.hp <= 0 || en.type === attacker.type) return false;
        var ep = mapState.tokens[en.id];
        return ep && dmDistFt(aPos, ep) <= 5;
      });
      if (crowded) { dis = true; notes.push('enemy within melee reach — ranged attack (disadvantage)'); }
    }
  }
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

// Class saving-throw proficiencies (PHB) — every plus that should apply, applies
var SAVE_PROFICIENCIES = {
  Barbarian: ['str','con'], Bard: ['dex','cha'], Cleric: ['wis','cha'], Druid: ['int','wis'],
  Fighter: ['str','con'], Monk: ['str','dex'], Paladin: ['wis','cha'], Ranger: ['str','dex'],
  Rogue: ['dex','int'], Sorcerer: ['con','cha'], Warlock: ['wis','cha'], Wizard: ['int','wis']
};

// Ability mod for saves: PCs use their sheet + save proficiency; monsters estimate +1
function saveBonusFor(combatant, ability) {
  var bonus = 1;
  var pc = (typeof party !== 'undefined' ? party : []).find(function(p) { return p.name === combatant.name; });
  if (pc && pc[ability]) {
    var score = typeof effectiveAbility === 'function' ? effectiveAbility(pc, ability) : pc[ability];
    bonus = Math.floor((score - 10) / 2);
    var profs = SAVE_PROFICIENCIES[pc.cls] || [];
    if (profs.indexOf(ability) >= 0) {
      bonus += typeof getProfBonus === 'function' ? getProfBonus(pc.level || 1) : 2;
    }
  }
  (combatant.conditions || []).forEach(function(cn) {
    var eff = CONDITION_EFFECTS[cn];
    if (!eff) return;
    if (ability === 'dex' && eff.dexSaveMod) bonus += eff.dexSaveMod;
    if (eff.saveMod) bonus += eff.saveMod;
  });
  return bonus;
}

// Attack roll modifier from conditions (Bless +2, Bane -2)
function conditionAttackMod(c) {
  var m = 0;
  (c.conditions || []).forEach(function(cn) {
    var eff = CONDITION_EFFECTS[cn];
    if (eff && eff.attackMod) m += eff.attackMod;
  });
  return m;
}

// A player's request got refused — tell THEIR screen, not just the DM's
function rejectPlayer(c, msg) {
  window.lastRejection = { id: Date.now(), combatantId: (c && c.id) || c, msg: msg, ts: new Date().toISOString() };
  if (window.cloudSaveNow) window.cloudSaveNow();
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
      partySlots: party.map(function(p) { return { id: p.id, slots: JSON.parse(JSON.stringify(p.spellSlots || [])) }; }),
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
  if (lastActionSnapshot.partySlots) {
    lastActionSnapshot.partySlots.forEach(function(ps) {
      var pc = party.find(function(p) { return p.id === ps.id; });
      if (pc) pc.spellSlots = ps.slots;
    });
    if (typeof savePartyStorage === 'function') savePartyStorage();
    if (typeof renderParty === 'function') renderParty();
  }
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
    if (opts.source === 'player') rejectPlayer(attacker, "You can't act — you're " + can.reason);
    return null;
  }
  if (window.pendingReaction && window.pendingReaction.targetId !== attacker.id) clearPendingReaction();
  if (window.pendingSmite && window.pendingSmite.attackerId !== attacker.id) window.pendingSmite = null;

  // Action economy: attacks/heals cost your Action (or Bonus if flagged).
  // Extra Attack / multiattack: N weapon swings per Action.
  var cost = a.cost === 'bonus' ? 'bonus' : 'action';
  var multiNote = '';
  if (combatActive && a.cost !== 'legendary' && a.cost !== 'reaction') {
    var per = (a.kind !== 'heal' && cost === 'action') ? attacksPerActionFor(attacker) : 1;
    var tuE = ensureTurnUsed(attacker);
    var midSwing = per > 1 && (tuE.attacksMade || 0) > 0;
    if (!midSwing && !actionAvailable(attacker, cost) && opts.source === 'player') {
      showToast('🚫 ' + attacker.name + ' already used their ' + cost + ' this turn', 'warn');
      rejectPlayer(attacker, 'Already used your ' + cost + ' this turn');
      return null;
    }
    if (per > 1) {
      tuE.attacksMade = (tuE.attacksMade || 0) + 1;
      multiNote = '⚔ attack ' + tuE.attacksMade + ' of ' + per;
      if (tuE.attacksMade >= per) { spendActionFor(attacker, cost); tuE.attacksMade = 0; }
    } else {
      spendActionFor(attacker, cost); // spent whether it hits or not — DM act-as is never blocked
    }
  }
  if (a.cost === 'legendary' && attacker.legendary) {
    if (attacker.legendary.used >= attacker.legendary.max) {
      showToast('🚫 ' + attacker.name + ' has no legendary actions left this round', 'warn');
      return null;
    }
    attacker.legendary.used++;
  }

  snapshotBeforeAction();

  var result = {
    id: Date.now(),
    kind: a.kind === 'heal' ? 'heal' : 'attack',
    attacker: attacker.name,
    target: target.name,
    actionName: a.name,
    notes: multiNote ? [multiNote] : [],
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
    var condMod = conditionAttackMod(attacker);
    if (condMod) { bonus += condMod; result.notes.push((condMod > 0 ? '+' : '') + condMod + ' ' + ((attacker.conditions || []).indexOf('Blessed') >= 0 ? 'blessed' : 'baned')); }
    var total = roll + bonus;
    var effAC = (target.ac || 10) + conditionACMod(target);
    var crit = roll === 20 || (ctx.autoCrit && total >= effAC);
    var hit = roll === 20 ? true : roll === 1 ? false : total >= effAC;
    result.roll = roll; result.bonus = bonus; result.total = total;
    result.targetAC = effAC; result.hit = hit; result.crit = hit && crit;
    learnFromAttack(target);
    if (attacker.type === 'ally') consumeAmmoFor(attacker, a);

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
      // Sneak Attack: rogues with advantage, automatically, once per turn
      var sneakPc = party.find(function(p) { return p.name === attacker.name && (p.features || []).indexOf('Sneak Attack') >= 0; });
      if (sneakPc && ctx.net > 0 && !ensureTurnUsed(attacker).sneakUsed) {
        var sneakDice = Math.ceil((sneakPc.level || 1) / 2);
        var sneak = rollDiceExpr(sneakDice + 'd6');
        amount += sneak.total;
        ensureTurnUsed(attacker).sneakUsed = true;
        result.notes.push('🗡 +' + sneak.total + ' SNEAK ATTACK (' + sneakDice + 'd6)');
      }
      var dmgType = a.damageType || inferDamageType(a.name);
      var def = applyDamageWithDefenses(target, amount, dmgType);
      result.rawAmount = amount;
      result.amount = def.taken;
      learnDefense(target, dmgType, def.notes);
      result.damageType = dmgType || '';
      result.notes = result.notes.concat(def.notes);
      var prevHp = target.hp;
      target.hp = Math.max(0, target.hp - def.taken);
      if (typeof checkConcentration === 'function' && def.taken > 0) checkConcentration(target, def.taken);
      if (target.hp === 0 && prevHp > 0) result.notes.push(target.name + ' drops to 0 HP!');

      // Condition rider: on-hit save-or-suffer
      if (a.applyCondition && CONDITION_EFFECTS[a.applyCondition] !== undefined) {
        if (a.saveAbility && a.saveDC) {
          // Save entered at the table (or auto) via the DM roll modal
          result.notes.push(target.name + ' must make a DC ' + a.saveDC + ' ' + a.saveAbility.toUpperCase() + ' save or be ' + a.applyCondition);
          (function(tgt, act) {
            var sb = saveBonusFor(tgt, act.saveAbility);
            requestRolls('⚡ ' + act.name + ' — ' + tgt.name + ' saves vs ' + act.applyCondition,
              [{ id: 'r', label: tgt.name + ' — ' + act.saveAbility.toUpperCase() + ' save', sub: 'DC ' + act.saveDC + ' · their bonus ' + (sb >= 0 ? '+' : '') + sb, adv: 0 }],
              function(results) {
                var total = (results.r || 10) + sb;
                if (total >= act.saveDC) {
                  logCombat('✓ ' + tgt.name + ' saves vs ' + act.applyCondition + ' (' + total + ' vs DC ' + act.saveDC + ')', 'info');
                  showToast('✓ ' + tgt.name + ' resists ' + act.applyCondition, 'info');
                } else {
                  tgt.conditions = tgt.conditions || [];
                  if (tgt.conditions.indexOf(act.applyCondition) < 0) tgt.conditions.push(act.applyCondition);
                  tgt.condMeta = tgt.condMeta || {};
                  tgt.condMeta[act.applyCondition] = { saveAbility: act.saveAbility, saveDC: act.saveDC };
                  logCombat('⚡ ' + tgt.name + ' FAILS (' + total + ' vs DC ' + act.saveDC + ') — now ' + act.applyCondition + ' (repeats save at end of turn)', 'damage');
                  showToast('⚡ ' + tgt.name + ' is ' + act.applyCondition + '!', 'danger');
                }
                renderCombatants();
                if (window.cloudSave) window.cloudSave();
              });
          })(target, a);
        } else {
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
  if (result.kind === 'attack' && target.type === 'ally') offerReaction(target, result, attacker);
  // Divine Smite: a paladin just connected in melee — offer to burn a slot
  if (result.kind === 'attack' && result.hit && ctx.isMelee && opts.source === 'player') {
    var smitePc = party.find(function(p) { return p.name === attacker.name && (p.features || []).indexOf('Divine Smite') >= 0; });
    if (smitePc && (smitePc.spellSlots || []).some(function(sl) { return sl.max > 0 && sl.used < sl.max; })) {
      window.pendingSmite = { id: Date.now(), attackerId: attacker.id, attackerName: attacker.name, targetId: target.id, targetName: target.name,
        slots: (smitePc.spellSlots || []).map(function(sl, i) { return { level: i + 1, free: sl.max - sl.used, max: sl.max }; }).filter(function(o) { return o.max > 0; }),
        crit: !!result.crit, ts: new Date().toISOString() };
    }
  } else if (window.pendingSmite && opts.source === 'player') {
    window.pendingSmite = null;
  }
  renderCombatants();
  if (typeof renderMap === 'function') renderMap();
  if (window.cloudSave) window.cloudSave();
  return result;
}

// ============================================================
// REACTIONS — Shield & Hellish Rebuke pop on the victim's phone.
// The offer dies when the next creature acts (too slow = too late).
// ============================================================
var REACTION_SPELLS = { 'Shield': 'hit', 'Hellish Rebuke': 'damaged' };

function clearPendingReaction() { window.pendingReaction = null; }

function offerReaction(target, result, attacker) {
  if (!combatActive || target.reactionUsed) return;
  var pc = party.find(function(p) { return p.name === target.name; });
  if (!pc) return;
  var offers = [];
  (pc.spells || []).forEach(function(s) {
    var trig = REACTION_SPELLS[s.name];
    if (!trig) return;
    var lvl = Math.max(1, s.level || 1);
    var slotOk = (pc.spellSlots || []).some(function(sl, i) { return i + 1 >= lvl && sl.max > 0 && sl.used < sl.max; });
    if (!slotOk) return;
    if (s.name === 'Shield' && result.hit && result.roll !== 20 && result.total < result.targetAC + 5) {
      offers.push({ spell: 'Shield', desc: '+5 AC — turns that ' + result.total + ' into a MISS (' + result.amount + ' damage undone) and shields you this round' });
    }
    if (s.name === 'Hellish Rebuke' && result.hit && result.amount > 0) {
      offers.push({ spell: 'Hellish Rebuke', desc: 'hellfire engulfs ' + attacker.name + ' — DEX save or 2d10 fire' });
    }
  });
  // Uncanny Dodge (rogue feature): halve the damage — no slot needed
  if ((pc.features || []).indexOf('Uncanny Dodge') >= 0 && result.hit && result.amount > 1) {
    offers.push({ spell: 'Uncanny Dodge', desc: 'roll with the blow — take ' + Math.floor(result.amount / 2) + ' instead of ' + result.amount });
  }
  if (!offers.length) return;
  window.pendingReaction = {
    id: Date.now(), targetId: target.id, targetName: target.name,
    attackerId: attacker.id, attackerName: attacker.name,
    amount: result.amount || 0, offers: offers, ts: new Date().toISOString()
  };
}

function burnLowestSlot(pc, minLevel) {
  var slots = pc.spellSlots || [];
  for (var i = Math.max(1, minLevel) - 1; i < slots.length; i++) {
    if (slots[i].max > 0 && slots[i].used < slots[i].max) { slots[i].used++; return i + 1; }
  }
  return 0;
}

function processPlayerReaction(req) {
  var pending = window.pendingReaction;
  if (!pending || pending.id !== req.reactionId || pending.targetId !== req.combatantId) {
    if (req.accept) showToast('⏳ Too late — the moment passed', 'info');
    clearPendingReaction();
    if (window.cloudSave) window.cloudSave();
    return;
  }
  clearPendingReaction();
  if (!req.accept) { if (window.cloudSave) window.cloudSave(); return; }
  var target = combatants.find(function(x) { return x.id === pending.targetId; });
  var attacker = combatants.find(function(x) { return x.id === pending.attackerId; });
  var pc = party.find(function(p) { return target && p.name === target.name; });
  if (!target || !pc || target.reactionUsed) return;
  target.reactionUsed = true;
  snapshotBeforeAction();

  if (req.spell === 'Shield') {
    burnLowestSlot(pc, 1);
    target.hp = Math.min(target.maxHp, target.hp + pending.amount);
    if (target.hp > 0) target.conditions = (target.conditions || []).filter(function(x) { return x !== 'Unconscious'; });
    target.conditions = target.conditions || [];
    if (target.conditions.indexOf('Shielded') < 0) target.conditions.push('Shielded');
    logCombat('🛡✨ ' + target.name + ' casts SHIELD — the blow glances off! ' + pending.amount + ' damage undone, +5 AC until their next turn', 'heal');
    showToast('🛡✨ ' + target.name + ' — SHIELD!', 'success');
    window.lastActionResult = { id: Date.now(), kind: 'spell', caster: target.name, spellName: 'Shield', slotLevel: 1,
      targets: [], notes: ['⚡ Reaction! The blow glances off — ' + pending.amount + ' damage undone', '+5 AC until their next turn'], ts: new Date().toISOString() };
  } else if (req.spell === 'Uncanny Dodge') {
    var back = pending.amount - Math.floor(pending.amount / 2);
    target.hp = Math.min(target.maxHp, target.hp + back);
    if (target.hp > 0) target.conditions = (target.conditions || []).filter(function(x) { return x !== 'Unconscious'; });
    logCombat('🌀 ' + target.name + ' UNCANNY DODGE — rolls with the blow, ' + back + ' damage shrugged off', 'heal');
    showToast('🌀 ' + target.name + ' — Uncanny Dodge!', 'success');
    window.lastActionResult = { id: Date.now(), kind: 'spell', caster: target.name, spellName: 'Uncanny Dodge', slotLevel: 0,
      targets: [], notes: ['⚡ Reaction! Damage halved — ' + back + ' shrugged off'], ts: new Date().toISOString() };
  } else if (req.spell === 'Hellish Rebuke') {
    burnLowestSlot(pc, 1);
    var dc = spellSaveDC(pc, { level: 1 });
    var sb = saveBonusFor(attacker, 'dex');
    logCombat('🔥 ' + target.name + ' casts HELLISH REBUKE at ' + attacker.name + '!', 'damage');
    requestRolls('🔥 Hellish Rebuke — ' + attacker.name + ' saves', [{ id: 'r', label: attacker.name + ' — DEX save', sub: 'DC ' + dc + ' · bonus ' + (sb >= 0 ? '+' : '') + sb, adv: 0 }], function(results) {
      var total = (results.r || 10) + sb;
      var saved = total >= dc;
      var dmg = rollDiceExpr('2d10').total;
      var amt = saved ? Math.floor(dmg / 2) : dmg;
      var def = applyDamageWithDefenses(attacker, amt, 'fire');
      attacker.hp = Math.max(0, attacker.hp - def.taken);
      logCombat('🔥 Hellish Rebuke: ' + attacker.name + ' ' + (saved ? 'saves (' + total + '), ' : 'FAILS (' + total + '), ') + def.taken + ' fire' + (def.notes.length ? ' · ' + def.notes.join(', ') : ''), 'damage');
      window.lastActionResult = { id: Date.now(), kind: 'spell', caster: target.name, spellName: 'Hellish Rebuke', slotLevel: 1,
        targets: [{ name: attacker.name, type: attacker.type, save: { ability: 'DEX', dc: dc, roll: results.r || 10, bonus: sb, total: total, saved: saved }, taken: def.taken, defNotes: def.notes }],
        notes: ['⚡ Reaction!'], ts: new Date().toISOString() };
      renderCombatants();
      if (window.cloudSave) window.cloudSave();
    });
  }
  renderCombatants();
  if (window.cloudSave) window.cloudSave();
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
    else if (req.type === 'useItem') processUseItem(req);
    else if (req.type === 'reaction') processPlayerReaction(req);
    else if (req.type === 'smite') processPlayerSmite(req);
    else if (req.type === 'inspire') processPlayerInspire(req);
    else if (req.type === 'standUp') processPlayerStandUp(req);
  } catch(e) {
    console.error('processPlayerAction', e);
  }
}

function requireTurn(c) {
  if (!combatActive || !combatants[currentTurn]) return true;
  var cur = combatants[currentTurn];
  if (cur.id === c.id) return true;
  if (c.owner && cur.name === c.owner) return true; // summons share their owner's turn
  showToast('🚫 ' + c.name + ' tried to act out of turn', 'warn');
  rejectPlayer(c, "Not your turn yet!");
  return false;
}

function processPlayerMove(req) {
  var c = combatants.find(function(x) { return x.id === req.combatantId; });
  if (!c || c.type !== 'ally') return;
  if (!requireTurn(c)) return;
  var can = combatantCanAct(c);
  var speed = combatantSpeedFt(c, req.baseSpeed || 30);
  if (speed === 0 || (!can.ok && can.reason !== 'at 0 HP')) {
    showToast('🚫 ' + c.name + ' can\'t move (' + ((c.conditions || []).join(', ') || can.reason) + ')', 'warn');
    rejectPlayer(c, "You can't move — " + ((c.conditions || []).join(', ') || can.reason));
    return;
  }
  if (typeof mapState === 'undefined') return;
  var x = Math.max(0, Math.min(mapState.cols - 1, parseInt(req.x) || 0));
  var y = Math.max(0, Math.min(mapState.rows - 1, parseInt(req.y) || 0));
  // No two creatures in the same square
  var occupied = combatants.some(function(o) {
    if (o.id === c.id || o.hp <= 0) return false;
    var op = mapState.tokens[o.id];
    return op && op.x === x && op.y === y;
  });
  if (occupied) {
    showToast('🚫 That square is occupied', 'warn');
    rejectPlayer(c, 'That square is occupied');
    return;
  }
  // Movement budget: distance walked accumulates across the whole turn
  var from = mapState.tokens[c.id];
  var dist = from ? dmDistFt(from, { x: x, y: y }) : 0;
  if (combatActive) {
    var tu = ensureTurnUsed(c);
    if (tu.movedFt + dist > speed) {
      showToast('🚫 ' + c.name + ' only has ' + Math.max(0, speed - tu.movedFt) + ' ft of movement left', 'warn');
      rejectPlayer(c, 'Only ' + Math.max(0, speed - tu.movedFt) + ' ft of movement left');
      return;
    }
    tu.movedFt += dist;
  }
  snapshotBeforeAction();
  mapState.tokens[c.id] = { x: x, y: y };
  if (from) checkOpportunityAttacks(c, from, { x: x, y: y });
  carveFogAroundParty();
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
  if (!actions.length) { dmEditActions(combatantId); return; }

  var existing = document.getElementById('dm-act-modal');
  if (existing) existing.remove();
  var ov = document.createElement('div');
  ov.id = 'dm-act-modal';
  ov.className = 'modal-overlay show';
  ov.style.zIndex = '2600';
  var legInfo = c.legendary ? ' · ⭐ ' + (c.legendary.max - (c.legendary.used || 0)) + '/' + c.legendary.max + ' legendary left' : '';
  var tuA = c.turnUsed || {};
  var econInfo = combatActive ? '⏱ ' + Math.max(0, maxActionsFor(c) - (tuA.actions || 0)) + '/' + maxActionsFor(c) + ' actions · bonus ' + (tuA.bonus ? 'spent' : 'free') : '';
  var inner = '<div class="modal" style="max-width:420px;width:95%;">' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">' +
      '<h3 style="font-family:Cinzel,serif;color:var(--gold);margin:0;flex:1;">⚔ ' + c.name + ' acts</h3>' +
      '<button class="btn btn-ghost btn-sm" onclick="document.getElementById(\'dm-act-modal\').remove();dmEditActions(' + combatantId + ')">✎ Edit</button>' +
    '</div>' +
    '<div style="font-size:12px;color:var(--text-dim);margin-bottom:6px;">Pick an action, then a target. You enter the rolls (or auto)' + legInfo + '.</div>' +
    (econInfo ? '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:11px;color:var(--text-dim);">' + econInfo +
      '<button class="btn btn-ghost btn-sm" onclick="dmGrantAction(' + combatantId + ')" title="House-rule an extra action for this turn">+1 action</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="dmResetEconomy(' + combatantId + ')" title="Fresh action/bonus/movement — as if their turn just started">↺ Refresh turn</button>' +
    '</div>' : '');
  actions.forEach(function(a, i) {
    inner += '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--border);border-radius:6px;margin-bottom:6px;background:rgba(0,0,0,0.25);">' +
      '<span>' + (a.kind === 'heal' ? '❤' : '⚔') + '</span>' +
      '<div style="flex:1;">' +
        '<div style="font-size:14px;color:var(--parchment);">' + a.name + '</div>' +
        '<div style="font-size:11px;color:var(--text-dim);">' + (a.cost === 'legendary' ? '⭐ legendary · ' : a.cost === 'bonus' ? 'bonus · ' : '') + (a.range || 5) + ' ft · ' + (a.dice || '') + (a.kind !== 'heal' ? ' · +' + (a.bonus || 0) + (a.damageType ? ' · ' + a.damageType : '') : '') + '</div>' +
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
  var aPos = (typeof mapState !== 'undefined' && mapState.tokens) ? mapState.tokens[attackerId] : null;
  targets.forEach(function(t) {
    var tPos = (typeof mapState !== 'undefined' && mapState.tokens) ? mapState.tokens[t.id] : null;
    var distLbl = '';
    if (aPos && tPos) {
      var ft = dmDistFt(aPos, tPos);
      var far = ft > (a.range || 5);
      distLbl = ' · <span style="color:' + (far ? '#e05050' : '#8fd050') + ';">' + ft + ' ft' + (far ? ' ⚠ out of range' : '') + '</span>';
    }
    inner += '<button style="display:flex;width:100%;align-items:center;gap:8px;padding:9px 12px;border:1px solid var(--border);border-radius:6px;margin-bottom:6px;background:rgba(0,0,0,0.25);color:var(--parchment);cursor:pointer;font-size:14px;" ' +
      'onclick="dmExecuteAction(' + attackerId + ',' + t.id + ',' + actionIdx + ')">' +
      '<span style="color:' + (t.type === 'ally' ? '#90c8ff' : '#ff9090') + ';">' + t.name + '</span>' +
      '<span style="margin-left:auto;font-size:12px;color:var(--text-dim);">' + t.hp + '/' + t.maxHp + ' HP · AC ' + t.ac + distLbl + '</span>' +
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
  if (a.kind === 'heal') {
    resolveCombatAction(attackerId, targetId, a, { roll: null, source: 'dm' });
    return;
  }
  var attacker = combatants.find(function(x) { return x.id === attackerId; });
  var target = combatants.find(function(x) { return x.id === targetId; });
  var ctx = (attacker && target) ? computeAttackContext(attacker, target, a) : { net: 0, notes: [] };
  requestRolls('⚔ ' + (attacker ? attacker.name : '?') + ' — ' + a.name + ' vs ' + (target ? target.name : '?'),
    [{ id: 'r', label: 'Attack roll', sub: '+' + (a.bonus || 0) + ' to hit' + (ctx.notes.length ? ' · ' + ctx.notes.join(', ') : ''), adv: ctx.net }],
    function(results) {
      resolveCombatAction(attackerId, targetId, a, { roll: results.r, source: 'dm' });
    });
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
  if (ft.instant === 'secondWind') {
    if (!requireTurn(c)) return;
    if (c.secondWindUsed) { showToast('🚫 ' + c.name + ' already used Second Wind (recharges on a rest)', 'warn'); rejectPlayer(c, 'Second Wind already spent — recharges on a rest'); return; }
    if (combatActive && !actionAvailable(c, 'bonus')) { showToast('🚫 bonus action spent', 'warn'); rejectPlayer(c, 'Already used your bonus action'); return; }
    var swPc = party.find(function(p) { return p.name === c.name; });
    var heal = rollDiceExpr('1d10').total + ((swPc && swPc.level) || 1);
    var prevSW = c.hp;
    c.hp = Math.min(c.maxHp, c.hp + heal);
    c.secondWindUsed = true;
    if (combatActive) spendActionFor(c, 'bonus');
    logCombat('💨 ' + c.name + ' SECOND WIND — heals ' + (c.hp - prevSW) + ' (' + prevSW + '→' + c.hp + ' HP)', 'heal');
    showToast('💨 ' + c.name + ' — Second Wind! +' + (c.hp - prevSW), 'success');
    window.lastActionResult = { id: Date.now(), kind: 'heal', attacker: c.name, target: c.name, actionName: 'Second Wind', amount: c.hp - prevSW, hit: true, notes: [], ts: new Date().toISOString() };
    renderCombatants();
    if (window.cloudSave) window.cloudSave();
    return;
  }
  // Instant features (Action Surge): grant now, no stance
  if (ft.instant === 'extraAction') {
    if (!requireTurn(c)) return;
    if (c.actionSurgeUsed) { showToast('🚫 ' + c.name + ' already used Action Surge (recharges on a rest)', 'warn'); rejectPlayer(c, 'Action Surge already spent — recharges on a rest'); return; }
    c.actionSurgeUsed = true;
    c._surgeExtra = (c._surgeExtra || 0) + 1;
    logCombat('⚡⚡ ' + c.name + ' ACTION SURGES — an extra action this turn!', 'round');
    showToast('⚡⚡ ' + c.name + ' — ACTION SURGE!', 'success');
    renderCombatants();
    if (window.cloudSave) window.cloudSave();
    return;
  }
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
      if (!actionAvailable(c, ft.cost)) {
        showToast('🚫 ' + c.name + ' already used their ' + ft.cost + ' this turn', 'warn');
        rejectPlayer(c, 'Already used your ' + ft.cost + ' this turn');
        return;
      }
      spendActionFor(c, ft.cost);
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
  'potion of healing':          { slot: 'potion', healDice: '2d4+2' },
  'potion of greater healing':  { slot: 'potion', healDice: '4d4+4' },
  'potion of superior healing': { slot: 'potion', healDice: '8d4+8' },
  'potion of supreme healing':  { slot: 'potion', healDice: '10d4+20' },
  'healing potion':             { slot: 'potion', healDice: '2d4+2' },
  'arrows':         { slot: 'ammo' },
  'arrow':          { slot: 'ammo' },
  'bolts':          { slot: 'ammo' },
  'crossbow bolts': { slot: 'ammo' },
  'sling bullets':  { slot: 'ammo' },
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
  return (pc.ac || 10) + (typeof equipmentMods === 'function' ? equipmentMods(pc).ac : 0);
}

// An equipped weapon becomes an attack action automatically:
// to-hit = ability mod + proficiency, damage = dice + ability mod
function weaponToAction(pc, item) {
  var strMod = Math.floor((effectiveAbility(pc, 'str') - 10) / 2);
  var dexMod = Math.floor((effectiveAbility(pc, 'dex') - 10) / 2);
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
    if (!it.equipped) return;
    if (it.slot === 'weapon' && it.dice) {
      if (!acts.some(function(a) { return a.name.toLowerCase() === it.name.toLowerCase(); })) {
        acts.push(weaponToAction(pc, it));
      }
    }
    if (it.grantAction && it.grantAction.name) {
      if (!acts.some(function(a) { return a.name.toLowerCase() === it.grantAction.name.toLowerCase(); })) {
        acts.push(Object.assign({ fromItem: true }, it.grantAction));
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

// You only have one body: equipping enforces slot limits
// (1 armor, 1 shield, 1 light source, up to 2 weapons)
function enforceSlotLimits(pc, item) {
  if (!item.equipped) return [];
  var limits = { armor: 1, shield: 1, light: 1, weapon: 2 };
  var limit = limits[item.slot];
  if (!limit) return [];
  var unequipped = [];
  var equippedSame = (pc.inventory || []).filter(function(i) { return i.slot === item.slot && i.equipped; });
  while (equippedSame.length > limit) {
    var other = equippedSame.find(function(i) { return i.id !== item.id; });
    if (!other) break;
    other.equipped = false;
    unequipped.push(other.name);
    equippedSame = equippedSame.filter(function(i) { return i.id !== other.id; });
  }
  return unequipped;
}

function processEquipItem(req) {
  var pc = party.find(function(p) { return p.id === req.pcId; });
  if (!pc) return;
  var item = (pc.inventory || []).find(function(i) { return i.id === req.itemId; });
  if (!item) return;
  item.equipped = !!req.equipped;
  var swapped = enforceSlotLimits(pc, item);
  if (swapped.length) showToast('🎒 ' + pc.name + ' swapped out: ' + swapped.join(', '), 'info');
  if (typeof recomputePcCombat === 'function') recomputePcCombat(pc); else recomputePcAC(pc);
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
  // Safety net: spells saved before the database existed get their blanks filled now
  if (typeof findSpell === 'function') {
    var known = findSpell(spell.name);
    if (known) {
      var merged = Object.assign({}, known);
      Object.keys(spell).forEach(function(k) {
        if (spell[k] !== undefined && spell[k] !== null && spell[k] !== '') merged[k] = spell[k];
      });
      spell = merged;
    }
  }
  if (!requireTurn(caster)) return;
  var can = combatantCanAct(caster);
  if (!can.ok) { showToast('🚫 ' + caster.name + ' can\'t cast — ' + can.reason, 'warn'); rejectPlayer(caster, "You can't cast — you're " + can.reason); return; }

  // Validate the slot BEFORE mutating anything (so we can snapshot cleanly)
  var slotLevel = parseInt(req.slotLevel) || spell.level || 0;
  var slot = null;
  if ((spell.level || 0) > 0) {
    slot = (pc.spellSlots || [])[slotLevel - 1];
    if (!slot || slot.used >= slot.max) {
      showToast('🚫 ' + pc.name + ' has no level ' + slotLevel + ' slots left', 'warn');
      rejectPlayer(caster, 'No level ' + slotLevel + ' slots left');
      return;
    }
  }
  var castCost = spell.cost === 'bonus' ? 'bonus' : 'action';
  if (combatActive && !actionAvailable(caster, castCost)) {
    showToast('🚫 ' + caster.name + ' already used their ' + castCost, 'warn');
    rejectPlayer(caster, 'Already used your ' + castCost + ' this turn');
    return;
  }

  // Snapshot the pre-cast world, THEN spend resources
  snapshotBeforeAction();
  if (combatActive) spendActionFor(caster, castCost);
  if (slot) {
    slot.used++;
    if (typeof savePartyStorage === 'function') savePartyStorage();
    if (typeof renderParty === 'function') renderParty();
  }

  // Concentration: casting a new concentration spell drops the old one
  if (spell.concentration) {
    if (caster.concentrating) logCombat('💫 ' + caster.name + ' drops "' + caster.concentrating + '" to cast ' + spell.name, 'info');
    caster.concentrating = spell.name;
  }

  // Resolve targets
  var targets = [];
  if (spell.aoeFt && req.center) {
    var casterPos = (typeof mapState !== 'undefined' && mapState.tokens) ? mapState.tokens[caster.id] : null;
    targets = aoeTargetsFor(spell, casterPos, req.center);
    // Drop the visible blast shape on the map for the table
    if (typeof mapState !== 'undefined') {
      var rCells = Math.max(1, Math.round(spell.aoeFt / 5));
      var shape = spell.aoeShape || 'sphere';
      if (shape === 'sphere' || !casterPos) {
        mapState.props.push({ id: Date.now(), kind: 'aoe', x: req.center.x, y: req.center.y, r: rCells, color: '255,120,30' });
      } else {
        mapState.props.push({ id: Date.now(), kind: 'aoe', shape: shape, x: casterPos.x, y: casterPos.y, tx: req.center.x, ty: req.center.y, r: rCells, color: shape === 'line' ? '120,180,255' : '255,120,30' });
      }
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
  var savePending = [];

  targets.forEach(function(t) {
    var entry = { name: t.name, type: t.type };
    var baseDamage = req.damageRoll ? Math.max(0, parseInt(req.damageRoll) || 0) : rollDiceExpr(dice).total;
    if (extraLevels > 0 && spell.upcastDice && !req.damageRoll) {
      for (var u = 0; u < extraLevels; u++) baseDamage += rollDiceExpr(spell.upcastDice).total;
    }

    if (spell.kind === 'buff') {
      if (spell.applyCondition && CONDITION_EFFECTS[spell.applyCondition] !== undefined) {
        t.conditions = t.conditions || [];
        if (t.conditions.indexOf(spell.applyCondition) < 0) t.conditions.push(spell.applyCondition);
        if (spell.concentration) {
          t.condMeta = t.condMeta || {};
          t.condMeta[spell.applyCondition] = { linkedCaster: caster.name, linkedSpell: spell.name };
        }
        entry.buffed = spell.applyCondition;
        logCombat('✨ ' + caster.name + ' — ' + spell.name + ': ' + t.name + ' is ' + spell.applyCondition + '!', 'heal');
      } else {
        logCombat('✨ ' + caster.name + ' casts ' + spell.name + ' on ' + t.name, 'info');
      }
    } else if (spell.kind === 'heal') {
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
      // Save-based (Fireball et al): rolls entered at the table via the DM modal
      savePending.push({ t: t, entry: entry, baseDamage: baseDamage });
      return; // entry pushed after the save resolves
    }
    feed.targets.push(entry);
  });

  function finalizeSpell() {
    window.lastActionResult = feed;
    showToast('✨ ' + caster.name + ' casts ' + spell.name + (slotLevel > (spell.level||0) ? ' (level ' + slotLevel + ')' : '') + ' — ' + targets.length + ' target' + (targets.length !== 1 ? 's' : ''), 'success');
    renderCombatants();
    if (window.cloudSave) window.cloudSave();
  }

  if (savePending.length) {
    var ability = (spell.saveAbility || 'dex').toUpperCase();
    var rollEntries = savePending.map(function(sp) {
      var sb = saveBonusFor(sp.t, spell.saveAbility || 'dex');
      return { id: String(sp.t.id), label: sp.t.name + ' — ' + ability + ' save', sub: 'DC ' + dc + ' · their bonus ' + (sb >= 0 ? '+' : '') + sb + ' (added automatically)', adv: 0 };
    });
    requestRolls('✨ ' + spell.name + ' (' + caster.name + ') — ' + ability + ' saves, DC ' + dc, rollEntries, function(results) {
      savePending.forEach(function(sp) {
        var t = sp.t, entry = sp.entry;
        var sb = saveBonusFor(t, spell.saveAbility || 'dex');
        var sRoll = results[String(t.id)] || 10;
        var sTotal = sRoll + sb;
        var saved = sTotal >= dc;
        entry.save = { ability: ability, dc: dc, roll: sRoll, bonus: sb, total: sTotal, saved: saved };
        var amt2 = saved && spell.halfOnSave !== false ? Math.floor(sp.baseDamage / 2) : (saved ? 0 : sp.baseDamage);
        var def2 = applyDamageWithDefenses(t, amt2, spell.damageType);
        t.hp = Math.max(0, t.hp - def2.taken);
        entry.taken = def2.taken;
        entry.defNotes = def2.notes;
        learnDefense(t, spell.damageType, def2.notes);
        if (spell.applyCondition && !saved && CONDITION_EFFECTS[spell.applyCondition] !== undefined) {
          t.conditions = t.conditions || [];
          if (t.conditions.indexOf(spell.applyCondition) < 0) t.conditions.push(spell.applyCondition);
          entry.appliedCondition = spell.applyCondition;
        }
        if (def2.taken > 0 && typeof checkConcentration === 'function') checkConcentration(t, def2.taken);
        logCombat('✨ ' + spell.name + ' → ' + t.name + ': ' + ability + ' save ' + sTotal + ' vs DC ' + dc + ' — ' + (saved ? 'SAVED, ' : 'FAILED, ') + def2.taken + ' dmg' + (def2.notes.length ? ' · ' + def2.notes.join(' · ') : ''), saved ? 'info' : 'damage');
        feed.targets.push(entry);
      });
      finalizeSpell();
    });
  } else {
    finalizeSpell();
  }
}

// ============================================================
// MONSTER KNOWLEDGE — players learn stats by fighting
// ============================================================
// Attack rolls against a creature teach its AC (after 2 rolls).
// Triggered defenses (halved/immune/doubled) teach that damage type.
function learnFromAttack(target) {
  if (target.type === 'ally') return;
  target._atkRolls = (target._atkRolls || 0) + 1;
  if (target._atkRolls >= 2 && !target.acKnown) {
    target.acKnown = true;
    showToast('👁 The party has learned ' + target.name + '\'s AC (' + target.ac + ')', 'info');
  }
}

function learnDefense(target, dmgType, notes) {
  if (target.type === 'ally' || !dmgType || !notes || !notes.length) return;
  target.knownDefs = target.knownDefs || [];
  if (target.knownDefs.indexOf(dmgType) < 0) {
    target.knownDefs.push(dmgType);
    showToast('👁 The party learned how ' + target.name + ' handles ' + dmgType, 'info');
  }
}

// DM reveal controls (used from the condition modal)
function toggleReveal(key) {
  var c = combatants.find(function(x) { return x.id === condTargetId; });
  if (!c) return;
  c[key] = !c[key];
  renderCombatants();
  if (typeof renderDefenseChips === 'function') renderDefenseChips();
  if (window.cloudSave) window.cloudSave();
  showToast('👁 ' + c.name + ': ' + key.replace('Known', ' now ') + (c[key] ? ' visible to players' : ' hidden again'), 'info');
}

// ============================================================
// LIGHT-DRIVEN FOG REVEAL — party light sources melt the fog
// ============================================================
function partyLightFor(c) {
  var pc = (typeof party !== 'undefined' ? party : []).find(function(p) { return p.name === c.name; });
  var best = 10; // everyone senses their immediate surroundings
  if (pc) (pc.inventory || []).forEach(function(it) {
    if (it.equipped && it.lightFt && it.lightFt > best) best = it.lightFt;
  });
  return best;
}

function carveFogAroundParty() {
  if (typeof mapState === 'undefined' || !mapState.autoReveal || !mapState.fog || !mapState.fog.length) return false;
  var carved = false;
  combatants.forEach(function(c) {
    if (c.type !== 'ally' || c.hp <= 0) return;
    var pos = (mapState.tokens || {})[c.id];
    if (!pos) return;
    var ft = partyLightFor(c);
    mapState.fog = mapState.fog.filter(function(key) {
      var p = key.split(',');
      var keep = dmDistFt(pos, { x: parseInt(p[0]), y: parseInt(p[1]) }) > ft;
      if (!keep) carved = true;
      return keep;
    });
  });
  return carved;
}

function toggleAutoReveal() {
  if (typeof mapState === 'undefined') return;
  mapState.autoReveal = !mapState.autoReveal;
  var btn = document.getElementById('auto-reveal-btn');
  if (btn) {
    btn.style.borderColor = mapState.autoReveal ? 'var(--gold)' : '';
    btn.style.color = mapState.autoReveal ? 'var(--gold)' : '';
  }
  if (mapState.autoReveal) {
    carveFogAroundParty();
    showToast('💡 Auto-reveal ON — party light sources melt the fog as they move', 'success');
  } else {
    showToast('💡 Auto-reveal off', 'info');
  }
  if (typeof renderMap === 'function') renderMap();
  if (window.cloudSave) window.cloudSave();
}


// ─── Improvised attacks for bare stat-block monsters ─────────
// The monster database has hp/ac/cr only; give them a credible
// CR-scaled strike so the DM act button always works.
function crToNumber(cr) {
  if (typeof cr === 'number') return cr;
  var s = String(cr || '0');
  if (s.indexOf('/') > 0) { var p = s.split('/'); return (parseInt(p[0]) || 0) / (parseInt(p[1]) || 1); }
  return parseFloat(s) || 0;
}

function improvisedAttackFor(name, cr) {
  var n = crToNumber(cr);
  var bonus = Math.max(3, Math.min(12, Math.round(3 + n * 0.6)));
  var dice = n < 1 ? '1d6+2' : n < 4 ? '1d8+3' : n < 8 ? '2d8+4' : n < 13 ? '2d10+5' : '3d10+7';
  var dmgType = inferDamageType(name) || 'slashing';
  return { name: 'Strike', kind: 'attack', range: 5, bonus: bonus, dice: dice, damageType: dmgType, improvised: true };
}

// ============================================================
// DM ROLL ENTRY — every d20 the table rolls can be typed in,
// or auto-rolled per row / all at once. One modal, many rows.
// ============================================================
var _rollGroups = {};
var _rollGroupSeq = 0;

function requestRolls(title, entries, onDone) {
  // entries: [{ id, label, sub, bonus, adv (-1|0|1 for auto rolls) }]
  if (!entries || !entries.length) { onDone({}); return; }
  var gid = 'g' + (++_rollGroupSeq);
  _rollGroups[gid] = { entries: entries, onDone: onDone, results: {} };

  var modal = document.getElementById('dm-roll-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'dm-roll-modal';
    modal.className = 'modal-overlay show';
    modal.style.zIndex = '2700';
    modal.innerHTML = '<div class="modal" style="max-width:480px;width:95%;max-height:85vh;overflow-y:auto;">' +
      '<h3 style="font-family:Cinzel,serif;color:var(--gold);margin-bottom:4px;">🎲 Rolls needed</h3>' +
      '<div style="font-size:12px;color:var(--text-dim);margin-bottom:12px;">Enter the raw d20s rolled at the table — or hit auto. Empty rows auto-roll on Apply.</div>' +
      '<div id="dm-roll-rows"></div>' +
      '<div class="modal-btns" style="margin-top:12px;">' +
        '<button class="btn btn-ghost" onclick="dmRollAutoAll()">🎲 Auto-roll all</button>' +
        '<button class="btn btn-gold" onclick="dmRollApply()">✓ Apply</button>' +
      '</div></div>';
    document.body.appendChild(modal);
  }
  var rows = document.getElementById('dm-roll-rows');
  var titleRow = document.createElement('div');
  titleRow.style.cssText = 'font-family:Cinzel,serif;font-size:12px;color:var(--gold-light);margin:8px 0 6px;letter-spacing:0.05em;';
  titleRow.textContent = title;
  rows.appendChild(titleRow);
  entries.forEach(function(en) {
    var row = document.createElement('div');
    row.className = 'dm-roll-row';
    row.dataset.gid = gid;
    row.dataset.eid = en.id;
    row.dataset.adv = en.adv || 0;
    var advNote = en.adv > 0 ? ' <span style="color:#6fdc75;font-size:10px;">ADV: roll 2, higher</span>'
                : en.adv < 0 ? ' <span style="color:#ff8080;font-size:10px;">DIS: roll 2, lower</span>' : '';
    row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid rgba(255,255,255,0.1);border-radius:5px;margin-bottom:5px;background:rgba(0,0,0,0.25);';
    row.innerHTML =
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-size:13px;color:var(--parchment);">' + en.label + advNote + '</div>' +
        (en.sub ? '<div style="font-size:11px;color:var(--text-dim);">' + en.sub + '</div>' : '') +
      '</div>' +
      '<input type="number" min="1" max="20" placeholder="d20" class="dm-roll-input" style="width:62px;font-size:16px;text-align:center;padding:5px;background:rgba(0,0,0,0.4);border:1px solid rgba(212,175,55,0.35);border-radius:5px;color:var(--parchment);">' +
      '<button class="btn btn-ghost btn-sm" onclick="dmRollAutoRow(this)">🎲</button>' +
      (en.skippable ? '<button class="btn btn-ghost btn-sm" title="Skip — no roll happens" onclick="this.closest(\'.dm-roll-row\').dataset.skipped=\'1\';this.closest(\'.dm-roll-row\').style.opacity=\'0.35\'">✕</button>' : '');
    rows.appendChild(row);
  });
  var firstInput = rows.querySelector('.dm-roll-row input');
  if (firstInput) firstInput.focus();
}

function dmRollAutoRow(btn) {
  var row = btn.closest('.dm-roll-row');
  var inp = row.querySelector('input');
  inp.value = rollD20WithAdvState(parseInt(row.dataset.adv) || 0);
  inp.style.borderColor = '#8fd050';
}

function dmRollAutoAll() {
  document.querySelectorAll('#dm-roll-rows .dm-roll-row').forEach(function(row) {
    var inp = row.querySelector('input');
    if (!inp.value) {
      inp.value = rollD20WithAdvState(parseInt(row.dataset.adv) || 0);
      inp.style.borderColor = '#8fd050';
    }
  });
  dmRollApply();
}

function dmRollApply() {
  var rows = document.querySelectorAll('#dm-roll-rows .dm-roll-row');
  rows.forEach(function(row) {
    var gid = row.dataset.gid, eid = row.dataset.eid;
    if (row.dataset.skipped === '1') return; // deliberately skipped — caller sees no result
    var inp = row.querySelector('input');
    var v = parseInt(inp.value);
    if (!v || v < 1 || v > 20) v = rollD20WithAdvState(parseInt(row.dataset.adv) || 0); // empty/invalid → auto
    if (_rollGroups[gid]) _rollGroups[gid].results[eid] = v;
  });
  var modal = document.getElementById('dm-roll-modal');
  if (modal) modal.remove();
  Object.keys(_rollGroups).forEach(function(gid) {
    var g = _rollGroups[gid];
    delete _rollGroups[gid];
    try { g.onDone(g.results); } catch(e) { console.error('roll group', e); }
  });
}

// ============================================================
// CUSTOM ITEM EFFECTS — anything you invent pulls into the stats
// ============================================================
function equipmentMods(pc) {
  var out = { ac: 0, speed: 0, stats: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }, resist: [], immune: [], vuln: [], actions: [] };
  (pc.inventory || []).forEach(function(it) {
    if (!it.equipped) return;
    if (it.acBonus) out.ac += it.acBonus;
    if (it.speedBonus) out.speed += it.speedBonus;
    if (it.statBonuses) Object.keys(out.stats).forEach(function(k) { out.stats[k] += it.statBonuses[k] || 0; });
    (it.grantResist || []).forEach(function(t) { if (out.resist.indexOf(t) < 0) out.resist.push(t); });
    (it.grantImmune || []).forEach(function(t) { if (out.immune.indexOf(t) < 0) out.immune.push(t); });
    (it.grantVuln || []).forEach(function(t) { if (out.vuln.indexOf(t) < 0) out.vuln.push(t); });
    if (it.grantAction && it.grantAction.name) out.actions.push(Object.assign({ fromItem: true }, it.grantAction));
  });
  return out;
}

// Ability score including magic item bonuses (Belt of Giant Strength...)
function effectiveAbility(pc, ability) {
  var base = pc[ability] || 10;
  var mods = equipmentMods(pc);
  return base + (mods.stats[ability] || 0);
}

// Push every equipment effect onto the live combatant
function recomputePcCombat(pc) {
  var c = combatants.find(function(x) { return x.name === pc.name && x.type === 'ally'; });
  if (!c) return;
  var mods = equipmentMods(pc);
  c.ac = (pc.ac || 10) + mods.ac;
  var merge = function(base, extra) {
    var outArr = (base || []).slice();
    (extra || []).forEach(function(t) { if (outArr.indexOf(t) < 0) outArr.push(t); });
    return outArr;
  };
  c.resist = merge(pc.resist, mods.resist);
  c.immune = merge(pc.immune, mods.immune);
  c.vuln = merge(pc.vuln, mods.vuln);
}

// ============================================================
// MONSTER ACTION EDITOR + LEGENDARY ACTIONS
// ============================================================
function dmEditActions(combatantId) {
  var c = combatants.find(function(x) { return x.id === combatantId; });
  if (!c) return;
  var existing = document.getElementById('dm-act-modal');
  if (existing) existing.remove();
  var ov = document.createElement('div');
  ov.id = 'dm-actedit-modal';
  ov.className = 'modal-overlay show';
  ov.style.zIndex = '2650';
  var actions = (c.actions || []).slice();
  var rowsHtml = function() {
    return actions.map(function(a, i) {
      return '<div class="ae-row" data-i="' + i + '" style="display:grid;grid-template-columns:2fr 72px 52px 52px 1fr 1fr 82px 24px;gap:4px;margin-bottom:4px;align-items:center;">' +
        '<input class="ae-name" value="' + (a.name || '').replace(/"/g, '&quot;') + '" placeholder="Bite" style="font-size:12px;padding:4px;">' +
        '<select class="ae-kind" style="font-size:11px;padding:4px;"><option value="attack"' + (a.kind !== 'heal' ? ' selected' : '') + '>⚔ Atk</option><option value="heal"' + (a.kind === 'heal' ? ' selected' : '') + '>❤ Heal</option></select>' +
        '<input class="ae-range" type="number" value="' + (a.range || 5) + '" title="Range ft" style="font-size:12px;padding:4px;text-align:center;">' +
        '<input class="ae-bonus" type="number" value="' + (a.bonus || 0) + '" title="To-hit" style="font-size:12px;padding:4px;text-align:center;">' +
        '<input class="ae-dice" value="' + (a.dice || '').replace(/"/g, '&quot;') + '" placeholder="2d6+3" style="font-size:12px;padding:4px;">' +
        '<select class="ae-type" style="font-size:11px;padding:4px;"><option value="">type</option>' + DAMAGE_TYPES.map(function(t) { return '<option value="' + t + '"' + (a.damageType === t ? ' selected' : '') + '>' + t.slice(0, 6) + '</option>'; }).join('') + '</select>' +
        '<select class="ae-cost" style="font-size:11px;padding:4px;"><option value="action"' + (!a.cost || a.cost === 'action' ? ' selected' : '') + '>Action</option><option value="bonus"' + (a.cost === 'bonus' ? ' selected' : '') + '>Bonus</option><option value="legendary"' + (a.cost === 'legendary' ? ' selected' : '') + '>⭐ Leg.</option></select>' +
        '<button onclick="this.closest(\'.ae-row\').remove()" style="background:none;border:1px solid var(--border);color:var(--blood-light);border-radius:3px;cursor:pointer;height:22px;font-size:11px;">✕</button>' +
      '</div>';
    }).join('');
  };
  ov.innerHTML = '<div class="modal" style="max-width:640px;width:96%;max-height:85vh;overflow-y:auto;">' +
    '<h3 style="font-family:Cinzel,serif;color:var(--gold);margin-bottom:4px;">✎ ' + c.name + ' — actions</h3>' +
    '<div style="font-size:11px;color:var(--text-dim);margin-bottom:10px;">⭐ Legendary actions can be used at the END of other creatures\' turns and draw from the legendary pool below.</div>' +
    '<div id="ae-rows">' + rowsHtml() + '</div>' +
    '<button class="btn btn-ghost btn-sm" onclick="dmAddActionRow()" style="margin:6px 0 12px;">+ Add action</button>' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
      '<span style="font-size:12px;color:var(--text-dim);">⚔⚔ Attacks per Action (multiattack):</span>' +
      '<input id="ae-multi" type="number" min="1" max="6" value="' + (c.multiattack || 1) + '" style="width:56px;font-size:14px;padding:4px;text-align:center;">' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
      '<span style="font-size:12px;color:var(--text-dim);">⭐ Legendary actions per round:</span>' +
      '<input id="ae-legmax" type="number" min="0" max="5" value="' + ((c.legendary && c.legendary.max) || 0) + '" style="width:56px;font-size:14px;padding:4px;text-align:center;">' +
      '<span style="font-size:10px;color:#555;">(0 = none)</span>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">' +
      '<span style="font-size:12px;color:var(--text-dim);">🧝 Controlled by (summons/minions):</span>' +
      '<input id="ae-owner" value="' + (c.owner || '').replace(/"/g, '&quot;') + '" placeholder="character name" style="width:150px;font-size:13px;padding:4px;">' +
      '<span style="font-size:10px;color:#555;">that player moves & runs it on their turn</span>' +
    '</div>' +
    '<div class="modal-btns">' +
      '<button class="btn btn-gold" onclick="dmSaveActions(' + combatantId + ')">💾 Save</button>' +
      '<button class="btn btn-ghost" onclick="document.getElementById(\'dm-actedit-modal\').remove()">Cancel</button>' +
    '</div></div>';
  ov.addEventListener('click', function(e) { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
}

function dmAddActionRow() {
  var rows = document.getElementById('ae-rows');
  if (!rows) return;
  var div = document.createElement('div');
  div.innerHTML = '<div class="ae-row" style="display:grid;grid-template-columns:2fr 72px 52px 52px 1fr 1fr 82px 24px;gap:4px;margin-bottom:4px;align-items:center;">' +
    '<input class="ae-name" placeholder="Tail Swipe" style="font-size:12px;padding:4px;">' +
    '<select class="ae-kind" style="font-size:11px;padding:4px;"><option value="attack">⚔ Atk</option><option value="heal">❤ Heal</option></select>' +
    '<input class="ae-range" type="number" value="5" style="font-size:12px;padding:4px;text-align:center;">' +
    '<input class="ae-bonus" type="number" value="4" style="font-size:12px;padding:4px;text-align:center;">' +
    '<input class="ae-dice" placeholder="2d6+3" style="font-size:12px;padding:4px;">' +
    '<select class="ae-type" style="font-size:11px;padding:4px;"><option value="">type</option>' + DAMAGE_TYPES.map(function(t) { return '<option value="' + t + '">' + t.slice(0, 6) + '</option>'; }).join('') + '</select>' +
    '<select class="ae-cost" style="font-size:11px;padding:4px;"><option value="action">Action</option><option value="bonus">Bonus</option><option value="legendary">⭐ Leg.</option></select>' +
    '<button onclick="this.closest(\'.ae-row\').remove()" style="background:none;border:1px solid var(--border);color:var(--blood-light);border-radius:3px;cursor:pointer;height:22px;font-size:11px;">✕</button>' +
  '</div>';
  rows.appendChild(div.firstChild);
}

function dmSaveActions(combatantId) {
  var c = combatants.find(function(x) { return x.id === combatantId; });
  if (!c) return;
  var acts = [];
  document.querySelectorAll('#ae-rows .ae-row').forEach(function(row) {
    var name = row.querySelector('.ae-name').value.trim();
    if (!name) return;
    var a = {
      name: name,
      kind: row.querySelector('.ae-kind').value,
      range: parseInt(row.querySelector('.ae-range').value) || 5,
      bonus: parseInt(row.querySelector('.ae-bonus').value) || 0,
      dice: row.querySelector('.ae-dice').value.trim() || '1d6'
    };
    var t = row.querySelector('.ae-type').value; if (t) a.damageType = t;
    else { var inf = inferDamageType(name); if (inf) a.damageType = inf; }
    var cost = row.querySelector('.ae-cost').value; if (cost !== 'action') a.cost = cost;
    acts.push(a);
  });
  c.actions = acts;
  var legMax = parseInt(document.getElementById('ae-legmax').value) || 0;
  c.legendary = legMax > 0 ? { max: legMax, used: (c.legendary && c.legendary.used) || 0 } : undefined;
  var ownerEl = document.getElementById('ae-owner');
  c.owner = (ownerEl && ownerEl.value.trim()) || undefined;
  var multiEl = document.getElementById('ae-multi');
  var multi = multiEl ? parseInt(multiEl.value) || 1 : 1;
  c.multiattack = multi > 1 ? multi : undefined;
  var m = document.getElementById('dm-actedit-modal');
  if (m) m.remove();
  renderCombatants();
  if (window.cloudSave) window.cloudSave();
  showToast('💾 ' + c.name + ': ' + acts.length + ' action' + (acts.length !== 1 ? 's' : '') + (legMax ? ' · ' + legMax + ' legendary/round' : ''), 'success');
}

// ============================================================
// AOE SHAPES — spheres, cones, and lines
// ============================================================
// origin: caster cell (cones/lines) · aim: tapped cell (sphere center, or direction)
function aoeTargetsFor(spell, origin, aim, allCombatants) {
  var lenFt = spell.aoeFt || 0;
  var shape = spell.aoeShape || 'sphere';
  var hits = [];
  (allCombatants || combatants).forEach(function(c) {
    if (c.hp <= 0 && c.type === 'enemy') return;
    var pos = (typeof mapState !== 'undefined' && mapState.tokens) ? mapState.tokens[c.id] : null;
    if (!pos) return;
    if (shape === 'sphere') {
      if (dmDistFt(pos, aim) <= lenFt) hits.push(c);
      return;
    }
    if (!origin) return;
    var vx = pos.x - origin.x, vy = pos.y - origin.y;
    var dx = aim.x - origin.x, dy = aim.y - origin.y;
    var dlen = Math.sqrt(dx * dx + dy * dy);
    if (dlen === 0) return;
    var ux = dx / dlen, uy = dy / dlen;
    var distFt = Math.sqrt(vx * vx + vy * vy) * 5;
    if (distFt === 0) return; // the caster isn't inside their own cone/line
    if (shape === 'cone') {
      var cos = (vx * ux + vy * uy) / (distFt / 5);
      if (distFt <= lenFt && cos >= 0.883) hits.push(c); // ~28° half-angle: width ≈ distance
    } else if (shape === 'line') {
      var t = (vx * ux + vy * uy) * 5;             // distance along the line, ft
      var perp = Math.abs(vx * uy - vy * ux) * 5;  // distance off the line, ft
      if (t > 0 && t <= lenFt && perp <= 4) hits.push(c);
    }
  });
  return hits;
}

// ============================================================
// OPPORTUNITY ATTACKS — leaving melee reach provokes
// ============================================================
function checkOpportunityAttacks(mover, fromPos, toPos) {
  if (!combatActive || !fromPos || !toPos) return;
  if ((mover.conditions || []).indexOf('Disengaged') >= 0) return;
  var threats = combatants.filter(function(c) {
    if (c.id === mover.id || c.hp <= 0 || c.hidden) return false;
    if (c.type === mover.type) return false;
    if (c.type !== 'enemy' && c.type !== 'ally') return false;
    if (c.reactionUsed) return false;
    var pos = mapState.tokens[c.id];
    if (!pos) return false;
    return dmDistFt(pos, fromPos) <= 5 && dmDistFt(pos, toPos) > 5;
  });
  if (!threats.length) return;

  var existing = document.getElementById('oa-modal');
  if (existing) existing.remove();
  var ov = document.createElement('div');
  ov.id = 'oa-modal';
  ov.className = 'modal-overlay show';
  ov.style.zIndex = '2680';
  var inner = '<div class="modal" style="max-width:420px;width:95%;">' +
    '<h3 style="font-family:Cinzel,serif;color:var(--gold);margin-bottom:4px;">⚡ Opportunity Attacks!</h3>' +
    '<div style="font-size:12px;color:var(--text-dim);margin-bottom:12px;">' + mover.name + ' left melee reach. Each attacker spends their reaction.</div>';
  threats.forEach(function(t) {
    inner += '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--border);border-radius:6px;margin-bottom:6px;background:rgba(0,0,0,0.25);" id="oa-row-' + t.id + '">' +
      '<span style="flex:1;font-size:14px;color:' + (t.type === 'ally' ? '#90c8ff' : '#ff9090') + ';">' + t.name + '</span>' +
      '<button class="btn btn-blood btn-sm" onclick="takeOpportunityAttack(' + t.id + ',' + mover.id + ')">⚔ Attack</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="document.getElementById(\'oa-row-' + t.id + '\').remove()">Skip</button>' +
    '</div>';
  });
  inner += '<div class="modal-btns"><button class="btn btn-ghost" onclick="document.getElementById(\'oa-modal\').remove()">Done</button></div></div>';
  ov.innerHTML = inner;
  ov.addEventListener('click', function(e) { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
}

function takeOpportunityAttack(attackerId, targetId) {
  var attacker = combatants.find(function(x) { return x.id === attackerId; });
  var target = combatants.find(function(x) { return x.id === targetId; });
  if (!attacker || !target) return;
  var row = document.getElementById('oa-row-' + attackerId);
  if (row) row.remove();
  var acts = (attacker.actions && attacker.actions.length) ? attacker.actions
    : (function() { var pc = party.find(function(p) { return p.name === attacker.name; }); return pc ? effectiveActions(pc) : []; })();
  var melee = acts.find(function(a) { return a.kind !== 'heal' && (parseInt(a.range) || 5) <= 5; }) || improvisedAttackFor(attacker.name, '1/2');
  attacker.reactionUsed = true;
  var oaAction = Object.assign({}, melee, { cost: 'reaction' });
  var ctx = computeAttackContext(attacker, target, oaAction);
  requestRolls('⚡ Opportunity attack: ' + attacker.name + ' → ' + target.name,
    [{ id: 'r', label: melee.name + ' (+' + (melee.bonus || 0) + ')', sub: ctx.notes.join(', '), adv: ctx.net }],
    function(results) { resolveCombatAction(attackerId, targetId, oaAction, { roll: results.r, source: 'dm' }); });
}

// ============================================================
// CONSUMABLES — potions heal, ammo counts down
// ============================================================
function processUseItem(req) {
  var pc = party.find(function(p) { return p.id === req.pcId; });
  if (!pc) return;
  var item = (pc.inventory || []).find(function(i) { return i.id === req.itemId; });
  if (!item || (item.qty || 0) < 1) return;
  var c = combatants.find(function(x) { return x.name === pc.name && x.type === 'ally'; });

  if (item.slot === 'potion') {
    // Feeding someone else costs your ACTION and 5 ft reach; drinking it yourself
    // is a bonus action (your table rule) — and only during combat either way
    var drinker = c;
    var feeding = false;
    if (req.targetId && c && req.targetId !== c.id) {
      var tgt = combatants.find(function(x) { return x.id === req.targetId; });
      if (!tgt) return;
      var myPos2 = (typeof mapState !== 'undefined' && mapState.tokens) ? mapState.tokens[c.id] : null;
      var tPos2 = (typeof mapState !== 'undefined' && mapState.tokens) ? mapState.tokens[tgt.id] : null;
      if (myPos2 && tPos2 && dmDistFt(myPos2, tPos2) > 5) { rejectPlayer(c, 'Too far — get within 5 ft to feed them the potion'); return; }
      drinker = tgt;
      feeding = true;
    }
    if (combatActive && c) {
      if (!requireTurn(c)) return;
      var potCost = feeding ? 'action' : 'bonus';
      if (!actionAvailable(c, potCost)) { showToast('🚫 ' + pc.name + ' already used their ' + potCost, 'warn'); rejectPlayer(c, 'Already used your ' + potCost); return; }
      spendActionFor(c, potCost);
    }
    var heal = rollDiceExpr(item.healDice || '2d4+2');
    if (drinker) {
      var prev = drinker.hp;
      drinker.hp = Math.min(drinker.maxHp, drinker.hp + heal.total);
      if (prev === 0 && drinker.hp > 0) drinker.conditions = (drinker.conditions || []).filter(function(x) { return x !== 'Unconscious' && x !== 'Stable'; });
      logCombat('🧪 ' + pc.name + (feeding ? ' pours ' + item.name + ' into ' + drinker.name : ' drinks ' + item.name) + ' — heals ' + (drinker.hp - prev) + ' (' + prev + '→' + drinker.hp + ' HP)', 'heal');
      window.lastActionResult = { id: Date.now(), kind: 'heal', attacker: pc.name, target: drinker.name, actionName: item.name, amount: drinker.hp - prev, hit: true, notes: feeding && prev === 0 ? [drinker.name + ' sputters back to consciousness!'] : [], ts: new Date().toISOString() };
    } else {
      logCombat('🧪 ' + pc.name + ' drinks ' + item.name + ' (' + heal.total + ' HP — not in combat, DM adjust as needed)', 'heal');
    }
    showToast('🧪 ' + (feeding ? drinker.name + ' fed ' : pc.name + ' drinks ') + item.name + ' — +' + heal.total, 'success');
  } else {
    showToast('🎒 ' + pc.name + ' uses ' + item.name, 'info');
    logCombat('🎒 ' + pc.name + ' uses ' + item.name, 'info');
  }

  item.qty = (item.qty || 1) - 1;
  if (item.qty <= 0) pc.inventory = pc.inventory.filter(function(i) { return i.id !== item.id; });
  if (typeof savePartyStorage === 'function') savePartyStorage();
  if (typeof renderParty === 'function') renderParty();
  renderCombatants();
  if (window.cloudSave) window.cloudSave();
}

// Ranged weapon shots consume equipped ammo
function consumeAmmoFor(attacker, action) {
  if (!action.fromItem || (parseInt(action.range) || 5) <= 20) return;
  var pc = party.find(function(p) { return p.name === attacker.name; });
  if (!pc) return;
  var ammo = (pc.inventory || []).find(function(i) { return i.slot === 'ammo' && (i.qty || 0) > 0 && i.equipped; }) ||
             (pc.inventory || []).find(function(i) { return i.slot === 'ammo' && (i.qty || 0) > 0; });
  if (!ammo) { showToast('🏹 ' + pc.name + ' has no ammo tracked — add arrows to their inventory', 'warn'); return; }
  ammo.qty--;
  if (ammo.qty <= 0) {
    pc.inventory = pc.inventory.filter(function(i) { return i.id !== ammo.id; });
    showToast('🏹 ' + pc.name + ' fires their LAST ' + ammo.name.replace(/s$/, '') + '!', 'warn');
  } else if (ammo.qty <= 5) {
    showToast('🏹 ' + pc.name + ': ' + ammo.qty + ' ' + ammo.name + ' left', 'info');
  }
  if (typeof savePartyStorage === 'function') savePartyStorage();
}

// ============================================================
// HOMEBREW SPELLBOOK — yours forever, across every campaign
// ============================================================
function upsertHomebrewSpell(spell) {
  if (typeof homebrewSpells === 'undefined') return false;
  if (typeof SPELL_DB !== 'undefined' && SPELL_DB.some(function(s) { return s.name.toLowerCase() === spell.name.toLowerCase(); })) return false;
  var idx = homebrewSpells.findIndex(function(s) { return s.name.toLowerCase() === spell.name.toLowerCase(); });
  var isNew = idx < 0;
  if (isNew) homebrewSpells.push(spell);
  else homebrewSpells[idx] = spell;
  try { localStorage.setItem('dm_homebrew_spells', JSON.stringify(homebrewSpells)); } catch(e) {}
  if (window.cloudSaveHomebrew) window.cloudSaveHomebrew();
  var dl = document.getElementById('spell-db-names');
  if (dl) dl.remove(); // rebuilt with homebrew on next open
  return isNew;
}

// ─── Divine Smite: burn a slot after the hit lands ───────────
function processPlayerSmite(req) {
  var pending = window.pendingSmite;
  if (!pending || pending.id !== req.smiteId || pending.attackerId !== req.combatantId) {
    if (req.accept !== false) showToast('⏳ Too late for the smite — the moment passed', 'info');
    window.pendingSmite = null;
    if (window.cloudSave) window.cloudSave();
    return;
  }
  window.pendingSmite = null;
  if (req.accept === false) { if (window.cloudSave) window.cloudSave(); return; }
  var attacker = combatants.find(function(x) { return x.id === pending.attackerId; });
  var target = combatants.find(function(x) { return x.id === pending.targetId; });
  var pc = party.find(function(p) { return attacker && p.name === attacker.name; });
  if (!attacker || !target || !pc) return;
  var lvl = Math.max(1, parseInt(req.slotLevel) || 1);
  var slot = (pc.spellSlots || [])[lvl - 1];
  if (!slot || slot.used >= slot.max) { rejectPlayer(attacker, 'No level ' + lvl + ' slot left for the smite'); return; }
  slot.used++;
  if (typeof savePartyStorage === 'function') savePartyStorage();
  snapshotBeforeAction();
  var diceCount = Math.min(5, 1 + lvl) * (pending.crit ? 2 : 1); // 2d8 at L1, +1d8/level, doubled on crit
  var dmg = rollDiceExpr(diceCount + 'd8');
  var def = applyDamageWithDefenses(target, dmg.total, 'radiant');
  target.hp = Math.max(0, target.hp - def.taken);
  logCombat('✨⚔ ' + attacker.name + ' DIVINE SMITE (L' + lvl + (pending.crit ? ', CRIT' : '') + ') — +' + def.taken + ' radiant to ' + target.name + (def.notes.length ? ' · ' + def.notes.join(', ') : ''), 'damage');
  showToast('✨⚔ DIVINE SMITE — ' + def.taken + ' radiant!', 'success');
  window.lastActionResult = { id: Date.now(), kind: 'spell', caster: attacker.name, spellName: 'Divine Smite', slotLevel: lvl,
    targets: [{ name: target.name, type: target.type, hit: true, taken: def.taken, defNotes: def.notes }],
    notes: [diceCount + 'd8 radiant' + (pending.crit ? ' (crit doubled!)' : '')], ts: new Date().toISOString() };
  if (typeof renderParty === 'function') renderParty();
  renderCombatants();
  if (window.cloudSave) window.cloudSave();
}

// ─── Bardic Inspiration: hand an ally the die ────────────────
function processPlayerInspire(req) {
  var bard = combatants.find(function(x) { return x.id === req.combatantId; });
  var target = combatants.find(function(x) { return x.id === req.targetId; });
  if (!bard || !target || !requireTurn(bard)) return;
  if (bard.bardicUsed) { rejectPlayer(bard, 'Bardic Inspiration already given — recharges on a rest'); return; }
  if (combatActive && !actionAvailable(bard, 'bonus')) { rejectPlayer(bard, 'Already used your bonus action'); return; }
  if (combatActive) spendActionFor(bard, 'bonus');
  bard.bardicUsed = true;
  target.conditions = target.conditions || [];
  if (target.conditions.indexOf('Bardic Die') < 0) target.conditions.push('Bardic Die');
  logCombat('🎵 ' + bard.name + ' inspires ' + target.name + ' — they hold a Bardic Inspiration die (add it to any roll, then the DM clears the tag)', 'heal');
  showToast('🎵 ' + target.name + ' is INSPIRED!', 'success');
  renderCombatants();
  if (window.cloudSave) window.cloudSave();
}

// ─── Stand up from Prone (half your movement) ────────────────
function processPlayerStandUp(req) {
  var c = combatants.find(function(x) { return x.id === req.combatantId; });
  if (!c || !requireTurn(c)) return;
  if ((c.conditions || []).indexOf('Prone') < 0) return;
  var base = parseInt(req.baseSpeed) || 30;
  var cost = Math.floor(base / 2);
  if (combatActive) {
    var tu = ensureTurnUsed(c);
    if (tu.movedFt + cost > base) { rejectPlayer(c, 'Not enough movement left to stand (needs ' + cost + ' ft)'); return; }
    tu.movedFt += cost;
  }
  c.conditions = c.conditions.filter(function(x) { return x !== 'Prone'; });
  logCombat('🧍 ' + c.name + ' stands up (' + cost + ' ft of movement)', 'info');
  showToast('🧍 ' + c.name + ' is back on their feet', 'info');
  renderCombatants();
  if (window.cloudSave) window.cloudSave();
}

// ─── Concentration links: buff dies when the caster's focus breaks ──
function dropLinkedConditions(casterName, spellName) {
  var dropped = [];
  combatants.forEach(function(c) {
    var meta = c.condMeta || {};
    (c.conditions || []).slice().forEach(function(cond) {
      var m = meta[cond];
      if (m && m.linkedCaster === casterName && m.linkedSpell === spellName) {
        c.conditions = c.conditions.filter(function(x) { return x !== cond; });
        delete meta[cond];
        dropped.push(c.name + ' loses ' + cond);
      }
    });
  });
  if (dropped.length) {
    logCombat('💫 Concentration broken — ' + dropped.join(', '), 'info');
    renderCombatants();
  }
}

// ─── DM economy overrides: you're the boss ───────────────────
function dmGrantAction(combatantId) {
  var c = combatants.find(function(x) { return x.id === combatantId; });
  if (!c) return;
  c._surgeExtra = (c._surgeExtra || 0) + 1;
  showToast('⚡ ' + c.name + ' granted an extra action this turn', 'success');
  logCombat('⚡ DM grants ' + c.name + ' an extra action', 'round');
  var m = document.getElementById('dm-act-modal');
  if (m) { m.remove(); dmOpenActMenu(combatantId); }
  renderCombatants();
  if (window.cloudSave) window.cloudSave();
}

function dmResetEconomy(combatantId) {
  var c = combatants.find(function(x) { return x.id === combatantId; });
  if (!c) return;
  c.turnUsed = { actions: 0, bonus: false, movedFt: 0 };
  c.reactionUsed = false;
  c._surgeExtra = 0; // "as if their turn just started" — granted extras reset too
  showToast('↺ ' + c.name + ' — fresh action, bonus, movement, and reaction', 'success');
  var m = document.getElementById('dm-act-modal');
  if (m) { m.remove(); dmOpenActMenu(combatantId); }
  renderCombatants();
  if (window.cloudSave) window.cloudSave();
}
