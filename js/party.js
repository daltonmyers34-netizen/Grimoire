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

function getProfBonus(level) {
  if (level >= 17) return 6;
  if (level >= 13) return 5;
  if (level >= 9) return 4;
  if (level >= 5) return 3;
  return 2;
}

function buildSkillsCardHTML(pc) {
  if (!pc.skills) return '';
  var abilityMap = {};
  SKILL_LIST.forEach(function(sk) { abilityMap[sk.key] = sk.ability; });
  var profBonus = getProfBonus(pc.level || 1);
  var mod = function(s) { return Math.floor((s - 10) / 2); };
  var fmt = function(n) { return n >= 0 ? '+' + n : '' + n; };
  var profSkills = [];
  SKILL_LIST.forEach(function(sk) {
    var val = pc.skills[sk.key] || 0;
    if (val === 0) return;
    var ability = sk.ability;
    var abilityScore = pc[ability] || 10;
    var bonus = mod(abilityScore) + profBonus * val;
    var icon = val === 2 ? '★' : '●';
    var color = val === 2 ? '#ffe066' : '#90c8ff';
    profSkills.push('<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:3px;font-size:11px;background:rgba(100,180,255,0.08);border:1px solid ' + (val === 2 ? 'rgba(255,224,0,0.25)' : 'rgba(100,180,255,0.2)') + ';color:' + color + ';margin:1px;">' + icon + ' ' + sk.label + ' <strong>' + fmt(bonus) + '</strong></span>');
  });
  if (!profSkills.length) return '';
  return '<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.07);">' +
    '<div style="font-size:10px;font-family:Cinzel,serif;letter-spacing:0.1em;color:var(--text-dim);margin-bottom:4px;">SKILLS</div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:2px;">' + profSkills.join('') + '</div></div>';
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
  var basePath = window.location.pathname.replace(/\/[^\/]*$/, '/');
  var link = window.location.origin + basePath + 'player-view.html?dm=' + window.__fbUid;
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
  if (window.cloudSave) window.cloudSave();
  showToast('Message sent to ' + pc.name, 'success');
}

function sendPartyMessage() {
  var msg = prompt('Message to entire party:', window.pvPartyMessage || '');
  if (msg === null) return;
  window.pvPartyMessage = msg;
  if (window.cloudSave) window.cloudSave();
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
      buildSkillsCardHTML(pc) +
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
        '<button class="add-to-init-btn" style="right:auto;position:relative;bottom:auto;color:#d4a820;border-color:rgba(212,168,32,0.4);" onclick="openInventoryModal(' + pc.id + ')" title="Inventory & equipment">🎒</button>' +
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
  var spReset = document.getElementById('pc-speed'); if (spReset) spReset.value = 30;
  ['str','dex','con','int','wis','cha'].forEach(function(s) { document.getElementById('pc-' + s).value = 10; });
  populateSkillsGrid({});
  populateActionRows([]);
  populateSpellRows([]);
  var fr0 = document.getElementById('pc-feat-rage'); if (fr0) fr0.checked = false;
  var fk0 = document.getElementById('pc-feat-reckless'); if (fk0) fk0.checked = false;
  var fs0 = document.getElementById('pc-feat-surge'); if (fs0) fs0.checked = false;
  document.getElementById('player-modal').classList.add('show');
}

// ─── Structured combat actions ───────────────────────────────
var ACTION_DMG_TYPES = ['slashing','piercing','bludgeoning','fire','cold','lightning','thunder','poison','acid','necrotic','radiant','force','psychic'];
var ACTION_CONDITIONS = ['Prone','Poisoned','Blinded','Restrained','Grappled','Paralyzed','Stunned','Frightened','Incapacitated'];

function addActionRow(a) {
  a = a || {};
  var list = document.getElementById('pc-actions-list');
  if (!list) return;
  var row = document.createElement('div');
  row.className = 'pc-action-row';
  row.style.cssText = 'border:1px solid rgba(255,255,255,0.08);border-radius:5px;padding:6px;margin-bottom:6px;background:rgba(0,0,0,0.2);';
  var dmgOptions = '<option value="">untyped</option>' + ACTION_DMG_TYPES.map(function(t) {
    return '<option value="' + t + '"' + (a.damageType === t ? ' selected' : '') + '>' + t + '</option>';
  }).join('');
  var condOptions = '<option value="">no effect</option>' + ACTION_CONDITIONS.map(function(cn) {
    return '<option value="' + cn + '"' + (a.applyCondition === cn ? ' selected' : '') + '>' + cn + '</option>';
  }).join('');
  var abilityOptions = '<option value="">—</option>' + ['str','dex','con','int','wis','cha'].map(function(ab) {
    return '<option value="' + ab + '"' + (a.saveAbility === ab ? ' selected' : '') + '>' + ab.toUpperCase() + '</option>';
  }).join('');
  row.innerHTML =
    '<div style="display:grid;grid-template-columns:2fr 1fr 58px 58px 1fr 26px;gap:5px;align-items:center;margin-bottom:4px;">' +
      '<input class="pa-name" placeholder="Longsword" value="' + (a.name || '').replace(/"/g, '&quot;') + '" style="font-size:13px;padding:5px;" oninput="autoInferActionType(this)">' +
      '<select class="pa-kind" style="font-size:12px;padding:5px;">' +
        '<option value="attack"' + (a.kind !== 'heal' ? ' selected' : '') + '>⚔ Attack</option>' +
        '<option value="heal"' + (a.kind === 'heal' ? ' selected' : '') + '>❤ Heal</option>' +
      '</select>' +
      '<input class="pa-range" type="number" placeholder="5" title="Range in feet" value="' + (a.range || '') + '" style="font-size:13px;padding:5px;text-align:center;">' +
      '<input class="pa-bonus" type="number" placeholder="+0" title="To-hit bonus (attacks only)" value="' + (a.bonus !== undefined && a.bonus !== null && a.bonus !== '' ? a.bonus : '') + '" style="font-size:13px;padding:5px;text-align:center;">' +
      '<input class="pa-dice" placeholder="1d8+4" title="Damage or healing dice" value="' + (a.dice || '').replace(/"/g, '&quot;') + '" style="font-size:13px;padding:5px;">' +
      '<button type="button" onclick="this.closest(\'.pc-action-row\').remove()" style="background:none;border:1px solid var(--border);color:var(--blood-light);border-radius:3px;cursor:pointer;height:26px;font-size:12px;">✕</button>' +
    '</div>' +
    '<div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap;">' +
      '<span style="font-size:10px;color:var(--text-dim);">type</span>' +
      '<select class="pa-dmgtype" title="Damage type — resistances and immunities auto-apply" style="font-size:11px;padding:3px;">' + dmgOptions + '</select>' +
      '<span style="font-size:10px;color:var(--text-dim);margin-left:6px;">on hit</span>' +
      '<select class="pa-condition" title="Condition inflicted on hit" style="font-size:11px;padding:3px;">' + condOptions + '</select>' +
      '<span style="font-size:10px;color:var(--text-dim);margin-left:6px;">cost</span>' +
      '<select class="pa-cost" title="Action economy cost" style="font-size:11px;padding:3px;">' +
        '<option value="action"' + (a.cost !== 'bonus' ? ' selected' : '') + '>Action</option>' +
        '<option value="bonus"' + (a.cost === 'bonus' ? ' selected' : '') + '>Bonus</option>' +
      '</select>' +
      '<span style="font-size:10px;color:var(--text-dim);">save</span>' +
      '<select class="pa-saveability" title="Saving throw ability to resist the condition" style="font-size:11px;padding:3px;">' + abilityOptions + '</select>' +
      '<input class="pa-savedc" type="number" placeholder="DC" title="Save DC" value="' + (a.saveDC || '') + '" style="font-size:11px;padding:3px;width:46px;text-align:center;">' +
    '</div>';
  list.appendChild(row);
}

function populateActionRows(actions) {
  var list = document.getElementById('pc-actions-list');
  if (!list) return;
  list.innerHTML = '';
  (actions || []).forEach(function(a) { addActionRow(a); });
}


function autoInferActionType(nameInput) {
  var row = nameInput.closest('.pc-action-row');
  if (!row) return;
  var sel = row.querySelector('.pa-dmgtype');
  if (!sel || sel.value) return; // don't override an explicit choice
  if (typeof inferDamageType !== 'function') return;
  var t = inferDamageType(nameInput.value);
  if (t) { sel.value = t; sel.style.color = '#8fd050'; setTimeout(function() { sel.style.color = ''; }, 800); }
}

function collectActions() {
  var out = [];
  document.querySelectorAll('#pc-actions-list .pc-action-row').forEach(function(row) {
    var name = row.querySelector('.pa-name').value.trim();
    if (!name) return;
    var a = {
      name: name,
      kind: row.querySelector('.pa-kind').value,
      range: parseInt(row.querySelector('.pa-range').value) || 5,
      bonus: parseInt(row.querySelector('.pa-bonus').value) || 0,
      dice: row.querySelector('.pa-dice').value.trim() || '1d6'
    };
    var dt = row.querySelector('.pa-dmgtype');
    if (dt && dt.value) a.damageType = dt.value;
    else if (a.kind === 'attack' && typeof inferDamageType === 'function') {
      var inferred = inferDamageType(name);
      if (inferred) a.damageType = inferred;
    }
    var cond = row.querySelector('.pa-condition'); if (cond && cond.value) a.applyCondition = cond.value;
    var sa = row.querySelector('.pa-saveability'); if (sa && sa.value) a.saveAbility = sa.value;
    var dc = row.querySelector('.pa-savedc'); if (dc && dc.value) a.saveDC = parseInt(dc.value) || 0;
    var pcost = row.querySelector('.pa-cost'); if (pcost && pcost.value === 'bonus') a.cost = 'bonus';
    out.push(a);
  });
  return out;
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
  var spEl = document.getElementById('pc-speed'); if (spEl) spEl.value = pc.speed || 30;
  document.getElementById('pc-str').value = pc.str || 10;
  document.getElementById('pc-dex').value = pc.dex || 10;
  document.getElementById('pc-con').value = pc.con || 10;
  document.getElementById('pc-int').value = pc.int || 10;
  document.getElementById('pc-wis').value = pc.wis || 10;
  document.getElementById('pc-cha').value = pc.cha || 10;
  document.getElementById('pc-moves').value = pc.moves || '';
  populateActionRows(pc.actions || []);
  populateSpellRows(pc.spells || []);
  var fr = document.getElementById('pc-feat-rage'); if (fr) fr.checked = (pc.features || []).indexOf('Rage') >= 0;
  var fk = document.getElementById('pc-feat-reckless'); if (fk) fk.checked = (pc.features || []).indexOf('Reckless Attack') >= 0;
  var fs = document.getElementById('pc-feat-surge'); if (fs) fs.checked = (pc.features || []).indexOf('Action Surge') >= 0;
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
    speed: parseInt(document.getElementById('pc-speed').value) || 30,
    str: parseInt(document.getElementById('pc-str').value) || 10,
    dex: parseInt(document.getElementById('pc-dex').value) || 10,
    con: parseInt(document.getElementById('pc-con').value) || 10,
    int: parseInt(document.getElementById('pc-int').value) || 10,
    wis: parseInt(document.getElementById('pc-wis').value) || 10,
    cha: parseInt(document.getElementById('pc-cha').value) || 10,
    moves: document.getElementById('pc-moves').value,
    actions: collectActions(),
    spells: collectSpells(),
    features: (function() {
      var f = [];
      if (document.getElementById('pc-feat-rage') && document.getElementById('pc-feat-rage').checked) f.push('Rage');
      if (document.getElementById('pc-feat-reckless') && document.getElementById('pc-feat-reckless').checked) f.push('Reckless Attack');
      if (document.getElementById('pc-feat-surge') && document.getElementById('pc-feat-surge').checked) f.push('Action Surge');
      return f;
    })(),
    resist: (window._importedDefenses && window._importedDefenses.resist) || (existingPC && existingPC.resist) || [],
    immune: (window._importedDefenses && window._importedDefenses.immune) || (existingPC && existingPC.immune) || [],
    vuln: (window._importedDefenses && window._importedDefenses.vuln) || (existingPC && existingPC.vuln) || [],
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
  window._importedDefenses = null;
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
    combatants.push({id: uniqueId(), name: pc.name, init: init, hp: pc.maxhp || 20, maxHp: pc.maxhp || 20, ac: pc.ac || 14, type: 'ally', conditions: [],
      resist: pc.resist || [], immune: pc.immune || [], vuln: pc.vuln || []});
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
      combatants.push({id: uniqueId(), name: pc.name, init: init, hp: pc.maxhp || 20, maxHp: pc.maxhp || 20, ac: pc.ac || 14, type: 'ally', conditions: [],
      resist: pc.resist || [], immune: pc.immune || [], vuln: pc.vuln || []});
      added++;
    }
  });
  combatants.sort(function(a,b) { return b.init - a.init; });
  renderCombatants();
  var m = document.getElementById('init-roll-modal'); if (m) m.remove();
  showToast('⚔ ' + added + ' party member' + (added !== 1 ? 's' : '') + ' added to initiative!', 'success');
}

// ══════════════════════════════════════════════════════════════
// INVENTORY & EQUIPMENT (DM manager)
// ══════════════════════════════════════════════════════════════
function openInventoryModal(pcId) {
  var pc = party.find(function(p) { return p.id === pcId; });
  if (!pc) return;
  pc.inventory = pc.inventory || [];
  if (pc.gold === undefined) pc.gold = 0;
  var existing = document.getElementById('inv-modal');
  if (existing) existing.remove();
  var ov = document.createElement('div');
  ov.id = 'inv-modal';
  ov.className = 'modal-overlay show';
  ov.style.zIndex = '2600';
  ov.addEventListener('click', function(e) { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
  renderInventoryModal(pcId);
}

function renderInventoryModal(pcId) {
  var pc = party.find(function(p) { return p.id === pcId; });
  var ov = document.getElementById('inv-modal');
  if (!pc || !ov) return;
  var esc = function(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  var slotIcons = { weapon: '⚔', armor: '🛡', shield: '🛡', light: '🕯', gear: '🎒' };
  var html = '<div class="modal" style="max-width:520px;width:95%;max-height:88vh;overflow-y:auto;">' +
    '<h3 style="font-family:Cinzel,serif;color:var(--gold);margin-bottom:4px;">🎒 ' + esc(pc.name) + ' — Inventory</h3>' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">' +
      '<span style="font-size:13px;color:var(--text-dim);">Gold:</span>' +
      '<input id="inv-gold" type="number" value="' + (pc.gold || 0) + '" onchange="setPcGold(' + pcId + ', this.value)" style="width:90px;font-size:14px;padding:4px;text-align:center;"> 🪙' +
      '<span style="margin-left:auto;font-size:11px;color:var(--text-dim);">AC with gear: <strong style="color:var(--parchment);">' + (typeof effectiveAC === 'function' ? effectiveAC(pc) : pc.ac) + '</strong></span>' +
    '</div>';

  // Add item row
  html += '<div style="background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:6px;padding:10px;margin-bottom:12px;">' +
    '<div style="display:grid;grid-template-columns:2fr 60px 1fr auto;gap:6px;align-items:end;">' +
      '<div class="field-group" style="margin:0;"><label>Item <span style="color:#666;font-weight:normal;">(known names auto-fill stats)</span></label><input id="inv-new-name" placeholder="Longsword, Torch, Shield, Rope..."></div>' +
      '<div class="field-group" style="margin:0;"><label>Qty</label><input id="inv-new-qty" type="number" value="1" style="text-align:center;"></div>' +
      '<div class="field-group" style="margin:0;"><label>Slot</label><select id="inv-new-slot">' +
        '<option value="gear">Gear</option><option value="weapon">Weapon</option><option value="armor">Armor</option><option value="shield">Shield</option><option value="light">Light</option>' +
      '</select></div>' +
      '<button class="btn btn-gold btn-sm" onclick="addInventoryItem(' + pcId + ')">+ Add</button>' +
    '</div></div>';

  // Item list
  if (!pc.inventory.length) {
    html += '<div style="color:var(--text-dim);font-size:13px;padding:12px;text-align:center;font-style:italic;">No items yet.</div>';
  } else {
    pc.inventory.forEach(function(it) {
      var extra = [];
      if (it.dice) extra.push(it.dice + (it.damageType ? ' ' + it.damageType : ''));
      if (it.acBonus) extra.push('+' + it.acBonus + ' AC');
      if (it.lightFt) extra.push('💡 ' + it.lightFt + ' ft');
      if (it.range && it.slot === 'weapon') extra.push(it.range + ' ft');
      html += '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid ' + (it.equipped ? 'rgba(212,175,55,0.45)' : 'rgba(255,255,255,0.08)') + ';border-radius:6px;margin-bottom:5px;background:' + (it.equipped ? 'rgba(212,175,55,0.06)' : 'rgba(0,0,0,0.2)') + ';">' +
        '<span>' + (slotIcons[it.slot] || '🎒') + '</span>' +
        '<div style="flex:1;min-width:0;">' +
          '<span style="font-size:14px;color:var(--parchment);">' + esc(it.name) + (it.qty > 1 ? ' ×' + it.qty : '') + '</span>' +
          (extra.length ? '<span style="font-size:11px;color:var(--text-dim);margin-left:8px;">' + extra.join(' · ') + '</span>' : '') +
        '</div>' +
        '<button class="btn btn-ghost btn-sm" title="Edit magical effects (+stats, resistances, special attacks...)" onclick="editItemEffects(' + pcId + ',' + it.id + ')">✨</button>' +
        (it.slot !== 'gear' ? '<button class="btn btn-ghost btn-sm" style="' + (it.equipped ? 'border-color:var(--gold);color:var(--gold);' : '') + '" onclick="dmToggleEquip(' + pcId + ',' + it.id + ')">' + (it.equipped ? '✓ Equipped' : 'Equip') + '</button>' : '') +
        '<button onclick="deleteInventoryItem(' + pcId + ',' + it.id + ')" style="background:none;border:1px solid var(--border);color:var(--blood-light);border-radius:3px;cursor:pointer;width:24px;height:24px;font-size:11px;">✕</button>' +
      '</div>';
    });
  }

  // DM chaos tools
  html += '<div style="border-top:1px solid var(--border);margin-top:12px;padding-top:10px;display:flex;gap:8px;flex-wrap:wrap;">' +
    '<button class="btn btn-blood btn-sm" onclick="destroyEquipped(' + pcId + ')" title="Lava, rust monsters, cursed dispels...">💥 Destroy Equipped</button>' +
    '<button class="btn btn-ghost" style="margin-left:auto;" onclick="document.getElementById(\'inv-modal\').remove()">Close</button>' +
  '</div></div>';
  ov.innerHTML = html;
}

function addInventoryItem(pcId) {
  var pc = party.find(function(p) { return p.id === pcId; });
  if (!pc) return;
  var name = document.getElementById('inv-new-name').value.trim();
  if (!name) return;
  var qty = parseInt(document.getElementById('inv-new-qty').value) || 1;
  var slot = document.getElementById('inv-new-slot').value;
  var item = { id: typeof uniqueId === 'function' ? uniqueId() : Date.now(), name: name, qty: qty, slot: slot, equipped: false };
  var preset = typeof itemPresetFor === 'function' ? itemPresetFor(name) : null;
  if (preset) {
    item.slot = preset.slot;
    if (preset.acBonus) item.acBonus = preset.acBonus;
    if (preset.dice) item.dice = preset.dice;
    if (preset.range) item.range = preset.range;
    if (preset.damageType) item.damageType = preset.damageType;
    if (preset.lightFt) item.lightFt = preset.lightFt;
  } else if (slot === 'weapon') {
    item.dice = '1d6';
    item.range = 5;
    item.damageType = typeof inferDamageType === 'function' ? (inferDamageType(name) || 'bludgeoning') : 'bludgeoning';
  } else if (slot === 'shield') {
    item.acBonus = 2;
  } else if (slot === 'light') {
    item.lightFt = 20;
  }
  pc.inventory = pc.inventory || [];
  pc.inventory.push(item);
  savePartyStorage();
  renderInventoryModal(pcId);
  showToast('+ ' + name + ' → ' + pc.name, 'success');
}

function dmToggleEquip(pcId, itemId) {
  var pc = party.find(function(p) { return p.id === pcId; });
  var it = pc && (pc.inventory || []).find(function(i) { return i.id === itemId; });
  if (!it) return;
  it.equipped = !it.equipped;
  if (typeof recomputePcCombat === 'function') recomputePcCombat(pc);
  savePartyStorage();
  renderParty();
  renderCombatants();
  renderInventoryModal(pcId);
}

function deleteInventoryItem(pcId, itemId) {
  var pc = party.find(function(p) { return p.id === pcId; });
  if (!pc) return;
  pc.inventory = (pc.inventory || []).filter(function(i) { return i.id !== itemId; });
  if (typeof recomputePcCombat === 'function') recomputePcCombat(pc);
  savePartyStorage();
  renderParty();
  renderInventoryModal(pcId);
}

function setPcGold(pcId, val) {
  var pc = party.find(function(p) { return p.id === pcId; });
  if (!pc) return;
  pc.gold = Math.max(0, parseInt(val) || 0);
  savePartyStorage();
}

function destroyEquipped(pcId) {
  var pc = party.find(function(p) { return p.id === pcId; });
  if (!pc) return;
  var equipped = (pc.inventory || []).filter(function(i) { return i.equipped; });
  if (!equipped.length) { showToast('Nothing equipped to destroy', 'info'); return; }
  if (!confirm('Destroy ' + pc.name + '\'s equipped items (' + equipped.map(function(i){return i.name;}).join(', ') + ')? The lava shows no mercy.')) return;
  pc.inventory = pc.inventory.filter(function(i) { return !i.equipped; });
  if (typeof recomputePcCombat === 'function') recomputePcCombat(pc);
  savePartyStorage();
  renderParty();
  renderCombatants();
  renderInventoryModal(pcId);
  showToast('💥 ' + equipped.length + ' item' + (equipped.length > 1 ? 's' : '') + ' destroyed — ' + pc.name + ' weeps', 'danger');
  if (typeof logCombat === 'function') logCombat('💥 ' + pc.name + ' lost equipment: ' + equipped.map(function(i){return i.name;}).join(', '), 'damage');
}

// ══════════════════════════════════════════════════════════════
// SPELL ROWS (character modal)
// ══════════════════════════════════════════════════════════════
function ensureSpellDatalist() {
  if (document.getElementById('spell-db-names')) return;
  if (typeof SPELL_DB === 'undefined') return;
  var dl = document.createElement('datalist');
  dl.id = 'spell-db-names';
  dl.innerHTML = SPELL_DB.map(function(s) {
    return '<option value="' + s.name.replace(/"/g, '&quot;') + '">' + (s.level === 0 ? 'Cantrip' : 'L' + s.level) + '</option>';
  }).join('');
  document.body.appendChild(dl);
}

function addSpellRow(s) {
  s = s || {};
  ensureSpellDatalist();
  var list = document.getElementById('pc-spells-list');
  if (!list) return;
  var row = document.createElement('div');
  row.className = 'pc-spell-row';
  row.style.cssText = 'border:1px solid rgba(100,180,255,0.15);border-radius:5px;padding:6px;margin-bottom:6px;background:rgba(100,180,255,0.03);';
  var dmgOptions = '<option value="">untyped</option>' + ACTION_DMG_TYPES.map(function(t) {
    return '<option value="' + t + '"' + (s.damageType === t ? ' selected' : '') + '>' + t + '</option>';
  }).join('');
  var lvlOptions = '';
  for (var L = 0; L <= 9; L++) lvlOptions += '<option value="' + L + '"' + ((s.level || 0) === L ? ' selected' : '') + '>' + (L === 0 ? 'Cantrip' : 'L' + L) + '</option>';
  var abilityOptions = ['dex','con','str','int','wis','cha'].map(function(ab) {
    return '<option value="' + ab + '"' + ((s.saveAbility || 'dex') === ab ? ' selected' : '') + '>' + ab.toUpperCase() + '</option>';
  }).join('');
  row.innerHTML =
    '<div style="display:grid;grid-template-columns:2fr 78px 1fr 58px 26px;gap:5px;align-items:center;margin-bottom:4px;">' +
      '<input class="ps-name" list="spell-db-names" placeholder="Fireball" value="' + (s.name || '').replace(/"/g, '&quot;') + '" style="font-size:13px;padding:5px;" oninput="autoInferSpellType(this)">' +
      '<select class="ps-level" style="font-size:11px;padding:5px;">' + lvlOptions + '</select>' +
      '<select class="ps-kind" style="font-size:11px;padding:5px;">' +
        '<option value="save"' + (s.kind === 'save' || !s.kind ? ' selected' : '') + '>💾 Save-based</option>' +
        '<option value="attack"' + (s.kind === 'attack' ? ' selected' : '') + '>⚔ Spell attack</option>' +
        '<option value="heal"' + (s.kind === 'heal' ? ' selected' : '') + '>❤ Heal</option>' +
      '</select>' +
      '<input class="ps-dice" placeholder="8d6" title="Damage/heal dice" value="' + (s.dice || '').replace(/"/g, '&quot;') + '" style="font-size:12px;padding:5px;">' +
      '<button type="button" onclick="this.closest(\'.pc-spell-row\').remove()" style="background:none;border:1px solid var(--border);color:var(--blood-light);border-radius:3px;cursor:pointer;height:26px;font-size:12px;">✕</button>' +
    '</div>' +
    '<div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap;">' +
      '<span style="font-size:10px;color:var(--text-dim);">type</span>' +
      '<select class="ps-dmgtype" style="font-size:11px;padding:3px;">' + dmgOptions + '</select>' +
      '<span style="font-size:10px;color:var(--text-dim);">save</span>' +
      '<select class="ps-save" style="font-size:11px;padding:3px;">' + abilityOptions + '</select>' +
      '<span style="font-size:10px;color:var(--text-dim);">range ft</span>' +
      '<input class="ps-range" type="number" placeholder="120" value="' + (s.range || '') + '" style="font-size:11px;padding:3px;width:52px;text-align:center;">' +
      '<span style="font-size:10px;color:var(--text-dim);">AoE radius ft</span>' +
      '<input class="ps-aoe" type="number" placeholder="0" title="0 = single target" value="' + (s.aoeFt || '') + '" style="font-size:11px;padding:3px;width:46px;text-align:center;">' +
      '<span style="font-size:10px;color:var(--text-dim);">upcast dice</span>' +
      '<input class="ps-upcast" placeholder="1d6" title="Extra dice per slot level above base" value="' + (s.upcastDice || '').replace(/"/g, '&quot;') + '" style="font-size:11px;padding:3px;width:48px;">' +
      '<label style="font-size:10px;color:var(--text-dim);display:flex;align-items:center;gap:3px;cursor:pointer;"><input type="checkbox" class="ps-conc"' + (s.concentration ? ' checked' : '') + '> conc.</label>' +
    '</div>';
  list.appendChild(row);
}

function autoInferSpellType(nameInput) {
  var row = nameInput.closest('.pc-spell-row');
  if (!row) return;
  // Known spell? Auto-fill EVERYTHING from the 86-spell SRD database
  if (typeof findSpell === 'function') {
    var known = findSpell(nameInput.value);
    if (known) {
      var set = function(cls, val) { var el = row.querySelector(cls); if (el && val !== undefined && val !== null) el.value = val; };
      set('.ps-level', known.level || 0);
      set('.ps-kind', known.kind === 'buff' ? 'save' : known.kind);
      if (known.kind === 'buff') { var kEl = row.querySelector('.ps-kind'); if (kEl) { if (![].some.call(kEl.options, function(o){return o.value==='buff';})) { var op = document.createElement('option'); op.value='buff'; op.textContent='✨ Buff'; kEl.appendChild(op); } kEl.value = 'buff'; } }
      set('.ps-dice', known.dice || '');
      set('.ps-range', known.range || 60);
      set('.ps-aoe', known.aoeFt || '');
      set('.ps-upcast', known.upcastDice || '');
      if (known.saveAbility) set('.ps-save', known.saveAbility);
      if (known.damageType) set('.ps-dmgtype', known.damageType);
      var conc = row.querySelector('.ps-conc'); if (conc) conc.checked = !!known.concentration;
      row.style.borderColor = 'rgba(143,208,80,0.5)';
      setTimeout(function() { row.style.borderColor = 'rgba(100,180,255,0.15)'; }, 900);
      row.dataset.applyCondition = known.applyCondition || '';
      return;
    }
  }
  var sel = row.querySelector('.ps-dmgtype');
  if (!sel || sel.value) return;
  if (typeof inferDamageType !== 'function') return;
  var t = inferDamageType(nameInput.value);
  if (t) { sel.value = t; sel.style.color = '#8fd050'; setTimeout(function() { sel.style.color = ''; }, 800); }
}

function populateSpellRows(spells) {
  var list = document.getElementById('pc-spells-list');
  if (!list) return;
  list.innerHTML = '';
  (spells || []).forEach(function(s) { addSpellRow(s); });
}

function collectSpells() {
  var out = [];
  document.querySelectorAll('#pc-spells-list .pc-spell-row').forEach(function(row) {
    var name = row.querySelector('.ps-name').value.trim();
    if (!name) return;
    var s = {
      name: name,
      level: parseInt(row.querySelector('.ps-level').value) || 0,
      kind: row.querySelector('.ps-kind').value,
      dice: row.querySelector('.ps-dice').value.trim(),
      range: parseInt(row.querySelector('.ps-range').value) || 60
    };
    if (!s.dice && s.kind !== 'buff') s.dice = '1d6';
    if (row.dataset.applyCondition) s.applyCondition = row.dataset.applyCondition;
    else if (typeof findSpell === 'function') { var kn = findSpell(name); if (kn && kn.applyCondition) s.applyCondition = kn.applyCondition; }
    var dt = row.querySelector('.ps-dmgtype'); if (dt && dt.value) s.damageType = dt.value;
    else if (s.kind !== 'heal' && typeof inferDamageType === 'function') { var inf = inferDamageType(name); if (inf) s.damageType = inf; }
    if (s.kind === 'save') s.saveAbility = row.querySelector('.ps-save').value;
    var aoe = parseInt(row.querySelector('.ps-aoe').value); if (aoe > 0) s.aoeFt = aoe;
    var up = row.querySelector('.ps-upcast').value.trim(); if (up) s.upcastDice = up;
    if (row.querySelector('.ps-conc').checked) s.concentration = true;
    out.push(s);
  });
  return out;
}

// ══════════════════════════════════════════════════════════════
// ITEM EFFECTS EDITOR — make any item magical
// ══════════════════════════════════════════════════════════════
function editItemEffects(pcId, itemId) {
  var pc = party.find(function(p) { return p.id === pcId; });
  var it = pc && (pc.inventory || []).find(function(i) { return i.id === itemId; });
  if (!it) return;
  var existing = document.getElementById('item-fx-modal');
  if (existing) existing.remove();
  var ov = document.createElement('div');
  ov.id = 'item-fx-modal';
  ov.className = 'modal-overlay show';
  ov.style.zIndex = '2700';
  var st = it.statBonuses || {};
  var ga = it.grantAction || {};
  var esc2 = function(s) { return String(s || '').replace(/"/g, '&quot;'); };
  ov.innerHTML = '<div class="modal" style="max-width:480px;width:95%;max-height:85vh;overflow-y:auto;">' +
    '<h3 style="font-family:Cinzel,serif;color:var(--gold);margin-bottom:4px;">✨ ' + esc2(it.name) + ' — effects</h3>' +
    '<div style="font-size:11px;color:var(--text-dim);margin-bottom:12px;">Everything here applies automatically while the item is equipped.</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px;">' +
      '<div class="field-group" style="margin:0;"><label>+ AC</label><input id="fx-ac" type="number" value="' + (it.acBonus || 0) + '" style="text-align:center;"></div>' +
      '<div class="field-group" style="margin:0;"><label>+ Speed ft</label><input id="fx-speed" type="number" value="' + (it.speedBonus || 0) + '" style="text-align:center;"></div>' +
      '<div class="field-group" style="margin:0;"><label>Light ft</label><input id="fx-light" type="number" value="' + (it.lightFt || 0) + '" style="text-align:center;"></div>' +
    '</div>' +
    '<label style="font-size:10px;font-family:Cinzel,serif;letter-spacing:0.08em;color:var(--text-dim);">STAT BONUSES</label>' +
    '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin:5px 0 10px;">' +
      ['str','dex','con','int','wis','cha'].map(function(s) {
        return '<div style="text-align:center;"><div style="font-size:9px;color:var(--text-dim);">' + s.toUpperCase() + '</div><input id="fx-' + s + '" type="number" value="' + (st[s] || 0) + '" style="width:100%;text-align:center;font-size:12px;padding:4px 2px;"></div>';
      }).join('') +
    '</div>' +
    '<div class="field-group" style="margin-bottom:8px;"><label>Grants resistance to <span style="color:#666;font-weight:normal;">(comma-separated: fire, cold...)</span></label><input id="fx-resist" value="' + esc2((it.grantResist || []).join(', ')) + '"></div>' +
    '<div class="field-group" style="margin-bottom:8px;"><label>Grants immunity to</label><input id="fx-immune" value="' + esc2((it.grantImmune || []).join(', ')) + '"></div>' +
    '<div class="field-group" style="margin-bottom:10px;"><label>Inflicts vulnerability to <span style="color:#666;font-weight:normal;">(cursed!)</span></label><input id="fx-vuln" value="' + esc2((it.grantVuln || []).join(', ')) + '"></div>' +
    '<label style="font-size:10px;font-family:Cinzel,serif;letter-spacing:0.08em;color:var(--text-dim);">SPECIAL ATTACK GRANTED</label>' +
    '<div style="display:grid;grid-template-columns:2fr 60px 60px 1fr 1fr;gap:5px;margin:5px 0 12px;">' +
      '<input id="fx-aname" placeholder="Flame Tongue Blast" value="' + esc2(ga.name) + '" style="font-size:12px;padding:5px;">' +
      '<input id="fx-arange" type="number" placeholder="ft" value="' + (ga.range || '') + '" style="font-size:12px;padding:5px;text-align:center;">' +
      '<input id="fx-abonus" type="number" placeholder="+hit" value="' + (ga.bonus !== undefined ? ga.bonus : '') + '" style="font-size:12px;padding:5px;text-align:center;">' +
      '<input id="fx-adice" placeholder="2d6" value="' + esc2(ga.dice) + '" style="font-size:12px;padding:5px;">' +
      '<select id="fx-atype" style="font-size:11px;padding:5px;"><option value="">type</option>' + ACTION_DMG_TYPES.map(function(t) { return '<option value="' + t + '"' + (ga.damageType === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select>' +
    '</div>' +
    '<div class="modal-btns">' +
      '<button class="btn btn-gold" onclick="saveItemEffects(' + pcId + ',' + itemId + ')">💾 Save Effects</button>' +
      '<button class="btn btn-ghost" onclick="document.getElementById(\'item-fx-modal\').remove()">Cancel</button>' +
    '</div></div>';
  ov.addEventListener('click', function(e) { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
}

function saveItemEffects(pcId, itemId) {
  var pc = party.find(function(p) { return p.id === pcId; });
  var it = pc && (pc.inventory || []).find(function(i) { return i.id === itemId; });
  if (!it) return;
  var num = function(id) { return parseInt(document.getElementById(id).value) || 0; };
  var csv = function(id) {
    var valid = ['slashing','piercing','bludgeoning','fire','cold','lightning','thunder','poison','acid','necrotic','radiant','force','psychic'];
    return document.getElementById(id).value.split(',').map(function(s) { return s.trim().toLowerCase(); }).filter(function(s) { return valid.indexOf(s) >= 0; });
  };
  it.acBonus = num('fx-ac') || undefined;
  it.speedBonus = num('fx-speed') || undefined;
  it.lightFt = num('fx-light') || undefined;
  var stats = {};
  var any = false;
  ['str','dex','con','int','wis','cha'].forEach(function(s) { var v = num('fx-' + s); if (v) { stats[s] = v; any = true; } });
  it.statBonuses = any ? stats : undefined;
  it.grantResist = csv('fx-resist'); if (!it.grantResist.length) delete it.grantResist;
  it.grantImmune = csv('fx-immune'); if (!it.grantImmune.length) delete it.grantImmune;
  it.grantVuln = csv('fx-vuln'); if (!it.grantVuln.length) delete it.grantVuln;
  var an = document.getElementById('fx-aname').value.trim();
  it.grantAction = an ? {
    name: an, kind: 'attack',
    range: num('fx-arange') || 5,
    bonus: num('fx-abonus') || 0,
    dice: document.getElementById('fx-adice').value.trim() || '1d6',
    damageType: document.getElementById('fx-atype').value || (typeof inferDamageType === 'function' ? inferDamageType(an) : '')
  } : undefined;
  if (typeof recomputePcCombat === 'function') recomputePcCombat(pc);
  savePartyStorage();
  renderParty();
  renderCombatants();
  var m = document.getElementById('item-fx-modal');
  if (m) m.remove();
  renderInventoryModal(pcId);
  showToast('✨ ' + it.name + ' enchanted', 'success');
}
