// ============================================================
// PARTY / PLAYER CHARACTERS
// ============================================================

// party array is initialized in app.js

// ══════════════════════════════════════════════════════════════
// SKILLS DATA & HELPERS
// ══════════════════════════════════════════════════════════════
var SKILL_LIST = [
  { key: 'acrobatics',      label: 'Acrobatics',      ability: 'dex' },
  { key: 'animal_handling',  label: 'Animal Handling',  ability: 'wis' },
  { key: 'arcana',          label: 'Arcana',           ability: 'int' },
  { key: 'athletics',       label: 'Athletics',        ability: 'str' },
  { key: 'deception',       label: 'Deception',        ability: 'cha' },
  { key: 'history',         label: 'History',          ability: 'int' },
  { key: 'insight',         label: 'Insight',          ability: 'wis' },
  { key: 'intimidation',    label: 'Intimidation',     ability: 'cha' },
  { key: 'investigation',   label: 'Investigation',    ability: 'int' },
  { key: 'medicine',        label: 'Medicine',         ability: 'wis' },
  { key: 'nature',          label: 'Nature',           ability: 'int' },
  { key: 'perception',      label: 'Perception',       ability: 'wis' },
  { key: 'performance',     label: 'Performance',      ability: 'cha' },
  { key: 'persuasion',      label: 'Persuasion',       ability: 'cha' },
  { key: 'religion',        label: 'Religion',         ability: 'int' },
  { key: 'sleight_of_hand', label: 'Sleight of Hand',  ability: 'dex' },
  { key: 'stealth',         label: 'Stealth',          ability: 'dex' },
  { key: 'survival',        label: 'Survival',         ability: 'wis' }
];

var _skillValues = {};

function buildSkillsGrid() {
  var grid = document.getElementById('pc-skills-grid');
  if (!grid) return;
  grid.innerHTML = SKILL_LIST.map(function(sk) {
    var val = _skillValues[sk.key] || 0;
    var icon = val === 0 ? '\u25CB' : val === 1 ? '\u25CF' : '\u2733';
    var color = val === 0 ? '#555' : val === 1 ? '#90c8ff' : '#ffe066';
    return '<div onclick="cycleSkill(\'' + sk.key + '\')" style="display:flex;align-items:center;gap:6px;padding:4px 6px;cursor:pointer;border-radius:4px;background:rgba(255,255,255,0.03);user-select:none;" title="' + sk.label + ' (' + sk.ability.toUpperCase() + ')">' +
      '<span style="font-size:16px;color:' + color + ';width:18px;text-align:center;">' + icon + '</span>' +
      '<span style="font-size:12px;color:' + (val > 0 ? '#d4b880' : '#777') + ';">' + sk.label + '</span>' +
      '<span style="font-size:9px;color:#555;margin-left:auto;">' + sk.ability.toUpperCase() + '</span>' +
    '</div>';
  }).join('');
}

function cycleSkill(key) {
  var cur = _skillValues[key] || 0;
  _skillValues[key] = (cur + 1) % 3;
  buildSkillsGrid();
}

function resetAllSkills() {
  _skillValues = {};
  buildSkillsGrid();
}

function collectSkillsFromGrid() {
  var skills = {};
  var hasAny = false;
  SKILL_LIST.forEach(function(sk) {
    var val = _skillValues[sk.key] || 0;
    skills[sk.key] = val;
    if (val > 0) hasAny = true;
  });
  return hasAny ? skills : {};
}

function populateSkillsGrid(skills) {
  _skillValues = {};
  if (skills) {
    SKILL_LIST.forEach(function(sk) {
      _skillValues[sk.key] = skills[sk.key] || 0;
    });
  }
  buildSkillsGrid();
}

function getSkillsSummary(skills) {
  if (!skills) return '';
  var prof = 0, exp = 0;
  SKILL_LIST.forEach(function(sk) {
    var v = skills[sk.key] || 0;
    if (v === 1) prof++;
    if (v === 2) { prof++; exp++; }
  });
  if (prof === 0) return '';
  return prof + ' skill' + (prof !== 1 ? 's' : '') + (exp > 0 ? ', ' + exp + ' expertise' : '');
}

function savePartyStorage() {
  localStorage.setItem('dm_party', JSON.stringify(party));
  if (window.cloudSave) window.cloudSave();
}

function useSpellSlot(pcId, slotIdx) {
  var pc = party.find(function(p) { return p.id === pcId; });
  if (!pc || !pc.spellSlots || !pc.spellSlots[slotIdx]) return;
  var slot = pc.spellSlots[slotIdx];
  if (slot.used >= slot.max) return;
  slot.used++;
  savePartyStorage();
  renderParty();
}

function restoreSpellSlot(pcId, slotIdx) {
  var pc = party.find(function(p) { return p.id === pcId; });
  if (!pc || !pc.spellSlots || !pc.spellSlots[slotIdx]) return;
  var slot = pc.spellSlots[slotIdx];
  if (slot.used <= 0) return;
  slot.used--;
  savePartyStorage();
  renderParty();
}

function restoreAllSlots(pcId) {
  var pc = party.find(function(p) { return p.id === pcId; });
  if (!pc || !pc.spellSlots) return;
  pc.spellSlots.forEach(function(s) { s.used = 0; });
  savePartyStorage();
  renderParty();
  showToast('✨ ' + pc.name + ' — all spell slots restored', 'success');
}

function autoFillSpellSlots() {
  var cls = document.getElementById('pc-class').value;
  var level = parseInt(document.getElementById('pc-level').value) || 1;
  var slots = getDefaultSlots(cls, level);
  for (var i = 1; i <= 9; i++) {
    var el = document.getElementById('pc-ss-' + i);
    if (!el) continue;
    var slot = slots ? slots[i - 1] : null;
    el.value = slot ? slot.max : '';
    el.style.opacity = slot ? '1' : '0.3';
  }
}

function togglePartyInspiration(id) {
  var pc = party.find(function(p) { return p.id === id; });
  if (!pc) return;
  pc.inspiration = !pc.inspiration;
  savePartyStorage();
  renderParty();
  showToast(pc.inspiration ? '★ ' + pc.name + ' has Inspiration!' : pc.name + ' — Inspiration spent', pc.inspiration ? 'success' : 'info');
}

// ══════════════════════════════════════════════════════════════
// PLAYER VIEW
// ══════════════════════════════════════════════════════════════
function openPlayerView() {
  if (!window.__fbUid) { showToast('Sign in first to use Player View', 'warn'); return; }
  var link = window.location.origin + '/player-view.html?dm=' + window.__fbUid;
  var existing = document.getElementById('pv-link-modal');
  if (existing) existing.remove();
  var m = document.createElement('div');
  m.id = 'pv-link-modal'; m.className = 'modal-overlay show'; m.style.zIndex = '2500';
  m.innerHTML = '<div class="modal" style="max-width:480px;width:95vw;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">' +
      '<h3 style="margin:0;font-family:Cinzel,serif;color:var(--gold);">👁 Player View</h3>' +
      '<button onclick="document.getElementById(\'pv-link-modal\').remove()" style="background:none;border:none;color:var(--text-dim);font-size:22px;cursor:pointer;">✕</button>' +
    '</div>' +
    '<div style="font-size:13px;color:var(--text-dim);margin-bottom:14px;font-family:Crimson Text,serif;">Share this link with your players. They can open it on their phone or laptop to see their character sheet, party status, and your messages in real time.</div>' +
    '<div style="display:flex;gap:6px;margin-bottom:16px;">' +
      '<input id="pv-link-input" readonly value="' + link + '" style="flex:1;font-size:12px;padding:10px;background:rgba(0,0,0,0.4);border:1px solid rgba(212,175,55,0.3);border-radius:5px;color:var(--parchment);font-family:monospace;" onclick="this.select()">' +
      '<button onclick="navigator.clipboard.writeText(document.getElementById(\'pv-link-input\').value).then(function(){showToast(\'Link copied!\',\'success\');})" style="padding:10px 16px;background:linear-gradient(135deg,var(--gold-dim),var(--gold));color:var(--ink);border:none;border-radius:5px;font-family:Cinzel,serif;font-size:12px;font-weight:bold;cursor:pointer;white-space:nowrap;">📋 Copy</button>' +
    '</div>' +
    '<div style="display:flex;gap:8px;">' +
      '<button onclick="window.open(\'' + link + '\',\'_blank\')" style="flex:1;padding:10px;background:rgba(100,180,255,0.1);border:1px solid rgba(100,180,255,0.3);border-radius:5px;color:#90c8ff;font-family:Cinzel,serif;font-size:11px;cursor:pointer;">🔗 Open Preview</button>' +
      '<button onclick="var w=window.open(\'\',\'_blank\',\'width=900,height=700\');w.document.write(buildPlayerViewHTML(window.__fbUid));w.document.close();" style="flex:1;padding:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:5px;color:var(--text-dim);font-family:Cinzel,serif;font-size:11px;cursor:pointer;">📺 Legacy Popup</button>' +
    '</div>' +
  '</div>';
  document.body.appendChild(m);
}

function buildPlayerViewHTML(uid) {
  return '<!DOCTYPE html>\n' +
'<html lang="en">\n' +
'<head>\n' +
'<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">\n' +
'<title>Party Status</title>\n' +
'<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Crimson+Text:ital,wght@0,400;1,400&display=swap" rel="stylesheet">\n' +
'<style>\n' +
'  html,body{margin:0;padding:0;background:#0d0804;color:#d4b880;font-family:\'Crimson Text\',serif;}\n' +
'  body{padding:16px;max-width:720px;margin:0 auto;}*{box-sizing:border-box;}\n' +
'  .card{background:linear-gradient(135deg,rgba(38,24,10,0.98),rgba(28,16,6,1));border:1px solid rgba(212,175,55,0.25);border-radius:8px;padding:16px;margin-bottom:12px;box-shadow:0 4px 20px rgba(0,0,0,0.5);}\n' +
'  .hp-bar-wrap{background:rgba(0,0,0,0.3);border-radius:3px;height:7px;margin-bottom:10px;overflow:hidden;}\n' +
'  .hp-bar{height:100%;border-radius:3px;transition:width 0.6s ease;}\n' +
'  .pip{display:inline-block;width:13px;height:13px;border-radius:50%;margin:1px;}\n' +
'  .msg-banner{border-radius:6px;padding:10px 14px;margin-bottom:10px;font-size:14px;line-height:1.5;}\n' +
'  .party-msg{background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.4);color:#ffe066;}\n' +
'  .personal-msg{background:rgba(100,180,255,0.1);border:1px solid rgba(100,180,255,0.4);color:#b8d8ff;}\n' +
'  .avatar{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:\'Cinzel\',serif;font-size:15px;font-weight:700;flex-shrink:0;border:2px solid rgba(255,255,255,0.15);}\n' +
'  .cond-tag{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:3px;font-size:11px;background:rgba(255,100,100,0.15);border:1px solid rgba(255,100,100,0.35);color:#ff9090;margin:2px 2px 2px 0;}\n' +
'  .rest-badge{display:inline-block;padding:2px 8px;border-radius:3px;font-size:10px;background:rgba(100,180,255,0.1);border:1px solid rgba(100,180,255,0.25);color:#90c8ff;margin-left:4px;vertical-align:middle;}\n' +
'</style>\n' +
'</head>\n' +
'<body>\n' +
'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid rgba(212,175,55,0.2);">\n' +
'  <div style="font-family:\'Cinzel\',serif;font-size:20px;font-weight:700;color:#d4a820;">Party Status</div>\n' +
'  <div id="pv-status" style="font-size:11px;color:#8fd050;font-family:\'Cinzel\',serif;">Connecting...</div>\n' +
'</div>\n' +
'<div id="pv-party-msg"></div>\n' +
'<div id="pv-main"><div style="text-align:center;color:#555;padding:40px 0;font-style:italic;">Loading...</div></div>\n' +
'<script type="module">\n' +
'  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";\n' +
'  import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";\n' +
'  const app = initializeApp({apiKey:"AIzaSyAHeoD6eKkxm7ezwvBcEt5W6S7nVqZYknY",authDomain:"dm-grimoire-20df0.firebaseapp.com",projectId:"dm-grimoire-20df0"});\n' +
'  const db = getFirestore(app);\n' +
'  const status = document.getElementById(\'pv-status\');\n' +
'  let first = true;\n' +
'  onSnapshot(doc(db, \'playerView\', \'' + uid + '\'), snap => {\n' +
'    if (!snap.exists()) { status.textContent = \'Waiting for DM...\'; return; }\n' +
'    const d = snap.data();\n' +
'    const pm = d.pvPartyMessage || \'\';\n' +
'    document.getElementById(\'pv-party-msg\').innerHTML = pm ? \'<div class="msg-banner party-msg">DM: \' + esc(pm) + \'</div>\' : \'\';\n' +
'    document.getElementById(\'pv-main\').innerHTML = renderAll(d);\n' +
'    status.textContent = (first ? \'Live \' : \'\') + new Date().toLocaleTimeString([],{hour:\'2-digit\',minute:\'2-digit\'});\n' +
'    first = false;\n' +
'  });\n' +
'  function esc(s){return String(s).replace(/&/g,\'&amp;\').replace(/</g,\'&lt;\').replace(/>/g,\'&gt;\');}\n' +
'  const AC=[\'#7b3a14\',\'#1e4d7a\',\'#3a6b47\',\'#6b2d5e\',\'#7a5c10\',\'#1d5e6b\',\'#6b3a1e\',\'#2d4e7a\'];\n' +
'  function avc(n){let h=0;for(const c of n)h=(h*31+c.charCodeAt(0))&0xffff;return AC[h%AC.length];}\n' +
'  function renderAll(d){\n' +
'    const p=d.party||[],c=d.combatants||[],m=d.pvMessages||{};\n' +
'    return renderParty(p,c,m)+renderInit(c,d.currentRound||0,d.combatActive||false)+renderInv(d.partyInventory||[]);\n' +
'  }\n' +
'  function renderParty(party,cmbs,msgs){\n' +
'    if(!party.length) return \'<div style="text-align:center;color:#555;padding:40px 0;">No party members yet</div>\';\n' +
'    return party.map(pc=>{\n' +
'      const cmb=cmbs.find(x=>x.name===pc.name&&x.type===\'ally\');\n' +
'      const cur=cmb?cmb.hp:pc.maxhp,max=cmb?cmb.maxHp:pc.maxhp;\n' +
'      const pct=Math.max(0,Math.min(100,(cur/(max||1))*100));\n' +
'      const hc=pct>50?\'#4caf50\':pct>25?\'#ff9800\':\'#f44336\';\n' +
'      const ini=pc.name.split(\' \').map(w=>w[0]).join(\'\').toUpperCase().slice(0,2);\n' +
'      const pm=msgs[pc.id]||msgs[String(pc.id)]||\'\';\n' +
'      const mh=pm?\'<div class="msg-banner personal-msg">DM: \'+esc(pm)+\'</div>\':\'\';\n' +
'      const conds=(cmb&&cmb.conditions||[]).map(c=>\'<span class="cond-tag">\'+esc(c)+\'</span>\').join(\'\');\n' +
'      const insp=pc.inspiration?\'<span style="padding:2px 8px;border-radius:3px;font-size:11px;background:rgba(255,215,0,0.18);border:1px solid rgba(255,215,0,0.5);color:#ffd700;margin:2px;">Inspired</span>\':\'\';\n' +
'      const rest=pc.lastRest?\'<span class="rest-badge">\'+(pc.lastRest===\'long\'?\'Long Rest\':\'Short Rest\')+\'</span>\':\'\';\n' +
'      const slots=(pc.spellSlots||[]).length?\'<div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.07);"><div style="font-size:10px;color:#555;margin-bottom:5px;">SPELL SLOTS</div>\'\n' +
'        +pc.spellSlots.map((sl,i)=>{const av=sl.max-sl.used,lv=[\'1st\',\'2nd\',\'3rd\',\'4th\',\'5th\',\'6th\',\'7th\',\'8th\',\'9th\'];\n' +
'          return \'<div style="display:flex;align-items:center;gap:5px;margin-bottom:2px;"><span style="font-size:9px;color:#555;width:22px;">\'+lv[i]+\'</span>\'\n' +
'            +Array.from({length:sl.max},(_,j)=>{const sp=j>=av;return \'<span class="pip" style="background:\'+(sp?\'rgba(255,255,255,0.07)\':\'rgba(100,180,255,0.65)\')+\';border:1px solid \'+(sp?\'rgba(255,255,255,0.12)\':\'rgba(100,180,255,0.9)\')+\';"></span>\';}).join(\'\')\n' +
'            +\'<span style="font-size:9px;color:\'+(av>0?\'#90c8ff\':\'#555\')+\'">\'+av+\'/\'+sl.max+\'</span></div>\';}).join(\'\')+\'</div>\':\'\';\n' +
'      return \'<div class="card">\'+mh\n' +
'        +\'<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:10px;">\'\n' +
'        +\'<div class="avatar" style="background:\'+avc(pc.name)+\';color:#fff;">\'+ini+\'</div>\'\n' +
'        +\'<div style="flex:1;"><div style="font-family:Cinzel,serif;font-size:17px;font-weight:700;color:#d4a820;">\'+esc(pc.name)+rest+\'</div>\'\n' +
'        +\'<div style="font-size:12px;color:#666;">\'+(pc.race?esc(pc.race)+\' \':\'\')+esc(pc.cls)+\' Lv\'+pc.level+(pc.player?\' - \'+esc(pc.player):\'\')+\'</div></div>\'\n' +
'        +\'<div style="text-align:right;"><div style="font-size:24px;font-weight:700;color:\'+hc+\';">\'+cur+\'<span style="font-size:13px;color:#555;">/\'+max+\'</span></div>\'\n' +
'        +\'<div style="font-size:10px;color:#555;">HP</div></div></div>\'\n' +
'        +\'<div class="hp-bar-wrap"><div class="hp-bar" style="width:\'+pct+\'%;background:\'+hc+\';"></div></div>\'\n' +
'        +\'<div style="display:flex;gap:5px;flex-wrap:wrap;"><span style="padding:3px 10px;border-radius:4px;font-size:11px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#888;">AC \'+(pc.ac||\'?\')+\'</span>\'\n' +
'        +conds+insp+\'</div>\'+slots+\'</div>\';\n' +
'    }).join(\'\');\n' +
'  }\n' +
'  function renderInit(cmbs,round,active){\n' +
'    if(!cmbs.length) return \'\';\n' +
'    return \'<div class="card"><div style="font-family:Cinzel,serif;font-size:12px;color:#555;margin-bottom:10px;">INITIATIVE - ROUND \'+round+\'</div>\'\n' +
'      +cmbs.map((c,i)=>{const ally=c.type===\'ally\',hp=Math.max(0,Math.min(100,(c.hp/(c.maxHp||1))*100));\n' +
'        const hc=hp>50?\'#4caf50\':hp>25?\'#ff9800\':\'#f44336\',cur=i===0&&active;\n' +
'        return \'<div style="display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:5px;margin-bottom:3px;background:\'+(cur?\'rgba(212,175,55,0.1)\':\'rgba(0,0,0,0.2)\')+\';border:1px solid \'+(cur?\'rgba(212,175,55,0.4)\':\'transparent\')+\'">\'\n' +
'          +\'<span style="font-size:15px;font-weight:700;color:#d4a820;width:26px;text-align:center;">\'+c.initiative+\'</span>\'\n' +
'          +\'<span style="font-size:13px;color:\'+(ally?\'#90c8ff\':\'#ff9090\')+\';flex:1;">\'+esc(c.name)+(cur?\' &lt;\':\'\')+\'</span>\'\n' +
'          +\'<div style="display:flex;align-items:center;gap:5px;"><div style="width:50px;height:4px;background:rgba(255,255,255,0.08);border-radius:2px;"><div style="height:100%;width:\'+hp+\'%;background:\'+hc+\'"></div></div>\'\n' +
'          +\'<span style="font-size:11px;color:\'+hc+\';">\'+c.hp+\'/\'+c.maxHp+\'</span></div></div>\';}).join(\'\')+\'</div>\';\n' +
'  }\n' +
'  function renderInv(inv){\n' +
'    if(!inv.length) return \'\';\n' +
'    return \'<div class="card"><div style="font-family:Cinzel,serif;font-size:12px;color:#555;margin-bottom:10px;">PARTY INVENTORY</div>\'\n' +
'      +inv.map(item=>\'<div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05);"><span style="font-size:18px;">\'+(item.icon||\'?\')+\'</span><div><div style="font-size:13px;color:#d4b880;">\'+esc(item.name)+\'</div>\'+(item.desc?\'<div style="font-size:11px;color:#555;">\'+esc(item.desc)+\'</div>\':\'\')+\'</div></div>\').join(\'\')+\'</div>\';\n' +
'  }\n' +
'<\/script></body></html>';
}

function sendPlayerMessage(pcId) {
  var pc = party.find(function(p) { return p.id === pcId; });
  if (!pc) return;
  if (!window.pvMessages) window.pvMessages = {};
  var msg = prompt('Message to ' + pc.name + ':', window.pvMessages[pcId] || '');
  if (msg === null) return;
  window.pvMessages[pcId] = msg;
  if (typeof saveSession === 'function') saveSession();
  showToast('Message sent to ' + pc.name, 'success');
}

function sendPartyMessage() {
  var msg = prompt('Message to entire party:', window.pvPartyMessage || '');
  if (msg === null) return;
  window.pvPartyMessage = msg;
  if (typeof saveSession === 'function') saveSession();
  showToast('Party message sent', 'success');
}

function renderParty() {
  var grid = document.getElementById('party-grid');
  if (!grid) return;
  if (party.length === 0) {
    grid.innerHTML = '<div class="party-empty"><div style="font-size:40px;margin-bottom:12px;">🧝</div><div style="font-size:16px;margin-bottom:6px;">No party members yet</div><div style="font-size:13px;">Click "+ Add Character" to add your players</div></div>';
    return;
  }
  grid.innerHTML = party.map(function(pc) {
    var mod = function(s) { return Math.floor((s - 10) / 2); };
    var fmt = function(n) { return n >= 0 ? '+' + n : '' + n; };
    var moves = (pc.moves || '').split('\n').filter(Boolean);
    var classColor = { Barbarian:'#c0392b', Bard:'#8e44ad', Cleric:'#f39c12', Druid:'#27ae60',
      Fighter:'#2980b9', Monk:'#16a085', Paladin:'#d4af37', Ranger:'#1abc9c',
      Rogue:'#7f8c8d', Sorcerer:'#c0392b', Warlock:'#8e44ad', Wizard:'#2980b9' }[pc.cls] || '#888';
    return '<div class="party-card" style="border-color:' + classColor + '33;">' +
      '<div style="position:absolute;top:0;left:0;right:0;height:3px;background:' + classColor + ';opacity:0.6;border-radius:8px 8px 0 0;"></div>' +
      '<div class="party-card-header">' +
        '<div>' +
          '<div class="party-card-name">' + pc.name + '</div>' +
          '<div class="party-card-class">' + pc.race + ' ' + pc.cls + ' · <span style="color:var(--text-dim);">played by ' + (pc.player || '?') + '</span></div>' +
        '</div>' +
        '<div class="party-level-badge">' + pc.level + '</div>' +
      '</div>' +
      '<div class="party-stats-row">' +
        ['STR','DEX','CON','INT','WIS','CHA'].map(function(s,i) {
          var val = [pc.str,pc.dex,pc.con,pc.int,pc.wis,pc.cha][i] || 10;
          return '<div class="party-stat"><div class="party-stat-val">' + fmt(mod(val)) + '</div><div class="party-stat-lbl">' + s + '</div></div>';
        }).join('') +
      '</div>' +
      '<div style="display:flex;gap:16px;font-size:12px;color:var(--text-dim);margin:6px 0;">' +
        '<span>❤ <strong style="color:var(--parchment);">' + pc.maxhp + '</strong> HP</span>' +
        '<span>🛡 <strong style="color:var(--parchment);">' + pc.ac + '</strong> AC</span>' +
        '<span>⚡ <strong style="color:var(--parchment);">' + fmt(pc.initBonus || 0) + '</strong> Init</span>' +
        (getSkillsSummary(pc.skills) ? '<span style="color:#90c8ff;">' + getSkillsSummary(pc.skills) + '</span>' : '') +
      '</div>' +
      (moves.length ? '<div class="party-moves"><div style="font-size:10px;font-family:Cinzel,serif;letter-spacing:0.1em;color:var(--text-dim);margin-bottom:4px;">ABILITIES</div>' + moves.slice(0,4).map(function(m) { var parts = m.split('—'); var name = parts[0]; var rest = parts.slice(1); return '<div class="party-move"><strong>' + name.trim() + '</strong>' + (rest.length ? ' — ' + rest.join('—') : '') + '</div>'; }).join('') + (moves.length > 4 ? '<div class="party-move" style="color:var(--text-dim);">+' + (moves.length - 4) + ' more...</div>' : '') + '</div>' : '') +
      (pc.spellSlots && pc.spellSlots.length ? '<div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.07);"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><div style="font-size:10px;font-family:Cinzel,serif;letter-spacing:0.1em;color:var(--text-dim);">SPELL SLOTS</div>' +
        (pc.cls === 'Warlock' ? '<span style="font-size:9px;color:#c8a0ff;font-family:Cinzel,serif;margin-right:4px;">Short Rest ↓</span>' : '<span style="font-size:9px;color:var(--text-dim);font-family:Cinzel,serif;margin-right:4px;">Long Rest ↓</span>') +
        '<button onclick="restoreAllSlots(' + pc.id + ')" style="font-size:9px;padding:2px 7px;background:' + (pc.cls === 'Warlock' ? 'rgba(180,100,255,0.15)' : 'rgba(100,180,255,0.1)') + ';border:1px solid ' + (pc.cls === 'Warlock' ? 'rgba(180,100,255,0.35)' : 'rgba(100,180,255,0.25)') + ';border-radius:3px;color:' + (pc.cls === 'Warlock' ? '#c8a0ff' : '#90c8ff') + ';cursor:pointer;font-family:Cinzel,serif;" title="' + (pc.cls === 'Warlock' ? 'Warlocks recover on Short Rest' : 'Recover on Long Rest') + '">↺</button></div>' +
        pc.spellSlots.map(function(slot, i) {
          var lvlNums = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th'];
          var available = slot.max - slot.used;
          var pips = Array.from({length: slot.max}, function(_, pipIdx) {
            var spent = pipIdx >= available;
            return '<span onclick="' + (spent ? 'restoreSpellSlot' : 'useSpellSlot') + '(' + pc.id + ',' + i + ')" style="display:inline-block;width:14px;height:14px;border-radius:50%;margin:1px;cursor:pointer;background:' + (spent ? 'rgba(255,255,255,0.08)' : 'rgba(100,180,255,0.7)') + ';border:1px solid ' + (spent ? 'rgba(255,255,255,0.15)' : 'rgba(100,180,255,0.9)') + ';box-shadow:' + (spent ? 'none' : '0 0 4px rgba(100,180,255,0.4)') + ';transition:all 0.15s;" title="' + (spent ? 'Click to restore' : 'Click to use') + '"></span>';
          }).join('');
          return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;"><span style="font-size:10px;color:var(--text-dim);width:28px;flex-shrink:0;">' + lvlNums[i] + '</span><div style="display:flex;flex-wrap:wrap;gap:1px;">' + pips + '</div><span style="font-size:10px;color:' + (available > 0 ? '#90c8ff' : 'var(--text-dim)') + ';">' + available + '/' + slot.max + '</span></div>';
        }).join('') + '</div>' : '') +
      '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:12px;">' +
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-wrap:wrap;">' +
          '<button onclick="togglePartyInspiration(' + pc.id + ')" style="padding:4px 10px;background:' + (pc.inspiration ? 'rgba(255,224,0,0.2)' : 'rgba(255,255,255,0.05)') + ';border:1px solid ' + (pc.inspiration ? 'rgba(255,224,0,0.5)' : 'rgba(255,255,255,0.1)') + ';border-radius:4px;color:' + (pc.inspiration ? '#ffe066' : 'var(--text-dim)') + ';font-size:12px;cursor:pointer;font-family:Cinzel,serif;letter-spacing:0.05em;" title="Toggle Inspiration">★ ' + (pc.inspiration ? 'INSPIRED' : 'Inspiration') + '</button>' +
        '</div>' +
        '<button class="add-to-init-btn" onclick="addPCToInitiative(' + pc.id + ')">⚔ Add to Initiative</button>' +
        '<button class="add-to-init-btn" style="right:auto;position:relative;bottom:auto;" onclick="editPlayer(' + pc.id + ')">✏ Edit</button>' +
        '<button class="add-to-init-btn" style="right:auto;position:relative;bottom:auto;background:rgba(80,160,40,0.15);border-color:rgba(80,160,40,0.4);color:#8fd050;" onclick="levelUp(' + pc.id + ')">⬆ Level Up</button>' +
        '<button class="add-to-init-btn" style="right:auto;position:relative;bottom:auto;color:var(--blood-light);border-color:rgba(139,26,26,0.4);" onclick="sendPlayerMessage(' + pc.id + ')" title="Message player">📨</button>' +
        '<button class="add-to-init-btn" style="right:auto;position:relative;bottom:auto;color:var(--blood-light);border-color:rgba(139,26,26,0.4);" onclick="deletePlayer(' + pc.id + ')">✕</button>' +
      '</div>' +
    '</div>';
  }).join('');

  // Update sidebar if open
  if (partySidebarOpen) renderSidebar();
}

function openAddPlayerModal() {
  document.getElementById('player-modal-title').textContent = '🧝 Add Character';
  document.getElementById('edit-player-id').value = '';
  ['name','player','race','moves'].forEach(function(f) { document.getElementById('pc-' + f).value = ''; });
  for (var i = 1; i <= 9; i++) { var el = document.getElementById('pc-ss-' + i); if (el) el.value = ''; }
  document.getElementById('pc-class').value = 'Fighter';
  document.getElementById('pc-level').value = 1;
  document.getElementById('pc-maxhp').value = '';
  document.getElementById('pc-ac').value = '';
  document.getElementById('pc-init-bonus').value = 0;
  ['str','dex','con','int','wis','cha'].forEach(function(s) { document.getElementById('pc-' + s).value = 10; });
  populateSkillsGrid({});
  document.getElementById('player-modal').classList.add('show');
}

function levelUp(id) {
  var pc = party.find(function(p) { return p.id === id; });
  if (!pc) return;
  var newLevel = (pc.level || 1) + 1;
  var conMod = Math.floor(((pc.con || 10) - 10) / 2);
  var hdMap = {Barbarian:12,Fighter:10,Paladin:10,Ranger:10,Monk:8,Bard:8,Cleric:8,Druid:8,Rogue:8,Warlock:8,Sorcerer:6,Wizard:6,Other:8};
  var hd = hdMap[pc.cls] || 8;
  var existing = document.getElementById('levelup-modal');
  if (existing) existing.remove();
  var m = document.createElement('div');
  m.id = 'levelup-modal'; m.className = 'modal-overlay show'; m.style.zIndex = '2500';
  m.innerHTML = '<div class="modal" style="max-width:400px;width:95vw;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">' +
      '<h3 style="margin:0;">⬆ Level Up — ' + pc.name + '</h3>' +
      '<button onclick="document.getElementById(\'levelup-modal\').remove()" style="background:none;border:none;color:var(--text-dim);font-size:22px;cursor:pointer;">✕</button>' +
    '</div>' +
    '<div style="background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.2);border-radius:6px;padding:12px;margin-bottom:14px;text-align:center;">' +
      '<div style="font-family:Cinzel,serif;font-size:22px;color:var(--gold);">Level ' + (pc.level || 1) + ' → ' + newLevel + '</div>' +
      '<div style="font-size:12px;color:var(--text-dim);margin-top:4px;">' + (pc.cls || 'Adventurer') + ' · ' + (pc.race || '') + '</div>' +
    '</div>' +
    '<div style="margin-bottom:14px;">' +
      '<label style="font-family:Cinzel,serif;font-size:10px;letter-spacing:0.15em;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:6px;">HP Roll (d' + hd + ', not including CON)</label>' +
      '<div style="display:flex;gap:8px;align-items:center;">' +
        '<input id="lu-hproll" type="number" min="1" max="' + hd + '" placeholder="Your d' + hd + ' roll" style="flex:1;font-size:20px;text-align:center;font-family:Cinzel,serif;font-weight:bold;color:#ffe066;">' +
        '<button onclick="document.getElementById(\'lu-hproll\').value=Math.floor(Math.random()*' + hd + ')+1;document.getElementById(\'lu-hproll\').style.color=\'#ffe066\';" style="padding:8px 12px;background:rgba(212,175,55,0.15);border:1px solid rgba(212,175,55,0.3);border-radius:4px;color:var(--gold);cursor:pointer;font-size:16px;">🎲</button>' +
      '</div>' +
      '<div style="font-size:11px;color:var(--text-dim);margin-top:6px;">CON mod (' + (conMod >= 0 ? '+' + conMod : conMod) + ') will be added automatically → Final HP gain shown after save</div>' +
    '</div>' +
    '<div style="margin-bottom:14px;">' +
      '<label style="font-family:Cinzel,serif;font-size:10px;letter-spacing:0.15em;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:6px;">Stat Changes (optional)</label>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">' +
        ['STR','DEX','CON','INT','WIS','CHA'].map(function(stat) {
          return '<div style="text-align:center;"><label style="font-size:10px;color:var(--text-dim);font-family:Cinzel,serif;">' + stat + '</label><input id="lu-' + stat.toLowerCase() + '" type="number" value="' + (pc[stat.toLowerCase()] || 10) + '" style="text-align:center;font-size:15px;"></div>';
        }).join('') +
      '</div>' +
    '</div>' +
    '<button onclick="commitLevelUp(' + id + ')" style="width:100%;padding:12px;background:linear-gradient(135deg,#5a8a20,#7ab830);color:white;border:none;border-radius:5px;font-family:Cinzel,serif;font-size:13px;font-weight:bold;cursor:pointer;letter-spacing:0.1em;">✨ LEVEL UP!</button>' +
  '</div>';
  document.body.appendChild(m);
  setTimeout(function() { var el = document.getElementById('lu-hproll'); if (el) el.focus(); }, 100);
}

function commitLevelUp(id) {
  var pc = party.find(function(p) { return p.id === id; });
  if (!pc) return;
  var rollEl = document.getElementById('lu-hproll');
  var roll = parseInt(rollEl ? rollEl.value : '') || 1;
  var conMod = Math.floor(((pc.con || 10) - 10) / 2);
  var hpGain = Math.max(1, roll + conMod);
  pc.level = (pc.level || 1) + 1;
  pc.maxhp = (pc.maxhp || 10) + hpGain;
  ['str','dex','con','int','wis','cha'].forEach(function(stat) {
    var el = document.getElementById('lu-' + stat);
    var v = parseInt(el ? el.value : '');
    if (!isNaN(v)) pc[stat] = v;
  });
  savePartyStorage();
  renderParty();
  var m = document.getElementById('levelup-modal'); if (m) m.remove();
  showToast('🎉 ' + pc.name + ' is now level ' + pc.level + '! +' + hpGain + ' HP (rolled ' + roll + ' + CON ' + (conMod >= 0 ? '+' + conMod : conMod) + ')', 'success');
}

function editPlayer(id) {
  var pc = party.find(function(p) { return p.id === id; });
  if (!pc) return;
  document.getElementById('player-modal-title').textContent = '✏ Edit Character';
  document.getElementById('edit-player-id').value = id;
  document.getElementById('pc-name').value = pc.name || '';
  document.getElementById('pc-player').value = pc.player || '';
  document.getElementById('pc-class').value = pc.cls || 'Fighter';
  document.getElementById('pc-race').value = pc.race || '';
  document.getElementById('pc-level').value = pc.level || 1;
  document.getElementById('pc-maxhp').value = pc.maxhp || '';
  document.getElementById('pc-ac').value = pc.ac || '';
  document.getElementById('pc-init-bonus').value = pc.initBonus || 0;
  document.getElementById('pc-str').value = pc.str || 10;
  document.getElementById('pc-dex').value = pc.dex || 10;
  document.getElementById('pc-con').value = pc.con || 10;
  document.getElementById('pc-int').value = pc.int || 10;
  document.getElementById('pc-wis').value = pc.wis || 10;
  document.getElementById('pc-cha').value = pc.cha || 10;
  document.getElementById('pc-moves').value = pc.moves || '';
  var existingSlots = pc.spellSlots || getDefaultSlots(pc.cls, pc.level) || [];
  for (var i = 1; i <= 9; i++) {
    var el = document.getElementById('pc-ss-' + i);
    if (!el) continue;
    var slot = existingSlots[i - 1];
    el.value = slot ? slot.max : '';
    el.style.opacity = slot ? '1' : '0.4';
  }
  populateSkillsGrid(pc.skills || {});
  document.getElementById('player-modal').classList.add('show');
}

// BUG FIX: Preserve dynamic fields (inspiration, exhaustion, lastRest) when editing
function savePlayer() {
  var editId = document.getElementById('edit-player-id').value;
  var existingPC = editId ? party.find(function(p) { return p.id === parseInt(editId); }) : null;

  var pc = {
    id: editId ? parseInt(editId) : uniqueId(),
    name: document.getElementById('pc-name').value.trim() || 'Unnamed',
    player: document.getElementById('pc-player').value.trim(),
    cls: document.getElementById('pc-class').value,
    race: document.getElementById('pc-race').value.trim(),
    level: parseInt(document.getElementById('pc-level').value) || 1,
    maxhp: parseInt(document.getElementById('pc-maxhp').value) || 10,
    ac: parseInt(document.getElementById('pc-ac').value) || 10,
    initBonus: parseInt(document.getElementById('pc-init-bonus').value) || 0,
    str: parseInt(document.getElementById('pc-str').value) || 10,
    dex: parseInt(document.getElementById('pc-dex').value) || 10,
    con: parseInt(document.getElementById('pc-con').value) || 10,
    int: parseInt(document.getElementById('pc-int').value) || 10,
    wis: parseInt(document.getElementById('pc-wis').value) || 10,
    cha: parseInt(document.getElementById('pc-cha').value) || 10,
    moves: document.getElementById('pc-moves').value,
    skills: collectSkillsFromGrid(),
    spellSlots: (function() {
      var cls = document.getElementById('pc-class').value;
      var level = parseInt(document.getElementById('pc-level').value) || 1;
      var customSlots = [];
      var hasCustom = false;
      for (var i = 1; i <= 9; i++) {
        var el = document.getElementById('pc-ss-' + i);
        if (el && el.value !== '') {
          hasCustom = true;
          customSlots.push({ max: parseInt(el.value) || 0, used: 0 });
        } else if (hasCustom) {
          break;
        }
      }
      if (hasCustom) return customSlots;
      var existingId = document.getElementById('edit-player-id').value;
      if (existingId) {
        var existing = party.find(function(p) { return p.id === parseInt(existingId); });
        if (existing && existing.spellSlots) return existing.spellSlots;
      }
      return getDefaultSlots(cls, level);
    })()
  };

  // BUG FIX: Preserve dynamic fields from existing player when editing
  if (existingPC) {
    if (existingPC.inspiration !== undefined) pc.inspiration = existingPC.inspiration;
    if (existingPC.exhaustion !== undefined) pc.exhaustion = existingPC.exhaustion;
    if (existingPC.lastRest !== undefined) pc.lastRest = existingPC.lastRest;
    // Preserve skills if not changed (empty skills from grid means no change when editing)
    if (!pc.skills || Object.keys(pc.skills).length === 0) {
      if (existingPC.skills) pc.skills = existingPC.skills;
    }
  }

  if (editId) {
    var idx = party.findIndex(function(p) { return p.id === parseInt(editId); });
    if (idx >= 0) party[idx] = pc;
  } else {
    party.push(pc);
  }
  savePartyStorage();
  renderParty();
  closePlayerModal();
}

function deletePlayer(id) {
  if (!confirm('Remove this character?')) return;
  party = party.filter(function(p) { return p.id !== id; });
  savePartyStorage();
  renderParty();
}

function closePlayerModal() {
  document.getElementById('player-modal').classList.remove('show');
}

function addPCToInitiative(id) {
  var pc = party.find(function(p) { return p.id === id; });
  if (!pc) return;
  var dexMod = Math.floor(((pc.dex || 10) - 10) / 2) + (pc.initBonus || 0);
  var sign = dexMod >= 0 ? '+' + dexMod : '' + dexMod;
  var roll = window.prompt('Initiative roll for ' + pc.name + ' (DEX mod ' + sign + '):\nEnter their d20 result (mod will be added), or leave blank to auto-roll.', '');
  var init;
  if (roll === null) return;
  var parsed = parseInt(roll);
  init = isNaN(parsed) ? Math.floor(Math.random() * 20) + 1 + dexMod : parsed + dexMod;
  init = Math.max(1, init);
  if (!combatants.find(function(x) { return x.name === pc.name && x.type === 'ally'; })) {
    combatants.push({id: uniqueId(), name: pc.name, init: init, hp: pc.maxhp || 20, maxHp: pc.maxhp || 20, ac: pc.ac || 14, type: 'ally', conditions: []});
    combatants.sort(function(a,b) { return b.init - a.init; });
    renderCombatants();
  }
  // Switch to initiative tab
  document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });
  document.getElementById('tab-initiative').classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelector('.nav-tab[onclick*="initiative"]').classList.add('active');
  showToast('⚔ ' + pc.name + ' added with initiative ' + init, 'success');
}

function addPartyToInitiative() {
  if (!party.length) { showToast('No party members! Add them in the Party tab first.', 'info'); return; }
  var existing = document.getElementById('init-roll-modal');
  if (existing) existing.remove();
  var modal = document.createElement('div');
  modal.id = 'init-roll-modal';
  modal.className = 'modal-overlay show';
  modal.style.zIndex = '2500';
  var rows = party.map(function(pc) {
    var dexMod = Math.floor(((pc.dex || 10) - 10) / 2) + (pc.initBonus || 0);
    var sign = dexMod >= 0 ? '+' + dexMod : '' + dexMod;
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.07);">' +
      '<input type="checkbox" id="ichk-' + pc.id + '" checked style="width:20px;height:20px;accent-color:var(--gold);cursor:pointer;flex-shrink:0;">' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-family:Cinzel,serif;font-size:14px;color:var(--gold);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + pc.name + '</div>' +
        '<div style="font-size:11px;color:var(--text-dim);">DEX mod ' + sign + '</div>' +
      '</div>' +
      '<input type="number" id="ival-' + pc.id + '" placeholder="d20 roll" min="1" max="30" style="width:80px;font-size:18px;font-family:Cinzel,serif;font-weight:bold;text-align:center;color:#ffe066;" onkeypress="if(event.key===\'Enter\')commitInitRolls()">' +
      '<button onclick="(function(){var d=' + dexMod + ';var r=Math.floor(Math.random()*20)+1;var el=document.getElementById(\'ival-' + pc.id + '\');el.value=r+d;el.style.color=\'#ffe066\';})()" style="padding:6px 9px;background:rgba(212,175,55,0.15);border:1px solid rgba(212,175,55,0.3);border-radius:4px;color:var(--gold);cursor:pointer;font-size:14px;">🎲</button>' +
    '</div>';
  }).join('');

  modal.innerHTML = '<div class="modal" style="max-width:440px;width:95vw;max-height:90vh;overflow-y:auto;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
      '<h3 style="margin:0;">⚔ Party Initiative</h3>' +
      '<button onclick="document.getElementById(\'init-roll-modal\').remove()" style="background:none;border:none;color:var(--text-dim);font-size:22px;cursor:pointer;line-height:1;">✕</button>' +
    '</div>' +
    '<div style="font-size:12px;color:var(--text-dim);margin-bottom:14px;">Enter each player\'s d20 roll (DEX mod auto-added), or tap 🎲 to roll for them. Uncheck anyone sitting this fight out.</div>' +
    rows +
    '<div style="display:flex;gap:8px;margin-top:16px;">' +
      '<button onclick="rollAllPartyInit()" style="flex:1;padding:10px;background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.3);border-radius:5px;color:var(--gold);font-family:Cinzel,serif;font-size:11px;letter-spacing:0.08em;cursor:pointer;">🎲 ROLL ALL</button>' +
      '<button onclick="commitInitRolls()" style="flex:2;padding:10px;background:linear-gradient(135deg,var(--gold-dim),var(--gold));color:var(--ink);border:none;border-radius:5px;font-family:Cinzel,serif;font-size:12px;font-weight:bold;cursor:pointer;letter-spacing:0.08em;">⚔ ADD TO INITIATIVE</button>' +
    '</div>' +
  '</div>';
  document.body.appendChild(modal);
  setTimeout(function() { var f = modal.querySelector('input[type=number]'); if (f) f.focus(); }, 100);
}

function rollAllPartyInit() {
  party.forEach(function(pc) {
    var dexMod = Math.floor(((pc.dex || 10) - 10) / 2) + (pc.initBonus || 0);
    var el = document.getElementById('ival-' + pc.id);
    if (el) { el.value = Math.floor(Math.random() * 20) + 1 + dexMod; el.style.color = '#ffe066'; }
  });
}

function commitInitRolls() {
  var added = 0;
  party.forEach(function(pc) {
    var chk = document.getElementById('ichk-' + pc.id);
    if (!chk || !chk.checked) return;
    var el = document.getElementById('ival-' + pc.id);
    var raw = parseInt(el ? el.value : '');
    var init = isNaN(raw) ? Math.floor(Math.random() * 20) + 1 + (pc.initBonus || 0) : raw;
    if (!combatants.find(function(x) { return x.name === pc.name && x.type === 'ally'; })) {
      combatants.push({id: uniqueId(), name: pc.name, init: init, hp: pc.maxhp || 20, maxHp: pc.maxhp || 20, ac: pc.ac || 14, type: 'ally', conditions: []});
      added++;
    }
  });
  combatants.sort(function(a,b) { return b.init - a.init; });
  renderCombatants();
  var m = document.getElementById('init-roll-modal'); if (m) m.remove();
  showToast('⚔ ' + added + ' party member' + (added !== 1 ? 's' : '') + ' added to initiative!', 'success');
}
