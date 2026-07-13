// ============================================================
// BOSS MECHANICS — legendary resistances, lair actions, phases
// ============================================================
// Config lives on the enemy combatant (set in the monster action editor):
//   c.legendaryResist = { max, left }   — spend to turn a failed save into a success
//   c.lairActions      = [ "text", ... ] — offered on initiative 20 (round start)
//   c.phases           = [ { pct, note, fired } ] — fire when HP crosses the threshold
// All boss state resets at startCombat (fresh encounter = fresh pools).

// ─── Legendary Resistance ────────────────────────────────────
// Call right after a save is resolved as FAILED for an enemy. Returns true
// if the DM spends a resistance (caller should then treat the save as passed).
function maybeLegendaryResist(c, ability) {
  if (!c || c.type === 'ally') return false;
  var lr = c.legendaryResist;
  if (!lr || (lr.left || 0) <= 0) return false;
  var use = confirm('🐉 ' + c.name + ' FAILED the ' + String(ability || '').toUpperCase() + ' save.\n\n' +
    'Spend a Legendary Resistance to succeed instead? (' + lr.left + ' left)');
  if (!use) return false;
  lr.left--;
  if (typeof logCombat === 'function') logCombat('🛡 ' + c.name + ' uses LEGENDARY RESISTANCE — the failed save succeeds (' + lr.left + ' left)', 'round');
  showToast('🛡 ' + c.name + ' — Legendary Resistance! (' + lr.left + ' left)', 'info');
  return true;
}

// ─── Reset on a fresh encounter ──────────────────────────────
function resetBossState() {
  combatants.forEach(function(c) {
    if (c.legendaryResist && c.legendaryResist.max) c.legendaryResist.left = c.legendaryResist.max;
    (c.phases || []).forEach(function(p) { p.fired = false; });
    c._lowHpSounded = false; // ambient boss-low cue re-arms for the new fight
  });
}

// ─── Lair Actions (initiative 20, once per round) ────────────
function checkLairActions() {
  if (!combatActive) return;
  var bosses = combatants.filter(function(c) {
    return c.hp > 0 && !c.hidden && c.lairActions && c.lairActions.length;
  });
  if (!bosses.length) return;
  // One prompt covering every lair present (usually just the one boss).
  var ov = document.createElement('div');
  ov.id = 'lair-action-modal';
  ov.className = 'modal-overlay show';
  ov.style.zIndex = '2680';
  var inner = '<div class="modal" style="max-width:520px;width:96%;">' +
    '<h3 style="font-family:Cinzel,serif;color:#c896ff;margin-bottom:4px;">🌋 Lair Action — Initiative 20</h3>' +
    '<div style="font-size:12px;color:var(--text-dim);margin-bottom:12px;">Round ' + round + '. The lair stirs. Pick one effect (or skip) — it resolves before anyone acts.</div>';
  bosses.forEach(function(b) {
    if (bosses.length > 1) inner += '<div style="font-size:11px;font-family:Cinzel,serif;color:#ff9090;margin:8px 0 4px;">' + esc(b.name) + '</div>';
    b.lairActions.forEach(function(la) {
      inner += '<button class="btn btn-ghost" style="display:block;width:100%;text-align:left;margin-bottom:6px;border-color:rgba(200,150,255,0.35);" ' +
        'onclick="triggerLairAction(' + b.id + ',\'' + encodeURIComponent(la) + '\')">🌋 ' + esc(la) + '</button>';
    });
  });
  inner += '<div class="modal-btns" style="margin-top:10px;">' +
    '<button class="btn btn-ghost" onclick="document.getElementById(\'lair-action-modal\').remove()">Skip this round</button>' +
    '</div></div>';
  ov.innerHTML = inner;
  ov.addEventListener('click', function(e) { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
}

function triggerLairAction(combatantId, encoded) {
  var c = combatants.find(function(x) { return x.id === combatantId; });
  var text = decodeURIComponent(encoded);
  if (typeof logCombat === 'function') logCombat('🌋 LAIR ACTION' + (c ? ' (' + c.name + ')' : '') + ': ' + text, 'round');
  showToast('🌋 Lair Action: ' + text, 'info');
  var m = document.getElementById('lair-action-modal');
  if (m) m.remove();
  if (window.cloudSave) window.cloudSave();
}

// ─── HP-threshold phase prompts ──────────────────────────────
// Fires when a boss's HP crosses at/below a phase threshold. Called from
// the renderCombatants wrapper, so it catches every HP change.
function checkBossPhases() {
  if (!combatActive) return;
  var fired = [];
  combatants.forEach(function(c) {
    if (c.type === 'ally' || c.hp <= 0 || !c.phases || !c.phases.length) return;
    var pct = (c.hp / (c.maxHp || 1)) * 100;
    c.phases.forEach(function(p) {
      if (!p.fired && pct <= p.pct) {
        p.fired = true;
        fired.push({ name: c.name, pct: p.pct, note: p.note });
        if (typeof logCombat === 'function') logCombat('🔥 ' + c.name + ' — PHASE (' + p.pct + '% HP): ' + p.note, 'round');
      }
    });
  });
  if (fired.length) {
    showPhaseBanner(fired);
    if (typeof dmSound === 'function') dmSound('bossPhase');
  }
}

function showPhaseBanner(fired) {
  var existing = document.getElementById('boss-phase-modal');
  if (existing) existing.remove();
  var ov = document.createElement('div');
  ov.id = 'boss-phase-modal';
  ov.className = 'modal-overlay show';
  ov.style.zIndex = '2690';
  var body = fired.map(function(f) {
    return '<div style="margin-bottom:10px;">' +
      '<div style="font-family:Cinzel,serif;font-size:15px;color:#ff9090;">' + esc(f.name) + ' · ' + f.pct + '% HP</div>' +
      '<div style="font-size:16px;color:var(--parchment);margin-top:4px;">' + esc(f.note) + '</div>' +
    '</div>';
  }).join('');
  ov.innerHTML = '<div class="modal" style="max-width:480px;width:94%;border:1px solid rgba(255,120,80,0.5);box-shadow:0 0 40px rgba(255,90,50,0.25);">' +
    '<h3 style="font-family:Cinzel,serif;color:#ff7040;margin-bottom:12px;letter-spacing:0.1em;">🔥 PHASE CHANGE</h3>' +
    body +
    '<div class="modal-btns" style="margin-top:8px;">' +
      '<button class="btn btn-blood" onclick="document.getElementById(\'boss-phase-modal\').remove()">Unleash it</button>' +
    '</div></div>';
  ov.addEventListener('click', function(e) { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
  if (typeof pvSound === 'function') { /* player-side only */ }
}

// ─── Parse config from the editor's textareas ────────────────
function parseLairActions(text) {
  return String(text || '').split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
}
function parsePhases(text) {
  return String(text || '').split('\n').map(function(line) {
    var m = line.match(/^\s*(\d+)\s*%?\s*[:\-]?\s*(.+?)\s*$/);
    if (!m) return null;
    return { pct: Math.max(1, Math.min(100, parseInt(m[1], 10))), note: m[2], fired: false };
  }).filter(Boolean);
}
