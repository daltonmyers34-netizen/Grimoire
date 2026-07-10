// ============================================================
// PLAYER ACTIONS — DM-side game engine for playable turns
// Players send requests from the Player View (via Firestore);
// this file validates and applies them. The DM app is always
// the authority — players never write game state directly.
// ============================================================

// Parse and roll dice like "2d6+3", "1d8", "d20-1"
function rollDiceExpr(str) {
  var m = String(str || '').trim().match(/^(\d*)d(\d+)\s*([+-]\s*\d+)?$/i);
  if (!m) return { total: 0, rolls: [], mod: 0, text: str };
  var count = parseInt(m[1]) || 1;
  var sides = parseInt(m[2]);
  var mod = m[3] ? parseInt(m[3].replace(/\s/g, '')) : 0;
  count = Math.min(count, 40);
  var rolls = [];
  for (var i = 0; i < count; i++) rolls.push(Math.floor(Math.random() * sides) + 1);
  var total = rolls.reduce(function(a, b) { return a + b; }, 0) + mod;
  return { total: Math.max(0, total), rolls: rolls, mod: mod, text: str };
}

function pvLogTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function processPlayerAction(req) {
  if (!req || !req.type) return;
  try {
    if (req.type === 'move') processPlayerMove(req);
    else if (req.type === 'action') processPlayerCombatAction(req);
  } catch(e) {
    console.error('processPlayerAction', e);
  }
}

function processPlayerMove(req) {
  var c = combatants.find(function(x) { return x.id === req.combatantId; });
  if (!c || c.type !== 'ally') return;
  // Only the active combatant may move (when combat is running)
  if (combatActive && combatants[currentTurn] && combatants[currentTurn].id !== c.id) {
    showToast('🚫 ' + c.name + ' tried to move out of turn', 'warn');
    return;
  }
  if (typeof mapState === 'undefined') return;
  var x = Math.max(0, Math.min(mapState.cols - 1, parseInt(req.x) || 0));
  var y = Math.max(0, Math.min(mapState.rows - 1, parseInt(req.y) || 0));
  mapState.tokens[c.id] = { x: x, y: y };
  if (typeof renderMap === 'function') renderMap();
  combatLog.unshift({ round: currentRound || 0, text: '🥾 ' + c.name + ' moved (player)', type: 'info', time: pvLogTime() });
  if (typeof renderCombatLog === 'function') renderCombatLog();
  showToast('🥾 ' + c.name + ' moved', 'info');
  if (window.cloudSave) window.cloudSave();
}

function processPlayerCombatAction(req) {
  var attacker = combatants.find(function(x) { return x.id === req.combatantId; });
  var target = combatants.find(function(x) { return x.id === req.targetId; });
  var a = req.action || {};
  if (!attacker || !target || !a.name) return;
  // Only the active combatant may act (when combat is running)
  if (combatActive && combatants[currentTurn] && combatants[currentTurn].id !== attacker.id) {
    showToast('🚫 ' + attacker.name + ' tried to act out of turn', 'warn');
    return;
  }

  var result = {
    id: Date.now(),
    kind: a.kind === 'heal' ? 'heal' : 'attack',
    attacker: attacker.name,
    target: target.name,
    actionName: a.name,
    ts: new Date().toISOString()
  };

  if (result.kind === 'attack') {
    var roll = Math.max(1, Math.min(20, parseInt(req.roll) || 1));
    var bonus = parseInt(a.bonus) || 0;
    var total = roll + bonus;
    var hit = roll === 20 ? true : roll === 1 ? false : total >= (target.ac || 10);
    result.roll = roll; result.bonus = bonus; result.total = total;
    result.targetAC = target.ac || 10; result.hit = hit; result.crit = roll === 20;
    if (hit) {
      var dmg = rollDiceExpr(a.dice);
      var amount = dmg.total;
      if (roll === 20) amount += rollDiceExpr(a.dice.replace(/[+-]\s*\d+$/, '')).total; // crit: double the dice, not the mod
      var prevHp = target.hp;
      target.hp = Math.max(0, target.hp - amount);
      result.amount = amount;
      if (typeof checkConcentration === 'function') checkConcentration(target, amount);
      combatLog.unshift({ round: currentRound || 0, text: '⚔ ' + attacker.name + ' hit ' + target.name + ' with ' + a.name + ' (' + roll + '+' + bonus + '=' + total + ' vs AC ' + result.targetAC + ') — ' + amount + ' dmg (' + prevHp + '→' + target.hp + ' HP)' + (roll === 20 ? ' CRIT!' : ''), type: 'damage', time: pvLogTime() });
      showToast('⚔ ' + attacker.name + ' hit ' + target.name + ' for ' + amount + (roll === 20 ? ' — CRIT!' : ''), 'success');
    } else {
      result.amount = 0;
      combatLog.unshift({ round: currentRound || 0, text: '⚔ ' + attacker.name + ' missed ' + target.name + ' with ' + a.name + ' (' + roll + '+' + bonus + '=' + total + ' vs AC ' + result.targetAC + ')', type: 'info', time: pvLogTime() });
      showToast('🛡 ' + attacker.name + ' missed ' + target.name, 'info');
    }
  } else {
    var heal = rollDiceExpr(a.dice);
    var prev = target.hp;
    target.hp = Math.min(target.maxHp, target.hp + heal.total);
    result.amount = target.hp - prev;
    result.hit = true;
    combatLog.unshift({ round: currentRound || 0, text: '❤ ' + attacker.name + ' healed ' + target.name + ' with ' + a.name + ' for ' + result.amount + ' (' + prev + '→' + target.hp + ' HP)', type: 'heal', time: pvLogTime() });
    showToast('❤ ' + attacker.name + ' healed ' + target.name + ' for ' + result.amount, 'success');
  }

  window.lastActionResult = result;
  if (combatLog.length > 200) combatLog.pop();
  if (typeof renderCombatLog === 'function') renderCombatLog();
  renderCombatants();
  if (typeof renderMap === 'function') renderMap();
  if (window.cloudSave) window.cloudSave();
}
