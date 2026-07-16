// ============================================================
// INITIATIVE / COMBAT TRACKER
// ============================================================

// combatLog declared in app.js

// Alias: currentRound mirrors the global `round` variable
// (kept in sync so code referencing either name works)
Object.defineProperty(window, 'currentRound', {
  get: function() { return round; },
  set: function(v) { round = v; },
  configurable: true
});

// Sync state to cloud/localStorage after any combat change
function syncCombatState() {
  // Catch-all: make sure every enemy carries a creature type (manual adds, AI-gen,
  // legacy saves) so slayer weapons and type effects always have something to key on.
  if (typeof inferCreatureType === 'function') {
    combatants.forEach(function(c) {
      if (c.type === 'enemy' && c.creatureType === undefined) c.creatureType = inferCreatureType(c.name);
    });
  }
  if (window.cloudSave) window.cloudSave();
}

function addCombatant() {
  var name = document.getElementById('new-name').value.trim();
  var init = parseInt(document.getElementById('new-init').value) || 0;
  var hp   = parseInt(document.getElementById('new-hp').value) || 10;
  var ac   = parseInt(document.getElementById('new-ac').value) || 10;
  var type = document.getElementById('new-type').value;
  if (!name) return;
  combatants.push({ id: uniqueId(), name: name, init: init, hp: hp, maxHp: hp, ac: ac, type: type, conditions: [] });
  combatants.sort(function(a,b) { return b.init - a.init; });
  document.getElementById('new-name').value = '';
  document.getElementById('new-init').value = '';
  document.getElementById('new-hp').value = '';
  document.getElementById('new-ac').value = '';
  renderCombatants();
  syncCombatState();
}

// Add a combatant from a monster database entry
function addCombatantFromDB(m) {
  var init = Math.floor(Math.random() * 20) + 1 + (m.initiative_bonus || 0);
  combatants.push({
    id: uniqueId(),
    name: m.name,
    init: Math.max(1, init),
    hp: parseInt(m.hp) || 10,
    maxHp: parseInt(m.hp) || 10,
    ac: parseInt(m.ac) || 10,
    type: m.type || 'enemy',
    conditions: [],
    creatureType: m.creatureType || (typeof inferCreatureType === 'function' ? inferCreatureType(m.name) : undefined),
    actions: m.actions || (typeof improvisedAttackFor === 'function' ? [improvisedAttackFor(m.name, m.cr)] : [])
  });
  combatants.sort(function(a,b) { return b.init - a.init; });
  renderCombatants();
  syncCombatState();
  showToast(m.name + ' added to initiative!', 'success');
}

// Inspiration is a POINT COUNT — the ★ button grants one; the badge / player spends one.
function toggleCombatantInspiration(id) {
  var c = combatants.find(function(x) { return x.id === id; });
  if (!c) return;
  c.inspiration = (parseInt(c.inspiration) || 0) + 1;
  var pc = party.find(function(p) { return p.name === c.name && c.type === 'ally'; });
  if (pc) { pc.inspiration = c.inspiration; savePartyStorage(); }
  renderCombatants();
  syncCombatState();
  if (typeof logCombat === 'function') logCombat('✨ ' + c.name + ' gains Inspiration (now ×' + c.inspiration + ')', 'heal');
  showToast('✨ ' + c.name + ' gains Inspiration! (×' + c.inspiration + ')', 'success');
}

function spendCombatantInspiration(id) {
  var c = combatants.find(function(x) { return x.id === id; });
  if (!c) return;
  var n = parseInt(c.inspiration) || 0;
  if (n <= 0) return;
  c.inspiration = n - 1;
  var pc = party.find(function(p) { return p.name === c.name && c.type === 'ally'; });
  if (pc) { pc.inspiration = c.inspiration; savePartyStorage(); }
  renderCombatants();
  syncCombatState();
  if (typeof logCombat === 'function') logCombat('✨ ' + c.name + ' spends Inspiration — advantage on a roll', 'info');
  showToast('✨ ' + c.name + ' spent Inspiration (' + c.inspiration + ' left)', 'info');
}

function togglePartyInspiration(id) {
  var pc = party.find(function(p) { return p.id === id; });
  if (!pc) return;
  pc.inspiration = (parseInt(pc.inspiration) || 0) + 1;
  var c = combatants.find(function(x) { return x.name === pc.name && x.type === 'ally'; });
  if (c) { c.inspiration = pc.inspiration; if (typeof renderCombatants === 'function') renderCombatants(); if (typeof syncCombatState === 'function') syncCombatState(); }
  savePartyStorage();
  renderParty();
  showToast('★ ' + pc.name + ' gains Inspiration! (×' + pc.inspiration + ')', 'success');
}

function setCombatantConc(id) {
  var c = combatants.find(function(x) { return x.id === id; });
  if (!c) return;
  if (c.concentrating) { var oldSpell = c.concentrating; c.concentrating = null; if (typeof dropLinkedConditions === 'function') dropLinkedConditions(c.name, oldSpell); renderCombatants(); syncCombatState(); showToast(c.name + ' dropped concentration', 'info'); return; }
  var spell = window.prompt(c.name + ' is concentrating on...', '');
  if (spell === null) return;
  c.concentrating = spell || 'a spell';
  renderCombatants();
  syncCombatState();
  showToast(c.name + ' concentrating on ' + c.concentrating, 'success');
}

// Check concentration on damage
function checkConcentration(c, damage) {
  if (!c.concentrating || damage <= 0) return;
  var dc = Math.max(10, Math.floor(damage / 2));
  var bonus = typeof saveBonusFor === 'function' ? saveBonusFor(c, 'con') : 0;
  var spell = c.concentrating;
  var resolve = function(roll) {
    var total = roll + bonus;
    if (total >= dc) {
      combatLog.unshift({ round: currentRound || 0, text: '🧠 ' + c.name + ' maintains concentration on "' + spell + '" (CON ' + roll + (bonus >= 0 ? '+' : '') + bonus + '=' + total + ' vs DC ' + dc + ')', type: 'info', time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) });
      showToast('🧠 ' + c.name + ' holds concentration on ' + spell + ' (' + total + ' vs DC ' + dc + ')', 'info');
    } else {
      c.concentrating = null;
      if (typeof dropLinkedConditions === 'function') dropLinkedConditions(c.name, spell);
      combatLog.unshift({ round: currentRound || 0, text: '💫 ' + c.name + ' LOSES concentration on "' + spell + '" (CON ' + total + ' vs DC ' + dc + ')', type: 'damage', time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) });
      showToast('💫 ' + c.name + ' loses concentration on ' + spell + '!', 'danger');
      renderCombatants();
      syncCombatState();
    }
    renderCombatLog();
  };
  if (typeof requestRolls === 'function') {
    requestRolls('🧠 Concentration — ' + c.name + ' holds "' + spell + '"?',
      [{ id: 'r', label: c.name + ' — CON save', sub: 'DC ' + dc + ' · bonus ' + (bonus >= 0 ? '+' : '') + bonus, adv: 0 }],
      function(results) { resolve(results.r || 10); });
  } else {
    resolve(Math.floor(Math.random() * 20) + 1);
  }
}

// Refill item charges on rest: a short rest refills only 'short'-recharge items;
// a long rest refills everything (short, long, and dawn items).
function restoreItemCharges(restType) {
  party.forEach(function(pc) {
    (pc.inventory || []).forEach(function(it) {
      if (!it.charges || typeof it.charges.max !== 'number') return;
      var per = it.charges.per || 'long';
      if (restType === 'long' || per === 'short') it.charges.left = it.charges.max;
    });
  });
}

function shortRest() {
  if (!party.length) { showToast('No party members to rest', 'info'); return; }
  var warlockCount = 0;
  party.forEach(function(pc) {
    // Warlocks recover all spell slots on short rest
    if (pc.cls === 'Warlock' && pc.spellSlots) {
      pc.spellSlots.forEach(function(s) { s.used = 0; });
      warlockCount++;
    }
    // Hit dice healing
    var hdMap = {Barbarian:12,Fighter:10,Paladin:10,Ranger:10,Monk:8,Bard:8,Cleric:8,Druid:8,Rogue:8,Warlock:8,Sorcerer:6,Wizard:6,Other:8};
    var hd = hdMap[pc.cls] || 8;
    var conMod = Math.floor(((pc.con || 10) - 10) / 2);
    var heal = Math.max(1, Math.floor(Math.random() * hd) + 1 + conMod);
    var cmb = combatants.find(function(x) { return x.name === pc.name && x.type === 'ally'; });
    if (cmb) { cmb.hp = Math.min(cmb.maxHp, cmb.hp + heal); }
    pc.lastRest = 'short';
  });
  combatants.forEach(function(c) { if (c.type === 'ally') { c.actionSurgeUsed = false; c.secondWindUsed = false; c.bardicUsed = false; } });
  restoreItemCharges('short');
  savePartyStorage();
  renderParty();
  renderCombatants();
  combatLog.unshift({round: currentRound || 0, text: '— Party took a Short Rest —', type: 'round', time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})});
  renderCombatLog();
  syncCombatState();
  var wlMsg = warlockCount ? ' — ' + warlockCount + ' Warlock slot' + (warlockCount > 1 ? 's' : '') + ' restored' : '';
  showToast('🌙 Short Rest — hit dice spent, HP restored' + wlMsg, 'success');
}

function longRest() {
  if (!confirm('Take a Long Rest? This will fully restore all party HP and spell slots.')) return;
  party.forEach(function(pc) {
    var cmb = combatants.find(function(x) { return x.name === pc.name && x.type === 'ally'; });
    if (cmb) { cmb.hp = cmb.maxHp; cmb.tempHp = 0; }
    // A long rest removes one level of exhaustion (5e RAW)
    pc.exhaustion = Math.max(0, (pc.exhaustion || 0) - 1);
    pc.lastRest = 'long';
    // Restore all spell slots
    if (pc.spellSlots) pc.spellSlots.forEach(function(sl) { sl.used = 0; });
    pc.usedSlots = {}; // legacy compat
  });
  combatants.forEach(function(c) { if (c.type === 'ally') { c.actionSurgeUsed = false; c.secondWindUsed = false; c.bardicUsed = false; } });
  // Also heal allies in combat
  combatants.filter(function(c) { return c.type === 'ally'; }).forEach(function(c) { c.hp = c.maxHp; });
  restoreItemCharges('long');
  savePartyStorage();
  renderParty();
  renderCombatants();
  combatLog.unshift({round: currentRound || 0, text: '— Party took a Long Rest — all HP and resources restored —', type: 'round', time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})});
  renderCombatLog();
  syncCombatState();
  showToast('☀ Long Rest complete — all HP and spell slots restored!', 'success');
}

// Edit initiative inline (second/correct definition — uses init-disp-{id})
function editInit(id) {
  var c = combatants.find(function(x) { return x.id === id; });
  if (!c) return;
  var el = document.getElementById('init-disp-' + id);
  if (!el) return;
  var old = c.init;
  var inp = document.createElement('input');
  inp.type = 'number'; inp.value = old;
  inp.style.cssText = 'width:50px;font-family:Cinzel,serif;font-size:18px;font-weight:bold;color:var(--gold);background:rgba(0,0,0,0.8);border:1px solid var(--gold);border-radius:3px;text-align:center;padding:2px;';
  el.parentNode.replaceChild(inp, el);
  inp.focus(); inp.select();
  function commit() {
    var v = parseInt(inp.value);
    c.init = isNaN(v) ? old : v;
    combatants.sort(function(a,b) { return b.init - a.init; });
    renderCombatants();
    syncCombatState();
  }
  inp.addEventListener('blur', commit);
  inp.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') inp.blur();
    if (e.key === 'Escape') { c.init = old; renderCombatants(); }
  });
}

// Edit HP inline
function editHP(id) {
  var c = combatants.find(function(x) { return x.id === id; });
  if (!c) return;
  var el = document.getElementById('hp-num-' + id);
  if (!el) return;
  var old = c.hp;
  var inp = document.createElement('input');
  inp.type = 'number'; inp.value = old;
  inp.style.cssText = 'width:50px;font-family:Cinzel,serif;font-size:13px;font-weight:bold;color:var(--text-primary);background:rgba(0,0,0,0.8);border:1px solid var(--gold);border-radius:3px;text-align:center;padding:2px;';
  el.innerHTML = '';
  el.appendChild(inp);
  inp.focus(); inp.select();
  function commit() {
    var v = parseInt(inp.value);
    c.hp = isNaN(v) ? old : Math.max(0, Math.min(c.maxHp, v));
    renderCombatants();
    syncCombatState();
  }
  inp.addEventListener('blur', commit);
  inp.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') inp.blur();
    if (e.key === 'Escape') { c.hp = old; renderCombatants(); }
  });
}

function commitInit(id, val) {
  var c = combatants.find(function(x) { return x.id === id; });
  if (!c) return;
  var n = parseInt(val);
  if (!isNaN(n)) c.init = n;
  combatants.sort(function(a,b) { return b.init - a.init; });
  renderCombatants();
  syncCombatState();
}

function addPreset(name, hp, ac, type) {
  var init = Math.floor(Math.random() * 20) + 1;
  combatants.push({ id: uniqueId(), name: name, init: init, hp: parseInt(hp), maxHp: parseInt(hp), ac: ac, type: type, conditions: [] });
  combatants.sort(function(a,b) { return b.init - a.init; });
  renderCombatants();
  syncCombatState();
}

function startCombat() {
  if (combatants.length === 0) return;
  combatActive = true;
  round = 1;
  currentTurn = 0;
  // Skip past anyone surprised (or otherwise unable to take a turn) at the top
  var guard = 0;
  while (combatants[currentTurn] && guard < combatants.length) {
    var first = combatants[currentTurn];
    if (round === 1 && first.surprised) {
      first.surprised = false;
      logCombat('😲 ' + first.name + ' is surprised — skips their first turn', 'info');
      currentTurn++; guard++;
      if (currentTurn >= combatants.length) { currentTurn = 0; round++; }
    } else break;
  }
  if (typeof resetBossState === 'function') resetBossState();
  if (typeof startTurnFor === 'function') startTurnFor(combatants[currentTurn]);
  updateRoundDisplay();
  renderCombatants();
  syncCombatState();
  if (typeof dmSound === 'function') dmSound('combatStart'); // war horn
  if (typeof checkLairActions === 'function') checkLairActions(); // initiative 20, round 1
  // Offer full-screen combat mode (unless it's already open)
  if (typeof combatViewOpen === 'undefined' || !combatViewOpen) {
    var bar = document.createElement('div');
    bar.id = 'combat-jump-bar';
    bar.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:5000;display:flex;gap:10px;align-items:center;background:linear-gradient(135deg,rgba(60,20,15,0.97),rgba(40,12,8,0.97));border:1px solid rgba(224,80,80,0.5);border-radius:10px;padding:12px 18px;box-shadow:0 8px 30px rgba(0,0,0,0.7);';
    bar.innerHTML = '<span style="font-family:Cinzel,serif;font-size:13px;color:#ffb0a0;">⚔ Combat started!</span>' +
      '<button class="btn btn-gold btn-sm" onclick="enterCombatView()">🎬 Enter Combat View</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="document.getElementById(\'combat-jump-bar\').remove();">Stay here</button>';
    document.body.appendChild(bar);
    setTimeout(function() { var b = document.getElementById('combat-jump-bar'); if (b) b.remove(); }, 12000);
  }
}

// BUG FIX: Added safety counter to prevent infinite loop if all combatants are hidden or dead
function nextTurn() {
  if (!combatActive || combatants.length === 0) return;
  var alive = combatants.filter(function(c) { return c.hp > 0 && !c.hidden; });
  if (alive.length === 0) return;

  // Outgoing combatant: repeat condition saves, tick durations (all auto)
  if (typeof endTurnProcessing === 'function' && combatants[currentTurn]) {
    endTurnProcessing(combatants[currentTurn]);
  }
  if (typeof clearPendingReaction === 'function') clearPendingReaction(); // reaction window closes

  var safety = 0;
  var maxIter = combatants.length;

  function skipInTurnOrder(c) {
    if (!c) return false;
    if (c.hidden) return true;
    // Surprised creatures lose their whole first turn (round 1 only)
    if (round === 1 && c.surprised) {
      c.surprised = false;
      logCombat('😲 ' + c.name + ' is surprised — skips their first turn', 'info');
      return true;
    }
    if (c.hp > 0) return false;
    // At 0 HP: dying ALLIES still take turns (death saves!) — dead/stable don't
    if (c.type === 'ally' && !c.isDead && (c.conditions || []).indexOf('Stable') < 0) return false;
    return true;
  }
  var prevRound = round;
  currentTurn++;
  if (currentTurn >= combatants.length) { currentTurn = 0; round++; }
  while (skipInTurnOrder(combatants[currentTurn])) {
    currentTurn++;
    if (currentTurn >= combatants.length) { currentTurn = 0; round++; }
    safety++;
    if (safety > maxIter) break; // prevent infinite loop
  }
  var roundAdvanced = round > prevRound;
  if (typeof startTurnFor === 'function') startTurnFor(combatants[currentTurn]);
  updateRoundDisplay();
  renderCombatants();
  syncCombatState();

  // New round → the lair stirs on initiative 20
  if (roundAdvanced && typeof checkLairActions === 'function') checkLairActions();

  // Downed ally's turn: prompt the DM for their death save
  // (skippable — they might be rolling on their own phone)
  var nowUp = combatants[currentTurn];
  if (nowUp && nowUp.type === 'ally' && nowUp.hp <= 0 && !nowUp.isDead &&
      (nowUp.conditions || []).indexOf('Stable') < 0 &&
      typeof requestRolls === 'function' && typeof applyDeathSaveRoll === 'function') {
    (function(dying) {
      requestRolls('💀 ' + dying.name + ' is dying — death save',
        [{ id: 'r', label: dying.name + ' — death save (raw d20)', sub: '✕ skip if they\'re rolling on their own phone', adv: 0, skippable: true }],
        function(results) {
          if (results.r === undefined) return; // skipped
          applyDeathSaveRoll(dying, results.r);
          renderCombatants();
          syncCombatState();
        });
    })(nowUp);
  }

  // Reset turn timer if active
  if (typeof turnTimerActive !== 'undefined' && turnTimerActive) {
    clearInterval(turnTimerInt);
    turnTimerSecs = 0;
    var ttv = document.getElementById('turn-timer-value');
    if (ttv) { ttv.textContent = '0s'; ttv.style.color = ''; }
    turnTimerInt = setInterval(function() {
      turnTimerSecs++;
      var valEl = document.getElementById('turn-timer-value');
      if (valEl) valEl.textContent = turnTimerSecs + 's';
      if (valEl && turnTimerSecs >= 45) valEl.style.color = '#e74c3c';
    }, 1000);
  }
}

// Go to the previous turn
function prevTurn() {
  if (!combatActive || combatants.length === 0) return;
  var alive = combatants.filter(function(c) { return c.hp > 0 && !c.hidden; });
  if (alive.length === 0) return;

  var safety = 0;
  var maxIter = combatants.length;

  currentTurn--;
  if (currentTurn < 0) {
    currentTurn = combatants.length - 1;
    if (round > 1) round--;
  }
  while (combatants[currentTurn] && (combatants[currentTurn].hp <= 0 || combatants[currentTurn].hidden)) {
    currentTurn--;
    if (currentTurn < 0) {
      currentTurn = combatants.length - 1;
      if (round > 1) round--;
    }
    safety++;
    if (safety > maxIter) break;
  }
  updateRoundDisplay();
  renderCombatants();
  syncCombatState();

  // Reset turn timer if active
  if (typeof turnTimerActive !== 'undefined' && turnTimerActive) {
    clearInterval(turnTimerInt);
    turnTimerSecs = 0;
    var ttv = document.getElementById('turn-timer-value');
    if (ttv) { ttv.textContent = '0s'; ttv.style.color = ''; }
    turnTimerInt = setInterval(function() {
      turnTimerSecs++;
      var valEl = document.getElementById('turn-timer-value');
      if (valEl) valEl.textContent = turnTimerSecs + 's';
      if (valEl && turnTimerSecs >= 45) valEl.style.color = '#e74c3c';
    }, 1000);
  }
}

// End combat and stop the timer
function endCombat() {
  // Victory fanfare if every enemy is down; a soft close otherwise
  if (typeof dmSound === 'function') {
    var hadEnemies = combatants.some(function (c) { return c.type === 'enemy'; });
    var livingEnemies = combatants.filter(function (c) { return c.type === 'enemy' && c.hp > 0 && !c.hidden; }).length;
    dmSound(hadEnemies && livingEnemies === 0 ? 'victory' : 'combatEnd');
  }
  combatActive = false;
  currentTurn = -1;
  round = 0;
  stopTurnTimer();
  document.getElementById('round-num').textContent = '0';
  document.getElementById('round-status').textContent = 'Combat Not Started';
  document.getElementById('turn-indicator').textContent = '';
  renderCombatants();
  syncCombatState();
  showToast('Combat ended.', 'info');
}

function resetCombat() {
  combatants = [];
  currentTurn = -1;
  round = 0;
  combatActive = false;
  stopTurnTimer();
  document.getElementById('round-num').textContent = '0';
  document.getElementById('round-status').textContent = 'Combat Not Started';
  document.getElementById('turn-indicator').textContent = '';
  renderCombatants();
  syncCombatState();
}

function updateRoundDisplay() {
  document.getElementById('round-num').textContent = round;
  document.getElementById('round-status').textContent = 'Active Combat';
  var cur = combatants[currentTurn];
  document.getElementById('turn-indicator').textContent = cur ? 'Current: ' + cur.name : '';
  var mapBar = document.getElementById('map-turn-indicator');
  if (mapBar) mapBar.textContent = combatActive ? ('R' + round + ' · ' + (cur ? cur.name : '')) : '';
}

function renderCombatants() {
  if (typeof ensureTokensPlaced === 'function') try { ensureTokensPlaced(); } catch(e) {}
  var list = document.getElementById('combatant-list');
  if (combatants.length === 0) {
    list.innerHTML = '<li class="empty-state"><div class="icon">⚔</div>No combatants yet. Add some above!</li>';
    return;
  }
  list.innerHTML = combatants.map(function(c, i) {
    var pct = Math.max(0, c.hp / c.maxHp * 100);
    var hpClass = pct > 50 ? '' : pct > 25 ? 'medium' : 'low';
    var isActive = combatActive && i === currentTurn;
    var isDead = c.hp <= 0;
    var nameClass = c.type === 'enemy' ? 'enemy' : c.type === 'ally' ? 'ally' : '';
    var conds = c.conditions.map(function(cond) {
      var rd = (c.condMeta && c.condMeta[cond] && typeof c.condMeta[cond].rounds === 'number') ? c.condMeta[cond].rounds : null;
      return '<span class="cond-badge" onclick="removeCondition(' + c.id + ',\'' + cond + '\')" title="Click to remove">' + cond + (rd !== null ? ' <span style="color:#e0a860;">' + rd + 'r</span>' : '') + ' ✕</span>';
    }).join('');
    var typeColor = c.type === 'enemy' ? '#c0392b' : c.type === 'ally' ? '#27ae60' : '#888';
    var inspN = parseInt(c.inspiration) || 0;
    var inspBadge = inspN > 0 ? '<span onclick="spendCombatantInspiration(' + c.id + ')" style="color:#ffe066;font-size:13px;margin-left:4px;cursor:pointer;" title="Inspiration ×' + inspN + ' — click to spend one">★' + (inspN > 1 ? '×' + inspN : '') + '</span>' : '';
    var concBadge = c.concentrating ? '<span style="background:rgba(100,50,200,0.2);border:1px solid rgba(150,80,255,0.4);color:#b080ff;font-size:9px;font-family:Cinzel,serif;border-radius:3px;padding:1px 5px;margin-left:4px;" title="' + c.concentrating + '">CONC</span>' : '';
    var buffBadges = (c.buffs || []).map(function(b) { return '<span style="font-size:11px;margin-left:3px;" title="' + esc(b.name) + ' (' + b.rounds + 'r)">' + (b.icon || '✨') + '</span>'; }).join('');
    var hiddenBadge = c.hidden ? '<span style="color:#888;font-size:10px;margin-left:4px;" title="Hidden from players">👁</span>' : '';
    var exLvl = (typeof exhaustionLevel === 'function') ? exhaustionLevel(c) : (c.exhaustion || 0);
    var exBadge = exLvl > 0 ? '<span style="background:rgba(180,120,40,0.2);border:1px solid rgba(210,150,60,0.5);color:#e0a860;font-size:9px;font-family:Cinzel,serif;border-radius:3px;padding:1px 5px;margin-left:4px;" title="Exhaustion — ' + ((typeof EXHAUSTION_TEXT !== "undefined") ? EXHAUSTION_TEXT[exLvl] : "") + '">😫 ' + exLvl + '</span>' : '';
    var surpriseBadge = c.surprised ? '<span style="background:rgba(255,180,80,0.2);border:1px solid rgba(255,180,80,0.5);color:#ffb450;font-size:9px;font-family:Cinzel,serif;border-radius:3px;padding:1px 5px;margin-left:4px;" title="Surprised — skips their first turn">😲 surprised</span>' : '';
    var hiddenStyle = c.hidden ? 'opacity:0.5;' : '';
    return '<li class="combatant ' + (isActive ? 'active-turn' : '') + ' ' + (isDead ? 'dead' : '') + '" data-id="' + c.id + '" style="border-left:3px solid ' + typeColor + '33;' + hiddenStyle + '">' +
      '<div class="combatant-init" onclick="editInit(' + c.id + ')" title="Tap to edit initiative" style="cursor:pointer;border-radius:4px;padding:3px;text-align:center;"><span id="init-disp-' + c.id + '">' + c.init + '</span></div>' +
      '<div>' +
        '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:2px;margin-bottom:3px;">' +
          '<span class="combatant-name ' + nameClass + '" style="font-size:16px;">' + c.name + (isActive ? ' ◀' : '') + '</span>' +
          inspBadge + concBadge + buffBadges + hiddenBadge + exBadge + surpriseBadge +
          '<span style="font-size:10px;font-family:Cinzel,serif;letter-spacing:0.04em;color:' + typeColor + ';margin-left:4px;opacity:0.8;">' + c.type.toUpperCase() + '</span>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
          '<div style="min-width:80px;">' +
            '<div class="hp-number-wrap" id="hp-num-' + c.id + '" style="color:' + (isDead ? 'var(--blood-light)' : 'var(--text-primary)') + ';font-family:Cinzel,serif;font-size:13px;font-weight:bold;">' +
              (isDead ? '💀 Down' : c.hp + ' / ' + c.maxHp) +
              ((c.tempHp > 0 && !isDead) ? ' <span style="color:#64c8ff;" title="Temporary HP">+' + c.tempHp + '🛡</span>' : '') +
            '</div>' +
            '<div class="combatant-hp-bar" style="width:90px;"><div class="combatant-hp-fill ' + hpClass + '" style="width:' + pct + '%"></div></div>' +
          '</div>' +
          '<div style="font-family:Cinzel,serif;font-size:13px;color:var(--text-secondary);white-space:nowrap;">🛡 ' + c.ac + '</div>' +
          (conds ? '<div style="display:flex;flex-wrap:wrap;gap:3px;">' + conds + '</div>' : '') +
        '</div>' +
        (c.readied ? '<div style="margin-top:4px;font-size:11px;color:#c8a8ff;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">⏳ Readied: <strong>' + esc(c.readied.action) + '</strong>' + (c.readied.trigger ? ' <span style="color:var(--text-dim);">when ' + esc(c.readied.trigger) + '</span>' : '') + '<button onclick="clearReadied(' + c.id + ')" style="font-size:10px;padding:1px 8px;border:1px solid rgba(150,110,230,0.5);background:rgba(120,90,200,0.15);color:#c8a8ff;border-radius:3px;cursor:pointer;">⚡ Trigger / clear</button></div>' : '') +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">' +
        '<div style="display:flex;gap:3px;">' +
          '<button onclick="dmOpenActMenu(' + c.id + ')" title="Act as this combatant (attacks/heals through the rules engine)" style="background:none;border:1px solid rgba(212,175,55,0.35);color:var(--gold);width:28px;height:28px;border-radius:3px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;">⚔</button>' +
          '<button onclick="openHPModal(' + c.id + ')" title="Modify HP" style="background:none;border:1px solid var(--border);color:var(--text-dim);width:28px;height:28px;border-radius:3px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;">❤</button>' +
          '<button onclick="openCondModal(' + c.id + ')" title="Add Condition" style="background:none;border:1px solid var(--border);color:var(--text-dim);width:28px;height:28px;border-radius:3px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;">⚡</button>' +
          '<button onclick="toggleCombatantInspiration(' + c.id + ')" title="Grant Inspiration (+1)" style="background:none;border:1px solid var(--border);color:' + (inspN > 0 ? '#ffe066' : 'var(--text-dim)') + ';width:28px;height:28px;border-radius:3px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;">★</button>' +
          '<button onclick="setCombatantConc(' + c.id + ')" title="Set Concentration" style="background:none;border:1px solid var(--border);color:' + (c.concentrating ? '#b080ff' : 'var(--text-dim)') + ';width:28px;height:28px;border-radius:3px;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;">C</button>' +
          '<button onclick="dmRequestCheck(' + c.id + ')" title="Ask for an ability/skill check" style="background:none;border:1px solid var(--border);color:var(--text-dim);width:28px;height:28px;border-radius:3px;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;">🎲</button>' +
          '<button onclick="toggleCombatantVisibility(' + c.id + ')" title="Toggle Visibility" style="background:none;border:1px solid var(--border);color:' + (c.hidden ? '#e74c3c' : 'var(--text-dim)') + ';width:28px;height:28px;border-radius:3px;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;">👁</button>' +
          '<button onclick="toggleSurprise(' + c.id + ')" title="Mark surprised — skips their first turn" style="background:none;border:1px solid var(--border);color:' + (c.surprised ? '#ffb450' : 'var(--text-dim)') + ';width:28px;height:28px;border-radius:3px;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;">😲</button>' +
          '<button class="del" onclick="removeCombatant(' + c.id + ')" title="Remove" style="background:none;border:1px solid var(--border);color:var(--text-dim);width:28px;height:28px;border-radius:3px;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;">✕</button>' +
        '</div>' +
      '</div>' +
    '</li>';
  }).join('');

  requestAnimationFrame(function() {
    document.querySelectorAll('.combatant[data-id]').forEach(function(li) {
      var cid = parseFloat(li.dataset.id);
      li.addEventListener('mouseenter', function(e) { showCombatantHoverCard(e, cid); });
      li.addEventListener('mouseleave', hideCombatantHoverCard);
      li.addEventListener('mousemove', function(e) {
        // Hide hover card when mouse moves over action buttons
        var tgt = e.target;
        var overButton = false;
        while (tgt && tgt.tagName !== 'LI') {
          if (tgt.tagName === 'BUTTON' || tgt.tagName === 'SELECT') { overButton = true; break; }
          tgt = tgt.parentElement;
        }
        var card = document.getElementById('combatant-hover-card');
        if (overButton) {
          hideCombatantHoverCard();
          return;
        }
        if (card && card.style.display !== 'none') {
          var x = e.clientX + 16;
          if (e.clientX + (card.offsetWidth || 280) + 20 > window.innerWidth) x = e.clientX - (card.offsetWidth || 280) - 10;
          card.style.left = x + 'px';
        }
      });
    });
  });
}

function openHPModal(id) {
  var amtEl = document.getElementById('hp-amount');
  if (amtEl) amtEl.value = '';
  hpTargetId = id;
  var c = combatants.find(function(x) { return x.id === id; });
  document.getElementById('modal-title').textContent = 'Modify HP — ' + c.name;
  document.getElementById('hp-amount').value = '';
  document.getElementById('hp-modal').classList.add('show');
  setTimeout(function() { document.getElementById('hp-amount').focus(); }, 50);
}

// BUG FIX: `type` parameter is properly used to determine damage vs heal
function applyHP(type) {
  var amount = parseInt(document.getElementById('hp-amount').value) || 0;
  var c = combatants.find(function(x) { return x.id === hpTargetId; });
  if (!c) return;
  if (!type) type = 'damage'; // default to damage if type is undefined
  var isDamage = type === 'damage';
  var prevHp = c.hp;
  var defNote = '';
  if (isDamage) {
    // Typed damage runs through the defenses pipeline (resist/immune/vuln)
    var dmgTypeEl = document.getElementById('hp-dmg-type');
    var dmgType = dmgTypeEl ? dmgTypeEl.value : '';
    if (typeof applyDamageWithDefenses === 'function') {
      var def = applyDamageWithDefenses(c, amount, dmgType);
      if (def.taken !== amount) defNote = ' (' + def.notes.join(', ') + ')';
      amount = def.taken;
    }
    if (typeof applyHpDamage === 'function') {
      var dd = applyHpDamage(c, amount, {});
      if (dd.notes.length) defNote += ' (' + dd.notes.join(', ') + ')';
    } else {
      c.hp = Math.max(0, c.hp - amount);
    }
  } else if (type === 'temp') {
    // Temporary HP — separate pool, doesn't stack (keep the higher)
    if (typeof grantTempHp === 'function') grantTempHp(c, amount);
    else c.tempHp = Math.max(c.tempHp || 0, amount);
  } else {
    c.hp = Math.min(c.maxHp, c.hp + amount);
  }
  if (isDamage && amount > 0) checkConcentration(c, amount);
  if (type === 'temp') {
    if (amount > 0) {
      var rt = window.currentRound || 0;
      combatLog.unshift({ round: rt || '—', text: c.name + ' gains ' + amount + ' temp HP (now ' + (c.tempHp || 0) + ')', type: 'heal', time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) });
      if (combatLog.length > 200) combatLog.pop();
      renderCombatLog();
      showToast('🛡 ' + c.name + ' — ' + (c.tempHp || 0) + ' temp HP', 'info');
    }
  } else if (amount > 0 || defNote) {
    var r = window.currentRound || 0;
    combatLog.unshift({ round: r || '—', text: isDamage ? c.name + ' took ' + amount + ' damage' + defNote + ' (' + prevHp + '→' + c.hp + ' HP)' : c.name + ' healed ' + amount + ' HP (' + prevHp + '→' + c.hp + ' HP)', type: isDamage ? 'damage' : 'heal', time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) });
    if (combatLog.length > 200) combatLog.pop();
    renderCombatLog();
    if (defNote) showToast('🛡 ' + c.name + ':' + defNote, 'info');
  }
  closeHPModal();
  renderCombatants();
  syncCombatState();
  // Animate after render
  requestAnimationFrame(function() {
    var numEl = document.getElementById('hp-num-' + c.id);
    if (numEl) {
      numEl.classList.remove('hp-damage-flash', 'hp-heal-flash');
      void numEl.offsetWidth;
      numEl.classList.add(isDamage ? 'hp-damage-flash' : 'hp-heal-flash');
    }
    // Floating number
    var li = document.querySelector('[data-id="' + c.id + '"]');
    if (li && amount > 0) {
      var rect = li.getBoundingClientRect();
      var floater = document.createElement('div');
      floater.className = 'hp-float ' + (isDamage ? 'damage' : 'heal');
      floater.textContent = (isDamage ? '-' : '+') + amount;
      floater.style.left = (rect.left + rect.width * 0.45) + 'px';
      floater.style.top  = (rect.top + window.scrollY + 4) + 'px';
      document.body.appendChild(floater);
      if (isDamage) {
        var drip = document.createElement('div');
        drip.className = 'blood-drip';
        li.style.position = 'relative';
        li.appendChild(drip);
        setTimeout(function() { drip.remove(); }, 900);
      }
      setTimeout(function() { floater.remove(); }, 1500);
    }
  });
}

// Renamed from closeModal to closeHPModal — delegates to the global closeModal
function closeHPModal() {
  closeModal('hp-modal');
}

function openCondModal(id) {
  condTargetId = id;
  renderDefenseChips();
  renderCondDurations();
  renderCondBuffs();
  renderExhaustionRow();
  document.getElementById('cond-modal').classList.add('show');
}

// Buff picker + active-buff list inside the condition modal
function renderCondBuffs() {
  var wrap = document.getElementById('cond-buffs');
  var c = combatants.find(function(x) { return x.id === condTargetId; });
  if (!wrap || !c) return;
  var lib = (typeof BUFF_LIBRARY !== 'undefined') ? BUFF_LIBRARY : {};
  var active = (c.buffs || []).map(function(b) {
    return '<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:4px;font-size:11px;background:rgba(120,200,120,0.12);border:1px solid rgba(120,200,120,0.4);color:#9fe09f;margin:2px;">' +
      (b.icon || '✨') + ' ' + esc(b.name) + ' <span style="color:#e0a860;">' + b.rounds + 'r</span>' +
      '<span onclick="removeCombatantBuff(\'' + b.name.replace(/'/g, "\\'") + '\')" style="cursor:pointer;color:#e08080;margin-left:2px;">✕</span></span>';
  }).join('');
  var chips = Object.keys(lib).map(function(name) {
    var b = lib[name];
    return '<button onclick="applyCombatantBuff(\'' + name.replace(/'/g, "\\'") + '\')" title="' + esc(b.desc || '') + '" style="font-size:11px;padding:3px 9px;border:1px solid var(--border);background:rgba(0,0,0,0.25);color:var(--parchment);border-radius:4px;cursor:pointer;margin:2px;">' + (b.icon || '✨') + ' ' + esc(name) + '</button>';
  }).join('');
  wrap.innerHTML =
    (active ? '<div style="margin-bottom:8px;">' + active + '</div>' : '') +
    '<div style="display:flex;flex-wrap:wrap;">' + chips + '</div>';
}
function applyCombatantBuff(name) {
  var c = combatants.find(function(x) { return x.id === condTargetId; });
  if (!c || typeof applyBuff !== 'function') return;
  applyBuff(c, name);
  renderCondBuffs();
}
function removeCombatantBuff(name) {
  var c = combatants.find(function(x) { return x.id === condTargetId; });
  if (!c || typeof removeBuff !== 'function') return;
  removeBuff(c, name);
  renderCondBuffs();
}

// Per-condition round timers — set a duration, it ticks down each turn end
function renderCondDurations() {
  var wrap = document.getElementById('cond-durations');
  var c = combatants.find(function(x) { return x.id === condTargetId; });
  if (!wrap || !c) return;
  var active = (c.conditions || []).filter(function(cond) {
    return ['Stable', 'Half Cover', '3/4 Cover'].indexOf(cond) < 0; // permanent-ish, skip
  });
  if (!active.length) { wrap.innerHTML = '<div style="font-size:11px;color:#555;">No active conditions to time.</div>'; return; }
  wrap.innerHTML = active.map(function(cond) {
    var rd = (c.condMeta && c.condMeta[cond] && typeof c.condMeta[cond].rounds === 'number') ? c.condMeta[cond].rounds : null;
    return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">' +
      '<span style="flex:1;font-size:12px;color:var(--parchment);">' + cond + '</span>' +
      '<button onclick="bumpCondRounds(\'' + cond.replace(/'/g, "\\'") + '\',-1)" style="width:22px;height:22px;border:1px solid var(--border);background:rgba(0,0,0,0.25);color:var(--text-dim);border-radius:3px;cursor:pointer;">−</button>' +
      '<span style="min-width:40px;text-align:center;font-size:12px;color:' + (rd !== null ? '#e0a860' : '#555') + ';">' + (rd !== null ? rd + 'r' : '∞') + '</span>' +
      '<button onclick="bumpCondRounds(\'' + cond.replace(/'/g, "\\'") + '\',1)" style="width:22px;height:22px;border:1px solid var(--border);background:rgba(0,0,0,0.25);color:var(--text-dim);border-radius:3px;cursor:pointer;">+</button>' +
      (rd !== null ? '<button onclick="clearCondRounds(\'' + cond.replace(/'/g, "\\'") + '\')" title="Remove timer" style="font-size:10px;padding:2px 6px;border:1px solid var(--border);background:none;color:#888;border-radius:3px;cursor:pointer;">∞</button>' : '') +
    '</div>';
  }).join('');
}

function bumpCondRounds(cond, delta) {
  var c = combatants.find(function(x) { return x.id === condTargetId; });
  if (!c) return;
  c.condMeta = c.condMeta || {};
  c.condMeta[cond] = c.condMeta[cond] || {};
  var cur = typeof c.condMeta[cond].rounds === 'number' ? c.condMeta[cond].rounds : 0;
  var next = Math.max(0, cur + delta);
  if (next === 0 && delta < 0) { delete c.condMeta[cond].rounds; }
  else c.condMeta[cond].rounds = next;
  renderCondDurations();
  renderCombatants();
  syncCombatState();
}

function clearCondRounds(cond) {
  var c = combatants.find(function(x) { return x.id === condTargetId; });
  if (!c || !c.condMeta || !c.condMeta[cond]) return;
  delete c.condMeta[cond].rounds;
  renderCondDurations();
  renderCombatants();
  syncCombatState();
}

function renderExhaustionRow() {
  var wrap = document.getElementById('exhaustion-row');
  var c = combatants.find(function(x) { return x.id === condTargetId; });
  if (!wrap || !c) return;
  var lvl = (typeof exhaustionLevel === 'function') ? exhaustionLevel(c) : (c.exhaustion || 0);
  var text = (typeof EXHAUSTION_TEXT !== 'undefined') ? EXHAUSTION_TEXT : ['', '', '', '', '', '', ''];
  var btns = '';
  for (var i = 0; i <= 6; i++) {
    var on = i === lvl;
    var danger = i === 6;
    btns += '<button onclick="setExhaustionLevel(' + i + ')" style="width:30px;height:30px;border-radius:4px;cursor:pointer;font-family:Cinzel,serif;font-size:13px;border:1px solid ' +
      (on ? (danger ? '#e05050' : 'var(--gold)') : 'rgba(255,255,255,0.12)') + ';background:' +
      (on ? (danger ? 'rgba(224,80,80,0.2)' : 'rgba(212,175,55,0.15)') : 'rgba(0,0,0,0.25)') + ';color:' +
      (on ? (danger ? '#ff8080' : 'var(--gold)') : '#888') + ';">' + i + '</button>';
  }
  wrap.innerHTML = '<div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap;">' + btns + '</div>' +
    (lvl > 0 ? '<div style="font-size:11px;color:' + (lvl >= 5 ? '#ff8080' : 'var(--text-dim)') + ';margin-top:6px;">Level ' + lvl + ': ' + esc(text[lvl]) +
      (lvl >= 2 ? ' <span style="color:#666;">(includes lower levels)</span>' : '') + '</div>' : '');
}

function setExhaustionLevel(level) {
  var c = combatants.find(function(x) { return x.id === condTargetId; });
  if (!c) return;
  level = Math.max(0, Math.min(6, level));
  c.exhaustion = level;
  // Keep the linked party sheet in sync (survives a long rest / persists)
  var pc = party.find(function(p) { return p.name === c.name && c.type === 'ally'; });
  if (pc) pc.exhaustion = level;
  // Level 4+ halves max HP — clamp current HP into the new ceiling
  if (typeof effectiveMaxHp === 'function') {
    var em = effectiveMaxHp(c);
    if (c.hp > em) c.hp = em;
  }
  // Level 6 is death
  if (level >= 6) {
    c.hp = 0;
    if (c.type === 'ally') c.isDead = true;
    logCombat('☠ ' + c.name + ' reaches exhaustion 6 — death', 'damage');
    showToast('☠ ' + c.name + ' dies of exhaustion', 'danger');
  } else if (level > 0) {
    logCombat('😫 ' + c.name + ' is at exhaustion level ' + level, 'info');
  }
  renderExhaustionRow();
  renderCombatants();
  syncCombatState();
}

// Defenses editor: resist / immune / vulnerable per damage type
function renderDefenseChips() {
  var wrap = document.getElementById('defense-chips');
  var c = combatants.find(function(x) { return x.id === condTargetId; });
  if (!wrap || !c) return;
  var types = (typeof DAMAGE_TYPES !== 'undefined') ? DAMAGE_TYPES : [];
  var rows = [
    { key: 'resist', label: 'RESIST', color: '#90c8ff' },
    { key: 'immune', label: 'IMMUNE', color: '#8fd050' },
    { key: 'vuln',   label: 'VULN',   color: '#ff9090' }
  ];
  wrap.innerHTML = rows.map(function(row) {
    var list = c[row.key] || [];
    return '<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-bottom:5px;">' +
      '<span style="font-size:9px;font-family:Cinzel,serif;letter-spacing:0.08em;color:' + row.color + ';width:52px;flex-shrink:0;">' + row.label + '</span>' +
      types.map(function(t) {
        var on = list.indexOf(t) >= 0;
        return '<button onclick="toggleDefense(\'' + row.key + '\',\'' + t + '\')" style="font-size:10px;padding:2px 7px;border-radius:3px;cursor:pointer;border:1px solid ' + (on ? row.color : 'rgba(255,255,255,0.12)') + ';background:' + (on ? row.color + '22' : 'rgba(0,0,0,0.25)') + ';color:' + (on ? row.color : '#666') + ';">' + t.slice(0, 5) + '</button>';
      }).join('') +
    '</div>';
  }).join('') + renderRevealRow(c);
}

function renderRevealRow(c) {
  var opts = [
    { key: 'acKnown',   label: 'AC',        on: !!c.acKnown },
    { key: 'defsKnown', label: 'Defenses',  on: !!c.defsKnown },
    { key: 'allKnown',  label: 'Everything', on: !!c.allKnown }
  ];
  return '<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08);">' +
    '<span style="font-size:9px;font-family:Cinzel,serif;letter-spacing:0.08em;color:var(--gold);width:52px;flex-shrink:0;" title="What players can see when they inspect this creature">👁 SEEN</span>' +
    opts.map(function(o) {
      return '<button onclick="toggleReveal(\'' + o.key + '\')" style="font-size:10px;padding:2px 8px;border-radius:3px;cursor:pointer;border:1px solid ' + (o.on ? 'var(--gold)' : 'rgba(255,255,255,0.12)') + ';background:' + (o.on ? 'rgba(212,175,55,0.15)' : 'rgba(0,0,0,0.25)') + ';color:' + (o.on ? 'var(--gold)' : '#666') + ';">' + o.label + '</button>';
    }).join('') +
    '<span style="font-size:9px;color:#555;margin-left:4px;">players also auto-learn AC + defenses by fighting</span>' +
  '</div>';
}

function toggleDefense(key, type) {
  var c = combatants.find(function(x) { return x.id === condTargetId; });
  if (!c) return;
  c[key] = c[key] || [];
  var idx = c[key].indexOf(type);
  if (idx >= 0) c[key].splice(idx, 1);
  else c[key].push(type);
  renderDefenseChips();
  renderCombatants();
  syncCombatState();
}

// Alias for openCondModal (spec compatibility)
function openConditionModal(id) {
  openCondModal(id);
}

function addCondition(cond) {
  var c = combatants.find(function(x) { return x.id === condTargetId; });
  if (!c) return;
  if (!c.conditions.includes(cond)) c.conditions.push(cond);
  renderCombatants();
  syncCombatState();
  closeCondModal();
}

// Toggle a condition on the currently targeted combatant
function toggleCondition(cond) {
  var c = combatants.find(function(x) { return x.id === condTargetId; });
  if (!c) return;
  var idx = c.conditions.indexOf(cond);
  if (idx >= 0) {
    c.conditions.splice(idx, 1);
  } else {
    c.conditions.push(cond);
  }
  renderCombatants();
  syncCombatState();
}

// Apply all selected conditions and close the modal
function applyConditions() {
  closeCondModal();
  renderCombatants();
  syncCombatState();
}

function removeCondition(id, cond) {
  var c = combatants.find(function(x) { return x.id === id; });
  if (!c) return;
  c.conditions = c.conditions.filter(function(x) { return x !== cond; });
  renderCombatants();
  syncCombatState();
}

function closeCondModal() {
  document.getElementById('cond-modal').classList.remove('show');
  condTargetId = null;
}

function removeCombatant(id) {
  combatants = combatants.filter(function(x) { return x.id !== id; });
  renderCombatants();
  syncCombatState();
}

// Toggle combatant visibility (hidden from players)
function toggleCombatantVisibility(id) {
  var c = combatants.find(function(x) { return x.id === id; });
  if (!c) return;
  c.hidden = !c.hidden;
  renderCombatants();
  syncCombatState();
  showToast(c.hidden ? c.name + ' hidden from players' : c.name + ' visible to players', 'info');
}

// Surprise: a marked creature loses its first turn (round 1). Mark before Start Combat.
function toggleSurprise(id) {
  var c = combatants.find(function(x) { return x.id === id; });
  if (!c) return;
  c.surprised = !c.surprised;
  renderCombatants();
  syncCombatState();
  showToast(c.surprised ? c.name + ' is surprised — will skip their first turn' : c.name + ' no longer surprised', 'info');
}

// Roll initiative for all combatants that don't have a manual initiative set
function rollInitiativeAll() {
  if (combatants.length === 0) { showToast('No combatants to roll for', 'info'); return; }
  combatants.forEach(function(c) {
    c.init = Math.floor(Math.random() * 20) + 1;
  });
  combatants.sort(function(a,b) { return b.init - a.init; });
  renderCombatants();
  syncCombatState();
  showToast('Initiative rolled for all combatants!', 'success');
}

// Quick add a monster by name (from MONSTER_DB if available)
function quickAddMonster() {
  var nameInput = document.getElementById('quick-monster-name');
  var name = nameInput ? nameInput.value.trim() : '';
  if (!name) { showToast('Enter a monster name', 'info'); return; }
  var db = window.MONSTER_DB || [];
  var match = db.find(function(m) { return m.name.toLowerCase() === name.toLowerCase(); });
  if (match) {
    addCombatantFromDB(match);
  } else {
    // Add generic monster
    var init = Math.floor(Math.random() * 20) + 1;
    combatants.push({ id: uniqueId(), name: name, init: init, hp: 10, maxHp: 10, ac: 10, type: 'enemy', conditions: [] });
    combatants.sort(function(a,b) { return b.init - a.init; });
    renderCombatants();
    syncCombatState();
    showToast(name + ' added (generic stats)', 'success');
  }
  if (nameInput) nameInput.value = '';
}

// Clear all combatants from the encounter
function clearEncounter() {
  if (combatants.length === 0) return;
  if (!confirm('Clear all combatants from the encounter?')) return;
  combatants = [];
  currentTurn = -1;
  round = 0;
  combatActive = false;
  stopTurnTimer();
  document.getElementById('round-num').textContent = '0';
  document.getElementById('round-status').textContent = 'Combat Not Started';
  document.getElementById('turn-indicator').textContent = '';
  renderCombatants();
  showToast('Encounter cleared.', 'info');
}

// ─── Turn Timer ──────────────────────────────────────────────
function toggleTurnTimer() {
  var btn = document.getElementById('turn-timer-btn');
  var disp = document.getElementById('turn-timer-display');
  turnTimerActive = !turnTimerActive;
  if (turnTimerActive) {
    startTurnTimer();
    if (disp) disp.style.display = 'block';
    if (btn) { btn.textContent = '⏱ Stop Timer'; btn.style.color = '#e74c3c'; }
  } else {
    stopTurnTimer();
    if (disp) disp.style.display = 'none';
    if (btn) { btn.textContent = '⏱ Turn Timer'; btn.style.color = ''; }
  }
}

function startTurnTimer() {
  clearInterval(turnTimerInt);
  turnTimerSecs = 0;
  var el = document.getElementById('turn-timer-value');
  if (el) { el.textContent = '0s'; el.style.color = ''; }
  turnTimerInt = setInterval(function() {
    turnTimerSecs++;
    var valEl = document.getElementById('turn-timer-value');
    if (valEl) valEl.textContent = turnTimerSecs + 's';
    if (valEl && turnTimerSecs >= 45) valEl.style.color = '#e74c3c';
  }, 1000);
}

function stopTurnTimer() {
  clearInterval(turnTimerInt);
  turnTimerInt = null;
  turnTimerSecs = 0;
  turnTimerActive = false;
  var el = document.getElementById('turn-timer-value');
  if (el) { el.textContent = '0s'; el.style.color = ''; }
}

// ─── Death Saves ─────────────────────────────────────────────
function toggleDeathSave(id, type, index) {
  var c = combatants.find(function(x) { return x.id === id; });
  if (!c) return;
  var key = type === 'success' ? 'deathSuccess' : 'deathFail';
  var current = c[key] || 0;
  c[key] = current > index ? index : index + 1;
  if (c.deathSuccess >= 3) {
    c.conditions = (c.conditions || []).filter(function(x) { return x !== 'Unconscious'; });
    c.conditions.push('Stable');
    c.deathSuccess = 0; c.deathFail = 0;
    showToast('⚕ ' + c.name + ' stabilized!', 'success');
  } else if (c.deathFail >= 3) {
    showToast('💀 ' + c.name + ' has died!', 'danger');
  }
  renderCombatants();
  syncCombatState();
}

// Toggle death saves display for a combatant
function toggleDeathSaves(id) {
  var c = combatants.find(function(x) { return x.id === id; });
  if (!c) return;
  c.showDeathSaves = !c.showDeathSaves;
  if (!c.deathSuccess) c.deathSuccess = 0;
  if (!c.deathFail) c.deathFail = 0;
  renderCombatants();
  syncCombatState();
}

// Roll a death save for a combatant
function rollDeathSave(id, type) {
  var c = combatants.find(function(x) { return x.id === id; });
  if (!c) return;
  var roll = Math.floor(Math.random() * 20) + 1;
  if (roll === 20) {
    // Nat 20 on death save: regain 1 HP
    c.hp = 1;
    c.deathSuccess = 0;
    c.deathFail = 0;
    showToast('🎉 ' + c.name + ' rolled a natural 20! Regains 1 HP!', 'success');
    combatLog.unshift({round: currentRound || 0, text: c.name + ' rolled natural 20 on death save — regains 1 HP!', type: 'heal', time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})});
  } else if (roll === 1) {
    // Nat 1: two failures
    c.deathFail = (c.deathFail || 0) + 2;
    showToast('💀 ' + c.name + ' rolled a natural 1! Two death save failures!', 'danger');
    combatLog.unshift({round: currentRound || 0, text: c.name + ' rolled natural 1 on death save — two failures!', type: 'damage', time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})});
  } else if (roll >= 10) {
    c.deathSuccess = (c.deathSuccess || 0) + 1;
    showToast(c.name + ' death save success (rolled ' + roll + ')', 'success');
    combatLog.unshift({round: currentRound || 0, text: c.name + ' death save success (rolled ' + roll + ')', type: 'info', time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})});
  } else {
    c.deathFail = (c.deathFail || 0) + 1;
    showToast(c.name + ' death save failure (rolled ' + roll + ')', 'danger');
    combatLog.unshift({round: currentRound || 0, text: c.name + ' death save failure (rolled ' + roll + ')', type: 'damage', time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})});
  }
  // Check for stabilize or death
  if (c.deathSuccess >= 3) {
    c.conditions = (c.conditions || []).filter(function(x) { return x !== 'Unconscious'; });
    c.conditions.push('Stable');
    c.deathSuccess = 0; c.deathFail = 0;
    showToast('⚕ ' + c.name + ' stabilized!', 'success');
  } else if (c.deathFail >= 3) {
    showToast('💀 ' + c.name + ' has died!', 'danger');
  }
  if (combatLog.length > 200) combatLog.pop();
  renderCombatLog();
  renderCombatants();
  syncCombatState();
}

// ─── AoE Damage ──────────────────────────────────────────────
function openAoEModal() {
  aoeSelected = new Set();
  var list = document.getElementById('aoe-target-list');
  if (!list) return;
  list.innerHTML = combatants.filter(function(c) { return !c.isDead && c.hp > 0; }).map(function(c) {
    return '<label class="aoe-target-item">' +
      '<input type="checkbox" data-id="' + c.id + '" onchange="aoeToggle(' + c.id + ', this.checked)">' +
      '<span style="color:' + (c.type === 'ally' ? '#2ecc71' : '#e05050') + '">' + (c.type === 'ally' ? '⚔' : '☠') + '</span>' +
      '<span>' + c.name + '</span>' +
      '<span class="target-hp">' + c.hp + '/' + c.maxHp + ' HP</span>' +
    '</label>';
  }).join('');
  var amtEl = document.getElementById('aoe-amount');
  if (amtEl) amtEl.value = '';
  openModal('modal-aoe');
}

function aoeToggle(id, checked) {
  if (checked) aoeSelected.add(id); else aoeSelected.delete(id);
}

// Alias for aoeToggle (spec compatibility)
function toggleAoETarget(id) {
  if (aoeSelected.has(id)) {
    aoeSelected.delete(id);
  } else {
    aoeSelected.add(id);
  }
  // Update checkbox state if present
  var cb = document.querySelector('#aoe-target-list input[data-id="' + id + '"]');
  if (cb) cb.checked = aoeSelected.has(id);
}

function aoeSelectAll(type) {
  var checkboxes = document.querySelectorAll('#aoe-target-list input[type=checkbox]');
  checkboxes.forEach(function(cb) {
    var id = parseInt(cb.dataset.id);
    var c  = combatants.find(function(x) { return x.id === id; });
    if (!c) return;
    var match = type === 'all' || type === 'none' ? true :
                type === 'enemy' ? c.type === 'enemy' : c.type === 'ally';
    cb.checked = type !== 'none' && match;
    if (cb.checked) aoeSelected.add(id); else aoeSelected.delete(id);
  });
}

function applyAoE() {
  var amt  = parseInt(document.getElementById('aoe-amount').value) || 0;
  var type = document.querySelector('input[name="aoe-type"]:checked').value;
  var dmgTypeEl = document.getElementById('aoe-dmg-type');
  var dmgType = dmgTypeEl ? dmgTypeEl.value : '';
  if (!amt || !aoeSelected.size) { closeModal('modal-aoe'); return; }
  var defNotes = [];
  aoeSelected.forEach(function(id) {
    var c = combatants.find(function(x) { return x.id === id; });
    if (!c) return;
    if (type === 'damage') {
      var taken = amt;
      if (typeof applyDamageWithDefenses === 'function') {
        var def = applyDamageWithDefenses(c, amt, dmgType);
        taken = def.taken;
        if (def.notes.length) defNotes.push(c.name + ': ' + def.notes.join(', '));
      }
      c.hp = Math.max(0, c.hp - taken);
      if (c.hp === 0) c.isDead = true;
      if (taken > 0) checkConcentration(c, taken);
    } else {
      c.hp = Math.min(c.maxHp, c.hp + amt);
      if (c.hp > 0) { c.isDead = false; c.deathSuccess = 0; c.deathFail = 0; }
    }
  });
  if (defNotes.length) {
    combatLog.unshift({ round: currentRound || 0, text: '💥 AoE ' + (dmgType || '') + ' damage — ' + defNotes.join(' · '), type: 'damage', time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) });
    renderCombatLog();
    showToast('🛡 Defenses applied: ' + defNotes.join(' · '), 'info');
  }
  renderCombatants();
  syncCombatState();
  showToast('💥 ' + (type === 'damage' ? 'Dealt' : 'Healed') + ' ' + amt + (dmgType ? ' ' + dmgType : '') + ' to ' + aoeSelected.size + ' target' + (aoeSelected.size > 1 ? 's' : ''), type === 'damage' ? 'danger' : 'success');
  closeModal('modal-aoe');
}

// Alias for applyAoE (spec compatibility)
function applyAoEDamage() {
  applyAoE();
}

// ============================================================
// BATTLE PRESETS
// ============================================================
function renderPresets() {
  var grid = document.getElementById('preset-grid');
  if (!grid) return;
  if (!battlePresets.length) {
    grid.innerHTML = '<div style="color:var(--text-dim);font-size:13px;padding:8px;">No presets saved yet. Build an encounter then click "Save Current as Preset".</div>';
    return;
  }
  grid.innerHTML = battlePresets.map(function(p,i) {
    return '<div class="preset-card" onclick="loadPreset(' + i + ')">' +
      '<div class="preset-card-name">' + p.name + '</div>' +
      '<div class="preset-card-meta">' + p.combatants.length + ' combatants</div>' +
      '<div style="margin-top:6px;font-size:10px;color:var(--text-dim);">' + p.combatants.map(function(c){return c.name;}).join(', ') + '</div>' +
      '<button onclick="event.stopPropagation();deletePreset(' + i + ')" style="margin-top:8px;font-size:10px;color:var(--blood-light);background:none;border:none;cursor:pointer;padding:0;">&#10005; Delete</button>' +
    '</div>';
  }).join('');
}

function openSavePresetModal() {
  if (!combatants.length) { alert('No combatants in tracker to save!'); return; }
  document.getElementById('preset-name').value = '';
  document.getElementById('preset-modal').classList.add('show');
}

function closePresetModal() { document.getElementById('preset-modal').classList.remove('show'); }

function savePreset() {
  var name = document.getElementById('preset-name').value.trim() || 'Unnamed Encounter';
  battlePresets.push({ name: name, combatants: combatants.map(function(c) { return Object.assign({}, c, {id: Date.now()}); }) });
  localStorage.setItem('dm_presets', JSON.stringify(battlePresets));
  renderPresets();
  closePresetModal();
}

function loadPreset(idx) {
  var p = battlePresets[idx];
  if (!p) return;
  if (combatants.length && !confirm('This will ADD these combatants to the current tracker. Continue?')) return;
  p.combatants.forEach(function(c) {
    var fresh = Object.assign({}, c, {id: Date.now(), init: Math.floor(Math.random()*20)+1});
    combatants.push(fresh);
  });
  combatants.sort(function(a,b) { return b.init - a.init; });
  renderCombatants();
  syncCombatState();
}

function deletePreset(idx) {
  battlePresets.splice(idx, 1);
  localStorage.setItem('dm_presets', JSON.stringify(battlePresets));
  renderPresets();
}

// ─── Combat Log ──────────────────────────────────────────────
function renderCombatLog() {
  var el = document.getElementById('combat-log-list');
  if (!el) return;
  if (!combatLog.length) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-dim);font-style:italic;font-size:13px;">No events yet — start combat to see the log</div>';
    return;
  }
  el.innerHTML = combatLog.slice(0, 100).map(function(e) {
    var col = e.type === 'damage' ? '#e74c3c' : e.type === 'heal' ? '#2ecc71' : e.type === 'round' ? 'var(--gold)' : 'var(--text-dim)';
    return '<div style="padding:5px 8px;border-bottom:1px solid rgba(255,255,255,0.04);display:flex;gap:8px;align-items:baseline;">' +
      '<span style="font-size:10px;color:var(--text-dim);white-space:nowrap;flex-shrink:0;">' + e.time + '</span>' +
      '<span style="font-size:10px;font-family:Cinzel,serif;color:rgba(212,175,55,0.5);flex-shrink:0;">R' + (e.round || '—') + '</span>' +
      '<span style="font-size:12px;color:' + col + ';">' + e.text + '</span>' +
    '</div>';
  }).join('');
}

// openEncounterModal and closeEncounterModal defined in ai.js

// ─── Encounter Difficulty Calculator ──────────────────────────
function calcEncounterDifficulty() {
  var THRESHOLDS = {1:[25,50,75,100],2:[50,100,150,200],3:[75,150,225,400],4:[125,250,375,500],5:[250,500,750,1100],6:[300,600,900,1400],7:[350,750,1100,1700],8:[450,900,1400,2100],9:[550,1100,1600,2400],10:[600,1200,1900,2800],11:[800,1600,2400,3600],12:[1000,2000,3000,4500],13:[1100,2200,3400,5100],14:[1250,2500,3800,5700],15:[1400,2800,4300,6400],16:[1600,3200,4800,7200],17:[2000,3900,5900,8800],18:[2100,4200,6300,9500],19:[2400,4900,7300,10900],20:[2800,5700,8500,12700]};
  var CR_XP = {0:10,'1/8':25,'1/4':50,'1/2':100,1:200,2:450,3:700,4:1100,5:1800,6:2300,7:2900,8:3900,9:5000,10:5900,11:7200,12:8400,13:10000,14:11500,15:13000,16:15000,17:18000,18:20000,19:22000,20:25000,21:33000,22:41000,23:50000,24:62000,25:75000,26:90000,27:105000,28:120000,29:135000,30:155000};
  var MULT = [1,1,1.5,2,2,2,2.5,2.5,3,3,4,4,5,5];

  var partyLevels = party.map(function(pc) { return pc.level || 1; });
  if (!partyLevels.length) { showToast('Add party members first!', 'info'); return; }

  var enemies = combatants.filter(function(c) { return c.type === 'enemy'; });
  if (!enemies.length) { showToast('Add enemies to the initiative tracker first!', 'info'); return; }

  var calcTotalXP = 0;
  enemies.forEach(function(e) {
    var known = (window.MONSTER_DB || []).find(function(m) { return m.name.toLowerCase() === e.name.toLowerCase(); });
    if (known) {
      calcTotalXP += CR_XP[known.cr] || 0;
    } else {
      var estCR = e.maxHp <= 6 ? 0 : e.maxHp <= 14 ? '1/8' : e.maxHp <= 28 ? '1/4' : e.maxHp <= 56 ? '1/2' : e.maxHp <= 84 ? 1 : e.maxHp <= 114 ? 2 : e.maxHp <= 149 ? 3 : e.maxHp <= 189 ? 4 : e.maxHp <= 224 ? 5 : Math.ceil((e.maxHp - 200) / 60) + 5;
      calcTotalXP += CR_XP[estCR] || (e.maxHp * 10);
    }
  });

  var mIdx = Math.min(enemies.length, MULT.length - 1);
  var adjusted = Math.round(calcTotalXP * MULT[mIdx]);

  var thresholds = [0, 0, 0, 0];
  partyLevels.forEach(function(lvl) {
    var t = THRESHOLDS[Math.min(lvl, 20)];
    thresholds.forEach(function(v, i) { thresholds[i] += t[i]; });
  });

  var diff = adjusted < thresholds[0] ? 'TRIVIAL' : adjusted < thresholds[1] ? 'EASY' : adjusted < thresholds[2] ? 'MEDIUM' : adjusted < thresholds[3] ? 'HARD' : 'DEADLY';
  showToast('Encounter: ' + diff + ' — ' + adjusted.toLocaleString() + ' adj XP (' + enemies.length + ' enem' + (enemies.length !== 1 ? 'ies' : 'y') + ', ' + partyLevels.length + ' PCs)', 'info', 5000);
  combatLog.unshift({round: currentRound || 0, text: 'Encounter difficulty: ' + diff + ' (' + adjusted.toLocaleString() + ' adj XP)', type: 'info', time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})});
  renderCombatLog();
}

// Alias for calcEncounterDifficulty (spec compatibility)
function calculateEncounterDifficulty() {
  calcEncounterDifficulty();
}

// ============================================================
// COMBATANT HOVER CARD
// ============================================================
// MONSTER_ACTIONS declared in data/monsters.js

// Default actions for unknown creatures
function getDefaultActions(c) {
  var type = c.type;
  if (type === 'ally') {
    var pc = party.find(function(p) { return p.name === c.name; });
    if (pc) {
      var actions = (pc.moves || '').split('\n').filter(Boolean).map(function(m) {
        var parts = m.split('—');
        var name = parts[0];
        var rest = parts.slice(1);
        return { name: name.trim(), text: rest.join('—').trim() || 'See character sheet.' };
      });
      return {
        cr: 'PC',
        actions: actions.length ? actions : [{name:'Attack',text:'Based on class and equipped weapons.'}],
        bonus: [{name:'Class Feature',text:'Check character sheet for bonus actions.'}],
        reactions: [{name:'Opportunity Attack',text:'When enemy leaves reach, make one melee attack.'}],
        traits: []
      };
    }
  }
  var hp = c.maxHp || 10;
  var atk = Math.floor((c.ac - 10) / 2) + 2;
  var dmg = Math.max(1, Math.floor(hp / 8));
  return {
    cr: '?',
    actions: [{name:'Attack',text:'+' + atk + ' to hit, reach 5 ft. Hit: ~' + dmg + ' damage.'}],
    bonus: [], reactions: [{name:'Opportunity Attack',text:'When enemy leaves reach, make one melee attack (reaction).'}],
    traits: []
  };
}

function showCombatantHoverCard(e, combatantId) {
  if (!e || !e.clientX) return; // mobile touch - skip
  // Don't show hover card when mouse is over action buttons
  var tgt = e.target;
  while (tgt && tgt.tagName !== 'LI') {
    if (tgt.tagName === 'BUTTON' || tgt.tagName === 'SELECT') return;
    tgt = tgt.parentElement;
  }
  clearTimeout(hoverCardTimeout);
  hoverCardTimeout = setTimeout(function() {
    try {
      var c = combatants.find(function(x) { return x.id === combatantId; });
      if (!c) return;

      // Find monster data
      var data = null;
      var keys = Object.keys(MONSTER_ACTIONS);
      for (var k = 0; k < keys.length; k++) {
        if (c.name.toLowerCase().includes(keys[k].toLowerCase())) { data = MONSTER_ACTIONS[keys[k]]; break; }
      }
      if (!data) data = getDefaultActions(c);

      // Populate card
      document.getElementById('hc-name').textContent = c.name;
      document.getElementById('hc-hp').textContent = c.hp + ' / ' + c.maxHp;
      document.getElementById('hc-ac').textContent = c.ac;
      document.getElementById('hc-init').textContent = c.init;
      var crEl = document.getElementById('hc-cr');
      crEl.textContent = data.cr ? 'CR ' + data.cr : '';
      crEl.className = data.cr ? 'hover-cr' : '';

      // Conditions
      if (c.conditions && c.conditions.length) {
        document.getElementById('hc-conditions-wrap').style.display = 'block';
        document.getElementById('hc-conditions').textContent = c.conditions.join(' · ');
      } else {
        document.getElementById('hc-conditions-wrap').style.display = 'none';
      }

      function renderActions(el, arr) {
        el.innerHTML = arr.map(function(a) {
          return '<div class="hover-action"><span class="hover-action-name">' + a.name + '.</span> ' + a.text + '</div>';
        }).join('') || '<div class="hover-action" style="color:var(--text-dim);">None</div>';
      }

      renderActions(document.getElementById('hc-actions'), data.actions || []);

      var bwrap = document.getElementById('hc-bonus-wrap');
      var rwrap = document.getElementById('hc-reactions-wrap');
      var twrap = document.getElementById('hc-traits-wrap');

      if (data.bonus && data.bonus.length) {
        bwrap.style.display = 'block';
        renderActions(document.getElementById('hc-bonus'), data.bonus);
      } else bwrap.style.display = 'none';

      if (data.reactions && data.reactions.length) {
        rwrap.style.display = 'block';
        renderActions(document.getElementById('hc-reactions'), data.reactions);
      } else rwrap.style.display = 'none';

      if (data.traits && data.traits.length) {
        twrap.style.display = 'block';
        renderActions(document.getElementById('hc-traits'), data.traits);
      } else twrap.style.display = 'none';

      // Position card
      var card = document.getElementById('combatant-hover-card');
      card.style.display = 'block';
      card.style.opacity = '0';
      setTimeout(function() {
        var cardW = card.offsetWidth, cardH = card.offsetHeight;
        var x = e.clientX + 16, y = e.clientY + window.scrollY - 20;
        if (e.clientX + cardW + 20 > window.innerWidth) x = e.clientX - cardW - 10;
        if (e.clientY + cardH > window.innerHeight) y = Math.max(0, e.clientY + window.scrollY - cardH);
        card.style.left = x + 'px';
        card.style.top = y + 'px';
        card.style.opacity = '1';
      }, 10);
    } catch(err) { console.warn('hover card', err); }
  }, 300);
}

function hideCombatantHoverCard() {
  clearTimeout(hoverCardTimeout);
  var card = document.getElementById('combatant-hover-card');
  if (card) { card.style.opacity = '0'; setTimeout(function() { card.style.display = 'none'; }, 150); }
}

// Render hover card content for a combatant (utility wrapper)
function renderHoverCard(c) {
  if (!c) return;
  var data = null;
  var keys = Object.keys(MONSTER_ACTIONS);
  for (var k = 0; k < keys.length; k++) {
    if (c.name.toLowerCase().includes(keys[k].toLowerCase())) { data = MONSTER_ACTIONS[keys[k]]; break; }
  }
  if (!data) data = getDefaultActions(c);

  document.getElementById('hc-name').textContent = c.name;
  document.getElementById('hc-hp').textContent = c.hp + ' / ' + c.maxHp;
  document.getElementById('hc-ac').textContent = c.ac;
  document.getElementById('hc-init').textContent = c.init;
  var crEl = document.getElementById('hc-cr');
  crEl.textContent = data.cr ? 'CR ' + data.cr : '';

  if (c.conditions && c.conditions.length) {
    document.getElementById('hc-conditions-wrap').style.display = 'block';
    document.getElementById('hc-conditions').textContent = c.conditions.join(' · ');
  } else {
    document.getElementById('hc-conditions-wrap').style.display = 'none';
  }

  function renderActions(el, arr) {
    el.innerHTML = arr.map(function(a) {
      return '<div class="hover-action"><span class="hover-action-name">' + a.name + '.</span> ' + a.text + '</div>';
    }).join('') || '<div class="hover-action" style="color:var(--text-dim);">None</div>';
  }

  renderActions(document.getElementById('hc-actions'), data.actions || []);
  var bwrap = document.getElementById('hc-bonus-wrap');
  var rwrap = document.getElementById('hc-reactions-wrap');
  var twrap = document.getElementById('hc-traits-wrap');
  if (data.bonus && data.bonus.length) { bwrap.style.display = 'block'; renderActions(document.getElementById('hc-bonus'), data.bonus); } else bwrap.style.display = 'none';
  if (data.reactions && data.reactions.length) { rwrap.style.display = 'block'; renderActions(document.getElementById('hc-reactions'), data.reactions); } else rwrap.style.display = 'none';
  if (data.traits && data.traits.length) { twrap.style.display = 'block'; renderActions(document.getElementById('hc-traits'), data.traits); } else twrap.style.display = 'none';
}
