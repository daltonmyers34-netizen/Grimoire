// ============================================================
// DM COMBAT VIEW — full-screen combat mode, like the players get.
// Tabs: ⚔ Initiative | 🗺 Map | 💰 Loot. The initiative and map
// panels ADOPT the real sections (DOM move), so every existing
// control — HP, conditions, act menus, fog tools — keeps working.
// Plus: enemies carry drop loot that hits the field when they die.
// ============================================================

var combatViewOpen = false;
var cvActivePanel = 'map';
var battlefieldLoot = [];   // dropped by dead enemies, waiting for the party

// ─── Enter / exit ────────────────────────────────────────────
function enterCombatView() {
  if (combatViewOpen) return;
  combatViewOpen = true;
  var jb = document.getElementById('combat-jump-bar'); if (jb) jb.remove();

  var ov = document.createElement('div');
  ov.id = 'combat-view';
  ov.innerHTML =
    '<div class="cv-header">' +
      '<div class="cv-title">⚔ COMBAT</div>' +
      '<div class="cv-status" id="cv-status"></div>' +
      '<div class="cv-tabs">' +
        '<button class="cv-tab" id="cv-tabbtn-initiative" onclick="cvShowPanel(\'initiative\')">⚔ Initiative</button>' +
        '<button class="cv-tab" id="cv-tabbtn-map" onclick="cvShowPanel(\'map\')">🗺 Map</button>' +
        '<button class="cv-tab" id="cv-tabbtn-loot" onclick="cvShowPanel(\'loot\')">💰 Loot<span id="cv-loot-badge" class="cv-badge" style="display:none;"></span></button>' +
      '</div>' +
      '<button class="btn btn-gold btn-sm" onclick="nextTurn()">⏭ Next Turn</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="exitCombatView()">✕ Exit</button>' +
    '</div>' +
    '<div class="cv-body">' +
      '<div id="cv-slot-initiative" style="display:none;"></div>' +
      '<div id="cv-slot-map" style="display:none;"></div>' +
      '<div id="cv-slot-loot" style="display:none;"></div>' +
    '</div>';
  document.body.appendChild(ov);

  // Adopt the live sections — leave a placeholder so we can put them back
  ['tab-initiative', 'tab-map'].forEach(function(id) {
    var sec = document.getElementById(id);
    var ph = document.createElement('div');
    ph.id = 'cv-placeholder-' + id;
    ph.style.display = 'none';
    sec.parentNode.insertBefore(ph, sec);
    document.getElementById('cv-slot-' + (id === 'tab-map' ? 'map' : 'initiative')).appendChild(sec);
    sec.classList.add('active'); // visible inside its slot; the slot decides what shows
  });

  cvShowPanel('map');
  cvUpdateHeader();
}

function exitCombatView() {
  if (!combatViewOpen) return;
  combatViewOpen = false;
  ['tab-initiative', 'tab-map'].forEach(function(id) {
    var sec = document.getElementById(id);
    var ph = document.getElementById('cv-placeholder-' + id);
    if (sec && ph) { ph.parentNode.insertBefore(sec, ph); ph.remove(); }
    if (sec) sec.classList.remove('active');
  });
  var ov = document.getElementById('combat-view');
  if (ov) ov.remove();
  switchTab('initiative');
}

function cvShowPanel(name) {
  cvActivePanel = name;
  ['initiative', 'map', 'loot'].forEach(function(t) {
    var slot = document.getElementById('cv-slot-' + t);
    if (slot) slot.style.display = t === name ? '' : 'none';
    var btn = document.getElementById('cv-tabbtn-' + t);
    if (btn) btn.classList.toggle('active', t === name);
  });
  if (name === 'map' && typeof initMapTab === 'function') initMapTab();
  if (name === 'loot') renderCvLoot();
}

function cvUpdateHeader() {
  var el = document.getElementById('cv-status');
  if (!el) return;
  if (!combatActive) { el.innerHTML = '<span style="color:var(--text-dim);">Combat not started — hit ▶ Start Combat on the Initiative panel</span>'; return; }
  var cur = combatants[currentTurn];
  var next = combatants.length ? combatants[(currentTurn + 1) % combatants.length] : null;
  el.innerHTML = 'Round <strong style="color:var(--gold);">' + round + '</strong>' +
    (cur ? ' · Now: <strong style="color:' + (cur.type === 'enemy' ? '#ff9090' : '#8fd050') + ';">' + esc(cur.name) + '</strong> <span style="color:var(--text-dim);">(' + cur.hp + '/' + cur.maxHp + ')</span>' : '') +
    (next ? ' · Next: ' + esc(next.name) : '');
  var badge = document.getElementById('cv-loot-badge');
  if (badge) {
    var waiting = battlefieldLoot.reduce(function(n, e) {
      return n + e.items.filter(function(it, i) { return !e.given[i]; }).length + (e.gp && !e.gpGiven ? 1 : 0);
    }, 0);
    badge.style.display = waiting ? '' : 'none';
    badge.textContent = waiting;
  }
}

// ─── Drop loot: what an enemy's pockets hold ─────────────────
var CV_LOOT_THEMES = [
  { match: /wizard|mage|sorcer|warlock|necromancer|lich|apprentice|enchanter|conjurer|archmage/i,
    items: ['Spell scroll', 'Arcane focus (crystal)', 'Component pouch', 'Ink & quill', 'Spellbook (partially burned)'],
    rare: ['Wand of the war mage', 'Staff (arcane, unidentified)', 'Potion of Greater Healing'] },
  { match: /priest|cleric|acolyte|cult|fanatic|prophet/i,
    items: ['Holy symbol', 'Prayer beads', 'Healer\'s kit', 'Vial of holy water', 'Ritual candle'],
    rare: ['Potion of Greater Healing', 'Scroll of Revivify'] },
  { match: /bandit|thug|guard|soldier|mercenary|captain|knight|veteran|gladiator/i,
    items: ['Whetstone', 'Dice set (loaded)', 'Rations (2 days)', 'Rope (50 ft)', 'Stolen locket'],
    rare: ['Potion of Greater Healing', 'Well-made weapon (+1 to be identified)'] },
  { match: /goblin|kobold|orc|hobgoblin|gnoll|bugbear/i,
    items: ['Shiny trinket', 'Crude knife', 'Teeth on a string', 'Half-eaten rations', 'Someone else\'s boot'],
    rare: ['Stolen silver ring'] },
  { match: /wolf|bear|boar|spider|snake|rat|bat|lion|tiger|beast|dire/i,
    items: ['Pelt (sellable)', 'Fangs ×1d4', 'Claws'], rare: ['Pristine hide (fine leather)'], noCoins: true },
  { match: /noble|aristocrat|merchant|spy/i,
    items: ['Signet ring', 'Perfumed letter', 'Fine cloak', 'Silvered dagger'],
    rare: ['Gem (100 gp garnet)'] }
];

function cvCrNum(c) {
  var cr = c.cr;
  if (cr === undefined || cr === null || cr === '?' || cr === 'PC') {
    var hp = c.maxHp || 10;
    return hp < 15 ? 0.25 : hp < 30 ? 1 : hp < 60 ? 3 : hp < 110 ? 5 : 8;
  }
  if (typeof cr === 'string' && cr.indexOf('/') >= 0) {
    var p = cr.split('/'); return (parseInt(p[0]) || 1) / (parseInt(p[1]) || 2);
  }
  return parseFloat(cr) || 1;
}

function generateDropLoot(c) {
  var cr = cvCrNum(c);
  var theme = CV_LOOT_THEMES.find(function(t) { return t.match.test(c.name || ''); });
  var pick = function(arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  var items = [];

  // Their weapon: the first attack they actually have
  var weapon = (c.actions || []).find(function(a) { return a.kind !== 'heal' && a.dice; });
  if (weapon && Math.random() < 0.75) items.push(weapon.name);

  if (theme) {
    items.push(pick(theme.items));
    if (cr >= 2 && Math.random() < 0.5) items.push(pick(theme.items.filter(function(i) { return items.indexOf(i) < 0; })) || pick(theme.items));
    if (cr >= 4 && theme.rare.length && Math.random() < 0.35 + cr * 0.04) items.push(pick(theme.rare));
  }
  // Anyone humanoid-ish might carry a potion; the tougher, the likelier
  if (!(theme && theme.noCoins) && Math.random() < 0.25 + cr * 0.06) items.push('Potion of Healing');
  if (cr >= 3 && Math.random() < 0.2) items.push('Gem (10 gp)');

  var gp = (theme && theme.noCoins) ? 0 : Math.max(0, Math.round((Math.random() * 6 + 2) * (cr * 2.5 + 1)));
  return { items: items.filter(Boolean).slice(0, 4), gp: gp };
}

function cvRollLootFor(id) {
  var c = combatants.find(function(x) { return x.id === id; });
  if (!c) return;
  var l = generateDropLoot(c);
  c.loot = l.items;
  c.lootGp = l.gp;
  renderCvLoot();
  if (window.cloudSave) window.cloudSave();
}

function cvRollLootAll() {
  var n = 0;
  combatants.forEach(function(c) {
    if (c.type === 'enemy' && c.hp > 0 && !(c.loot && c.loot.length)) { var l = generateDropLoot(c); c.loot = l.items; c.lootGp = l.gp; n++; }
  });
  showToast('✨ Pockets filled for ' + n + ' ' + (n === 1 ? 'enemy' : 'enemies'), 'success');
  renderCvLoot();
  if (window.cloudSave) window.cloudSave();
}

function cvAddLootItem(id) {
  var c = combatants.find(function(x) { return x.id === id; });
  var inp = document.getElementById('cv-loot-add-' + id);
  if (!c || !inp || !inp.value.trim()) return;
  c.loot = c.loot || [];
  c.loot.push(inp.value.trim());
  inp.value = '';
  renderCvLoot();
  if (window.cloudSave) window.cloudSave();
}

function cvRemoveLootItem(id, idx) {
  var c = combatants.find(function(x) { return x.id === id; });
  if (!c || !c.loot) return;
  c.loot.splice(idx, 1);
  renderCvLoot();
  if (window.cloudSave) window.cloudSave();
}

function cvSetLootGp(id, val) {
  var c = combatants.find(function(x) { return x.id === id; });
  if (!c) return;
  c.lootGp = Math.max(0, parseInt(val) || 0);
  if (window.cloudSave) window.cloudSave();
}

// ─── Death → drops hit the field ─────────────────────────────
function cvCheckEnemyDrops() {
  combatants.forEach(function(c) {
    if (c.type !== 'enemy' || c.hp > 0 || c._dropped) return;
    if (!((c.loot && c.loot.length) || c.lootGp)) return;
    c._dropped = true;
    var entry = {
      id: (typeof uniqueId === 'function' ? uniqueId() : Date.now()),
      from: c.name,
      items: (c.loot || []).slice(),
      gp: c.lootGp || 0,
      given: {}, gpGiven: false
    };
    battlefieldLoot.push(entry);
    var summary = entry.items.concat(entry.gp ? [entry.gp + ' gp'] : []).join(', ');
    if (typeof logCombat === 'function') logCombat('💰 ' + c.name + ' drops: ' + summary, 'info');
    showToast('💰 ' + c.name + ' drops: ' + summary, 'success');
  });
}

// ─── The Loot panel ──────────────────────────────────────────
function renderCvLoot() {
  var slot = document.getElementById('cv-slot-loot');
  if (!slot) return;
  var enemies = combatants.filter(function(c) { return c.type === 'enemy'; });
  var pcOptions = party.map(function(p) { return '<option value="' + p.id + '">' + esc(p.name) + '</option>'; }).join('');

  var html = '<div class="panel" style="max-width:900px;margin:0 auto;">' +
    '<div class="panel-title"><span class="ornament">💰</span> Enemy Pockets <button class="btn btn-ghost btn-sm" style="margin-left:auto;" onclick="cvRollLootAll()">✨ Roll loot for all</button></div>';

  if (!enemies.length) html += '<div style="color:var(--text-dim);font-style:italic;padding:12px 0;">No enemies in the initiative order.</div>';
  enemies.forEach(function(c) {
    var dead = c.hp <= 0;
    html += '<div style="border:1px solid ' + (dead ? 'rgba(224,80,80,0.35)' : 'var(--border)') + ';border-radius:6px;padding:10px 12px;margin-bottom:8px;background:rgba(0,0,0,0.2);' + (dead ? 'opacity:0.75;' : '') + '">' +
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">' +
        '<strong style="color:' + (dead ? '#ff9090' : 'var(--parchment)') + ';">' + (dead ? '💀 ' : '') + esc(c.name) + '</strong>' +
        '<span style="font-size:11px;color:var(--text-dim);">CR ' + esc(String(c.cr || '?')) + ' · ' + c.hp + '/' + c.maxHp + ' HP</span>' +
        '<span style="flex:1;"></span>' +
        '<button class="btn btn-ghost btn-sm" onclick="cvRollLootFor(' + c.id + ')" title="Roll fresh pocket loot by CR and creature type">✨ ' + ((c.loot && c.loot.length) ? 'Re-roll' : 'Generate') + '</button>' +
      '</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">';
    (c.loot || []).forEach(function(it, i) {
      html += '<span class="cv-loot-chip">' + esc(it) + ' <span style="cursor:pointer;color:#ff9090;" onclick="cvRemoveLootItem(' + c.id + ',' + i + ')">✕</span></span>';
    });
    if (!(c.loot && c.loot.length)) html += '<span style="font-size:12px;color:var(--text-dim);font-style:italic;">empty pockets</span>';
    html += '</div>' +
      '<div style="display:flex;gap:6px;margin-top:8px;align-items:center;">' +
        '<input id="cv-loot-add-' + c.id + '" placeholder="Add item..." style="flex:1;font-size:12px;padding:5px 8px;" onkeypress="if(event.key===\'Enter\')cvAddLootItem(' + c.id + ')">' +
        '<button class="btn btn-ghost btn-sm" onclick="cvAddLootItem(' + c.id + ')">➕</button>' +
        '<span style="font-size:12px;color:#ffd700;">🪙</span>' +
        '<input type="number" min="0" value="' + (c.lootGp || 0) + '" style="width:70px;font-size:12px;padding:5px 6px;text-align:center;" onchange="cvSetLootGp(' + c.id + ',this.value)"> ' +
        '<span style="font-size:11px;color:var(--text-dim);">gp</span>' +
      '</div>' +
    '</div>';
  });
  html += '</div>';

  // Dropped on the field
  html += '<div class="panel" style="max-width:900px;margin:14px auto 0;">' +
    '<div class="panel-title"><span class="ornament">⚰</span> Dropped on the Field</div>';
  if (!battlefieldLoot.length) html += '<div style="color:var(--text-dim);font-style:italic;padding:12px 0;">Nothing yet — when an enemy with loot dies, it lands here.</div>';
  battlefieldLoot.slice().reverse().forEach(function(e) {
    html += '<div style="border:1px solid rgba(212,175,55,0.25);border-radius:6px;padding:10px 12px;margin-bottom:8px;background:rgba(212,175,55,0.04);">' +
      '<div style="font-size:12px;color:var(--text-dim);margin-bottom:6px;">from <strong style="color:#ff9090;">' + esc(e.from) + '</strong></div>';
    e.items.forEach(function(it, i) {
      var given = e.given[i];
      html += '<div style="display:flex;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);">' +
        '<span style="flex:1;font-size:13px;' + (given ? 'text-decoration:line-through;color:var(--text-dim);' : 'color:var(--parchment);') + '">' + esc(it) + '</span>' +
        (given ? '<span style="font-size:11px;color:#8fd050;">→ ' + esc(given) + '</span>'
               : '<select id="cv-give-' + e.id + '-' + i + '" style="font-size:11px;padding:3px 6px;width:130px;flex-shrink:0;">' + pcOptions + '</select>' +
                 '<button class="btn btn-gold btn-sm" onclick="cvGiveItem(\'' + e.id + '\',' + i + ')">Give</button>') +
      '</div>';
    });
    if (e.gp) {
      html += '<div style="display:flex;gap:8px;align-items:center;padding:6px 0;">' +
        '<span style="flex:1;font-size:13px;color:#ffd700;' + (e.gpGiven ? 'text-decoration:line-through;opacity:0.6;' : '') + '">🪙 ' + e.gp + ' gp</span>' +
        (e.gpGiven ? '<span style="font-size:11px;color:#8fd050;">→ ' + esc(e.gpGiven) + '</span>'
                   : '<select id="cv-givegp-' + e.id + '" style="font-size:11px;padding:3px 6px;width:160px;flex-shrink:0;"><option value="split">Split among party</option>' + pcOptions + '</select>' +
                     '<button class="btn btn-gold btn-sm" onclick="cvGiveGold(\'' + e.id + '\')">Give</button>') +
      '</div>';
    }
    html += '</div>';
  });
  html += '</div>';
  slot.innerHTML = html;
}

function cvGiveItem(lootId, idx) {
  var e = battlefieldLoot.find(function(x) { return String(x.id) === String(lootId); });
  var sel = document.getElementById('cv-give-' + lootId + '-' + idx);
  if (!e || !sel) return;
  var pc = party.find(function(p) { return p.id === parseInt(sel.value); });
  if (!pc) return;
  var name = e.items[idx];
  var item = { id: (typeof uniqueId === 'function' ? uniqueId() : Date.now()), name: name, qty: 1, slot: 'gear', equipped: false };
  var preset = (typeof itemPresetFor === 'function') ? itemPresetFor(name) : null;
  if (preset) { for (var k in preset) item[k] = preset[k]; }
  pc.inventory = pc.inventory || [];
  pc.inventory.push(item);
  if (typeof recomputePcCombat === 'function') recomputePcCombat(pc);
  e.given[idx] = pc.name;
  if (typeof logCombat === 'function') logCombat('🎁 ' + name + ' → ' + pc.name, 'info');
  showToast('🎁 ' + name + ' → ' + pc.name, 'success');
  renderCvLoot();
  cvUpdateHeader();
  if (window.cloudSave) window.cloudSave();
}

function cvGiveGold(lootId) {
  var e = battlefieldLoot.find(function(x) { return String(x.id) === String(lootId); });
  var sel = document.getElementById('cv-givegp-' + lootId);
  if (!e || !sel || !e.gp) return;
  if (sel.value === 'split') {
    var living = party.filter(function(p) { return true; });
    if (!living.length) return;
    var share = Math.floor(e.gp / living.length);
    living.forEach(function(p) { p.gold = (p.gold || 0) + share; });
    e.gpGiven = 'party (' + share + ' gp each)';
    showToast('🪙 ' + e.gp + ' gp split — ' + share + ' gp each', 'success');
  } else {
    var pc = party.find(function(p) { return p.id === parseInt(sel.value); });
    if (!pc) return;
    pc.gold = (pc.gold || 0) + e.gp;
    e.gpGiven = pc.name;
    showToast('🪙 ' + e.gp + ' gp → ' + pc.name, 'success');
  }
  renderCvLoot();
  cvUpdateHeader();
  if (window.cloudSave) window.cloudSave();
}

// ─── Keep the view in sync with combat ───────────────────────
// renderCombatants runs after every HP change / turn / condition —
// piggyback on it for death drops and live header/loot updates.
if (typeof renderCombatants === 'function') {
  var _cvOrigRenderCombatants = renderCombatants;
  renderCombatants = function() {
    _cvOrigRenderCombatants.apply(this, arguments);
    cvCheckEnemyDrops();
    if (combatViewOpen) {
      cvUpdateHeader();
      if (cvActivePanel === 'loot') renderCvLoot();
    }
  };
}
if (typeof endCombat === 'function') {
  var _cvOrigEndCombat = endCombat;
  endCombat = function() {
    _cvOrigEndCombat.apply(this, arguments);
    if (!combatViewOpen) return;
    // Spoils still on the field? Stay and hand them out before leaving.
    var waiting = battlefieldLoot.some(function(e) {
      return e.items.some(function(it, i) { return !e.given[i]; }) || (e.gp && !e.gpGiven);
    });
    if (waiting) {
      cvShowPanel('loot');
      showToast('💰 Combat over — hand out the spoils, then ✕ Exit', 'info');
    } else {
      exitCombatView();
    }
  };
}
