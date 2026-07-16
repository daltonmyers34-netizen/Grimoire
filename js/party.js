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
  var itemSkills = (typeof equipmentMods === 'function') ? (equipmentMods(pc).skills || {}) : {};
  var profSkills = [];
  SKILL_LIST.forEach(function(sk) {
    var val = pc.skills[sk.key] || 0;
    var itemBonus = (itemSkills[sk.key] || 0) + (itemSkills.all || 0);
    if (val === 0 && !itemBonus) return;
    var ability = sk.ability;
    var abilityScore = (typeof effectiveAbility === 'function' ? effectiveAbility(pc, ability) : (pc[ability] || 10));
    var bonus = mod(abilityScore) + profBonus * val + itemBonus;
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
  pc.inspiration = (parseInt(pc.inspiration) || 0) + 1;
  var c = (typeof combatants !== 'undefined') && combatants.find(function(x) { return x.name === pc.name && x.type === 'ally'; });
  if (c) { c.inspiration = pc.inspiration; if (typeof renderCombatants === 'function') renderCombatants(); if (typeof syncCombatState === 'function') syncCombatState(); }
  savePartyStorage();
  renderParty();
  showToast('★ ' + pc.name + ' gains Inspiration! (×' + pc.inspiration + ')', 'success');
}

// ══════════════════════════════════════════════════════════════
// PLAYER VIEW
// ══════════════════════════════════════════════════════════════
function openPlayerView() {
  if (!window.__fbUid) { showToast('Sign in first to use Player View', 'warn'); return; }
  var basePath = window.location.pathname.replace(/\/[^\/]*$/, '/');
  var link = window.location.origin + basePath + 'player-view.html?dm=' + window.__fbUid;
  var tableLink = link + '&table=1';
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
    '<div style="display:flex;gap:8px;margin-bottom:12px;">' +
      '<button onclick="window.open(\'' + link + '\',\'_blank\')" style="flex:1;padding:10px;background:rgba(100,180,255,0.1);border:1px solid rgba(100,180,255,0.3);border-radius:5px;color:#90c8ff;font-family:Cinzel,serif;font-size:11px;cursor:pointer;">🔗 Open Preview</button>' +
      '<button onclick="window.open(\'' + tableLink + '\',\'_blank\')" style="flex:1;padding:10px;background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.35);border-radius:5px;color:var(--gold);font-family:Cinzel,serif;font-size:11px;cursor:pointer;">📺 Table Mode</button>' +
    '</div>' +
    '<div style="font-size:11px;color:var(--text-dim);font-family:Crimson Text,serif;font-style:italic;">📺 Table Mode is for a shared screen or touch-TV at the table: it follows whoever\'s turn it is automatically and can act for any player. No character selection needed.</div>' +
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
'      const inspN=parseInt(pc.inspiration)||0;\n' +
'      const insp=inspN>0?\'<span style="padding:2px 8px;border-radius:3px;font-size:11px;background:rgba(255,215,0,0.18);border:1px solid rgba(255,215,0,0.5);color:#ffd700;margin:2px;">★ Inspired\'+(inspN>1?\' ×\'+inspN:\'\')+\'</span>\':\'\';\n' +
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

function setPcPortrait(file) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var size = 128;
      var cv = document.createElement('canvas');
      cv.width = size; cv.height = size;
      var ctx = cv.getContext('2d');
      // center-crop to square
      var m = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, size, size);
      window._pendingPortrait = cv.toDataURL('image/jpeg', 0.82);
      var prev = document.getElementById('pc-portrait-preview');
      if (prev) { prev.src = window._pendingPortrait; prev.style.display = 'block'; }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Character modal is tabbed (Basics / Combat / Skills) — fields stay in the
// DOM either way, so save/populate never care which tab is showing.
function pmSwitchTab(name) {
  ['basics', 'combat', 'skills'].forEach(function(t) {
    var pane = document.getElementById('pm-tab-' + t);
    if (pane) pane.style.display = t === name ? '' : 'none';
    var btn = document.getElementById('pm-tabbtn-' + t);
    if (btn) btn.classList.toggle('active', t === name);
  });
}

function openAddPlayerModal() {
  pmSwitchTab('basics');
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
  window._pendingPortrait = undefined;
  var pp0 = document.getElementById('pc-portrait-preview'); if (pp0) pp0.style.display = 'none';
  ['pc-feat-rage','pc-feat-reckless','pc-feat-surge','pc-feat-secondwind','pc-feat-sneak','pc-feat-uncanny','pc-feat-smite','pc-feat-bardic','pc-feat-extraattack'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.checked = false;
  });
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
  pmSwitchTab('basics');
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
  window._pendingPortrait = undefined;
  var pp = document.getElementById('pc-portrait-preview');
  if (pp) { if (pc.portrait) { pp.src = pc.portrait; pp.style.display = 'block'; } else pp.style.display = 'none'; }
  (function() {
    var FEAT_IDS = { 'pc-feat-rage': 'Rage', 'pc-feat-reckless': 'Reckless Attack', 'pc-feat-surge': 'Action Surge',
      'pc-feat-secondwind': 'Second Wind', 'pc-feat-sneak': 'Sneak Attack', 'pc-feat-uncanny': 'Uncanny Dodge',
      'pc-feat-smite': 'Divine Smite', 'pc-feat-bardic': 'Bardic Inspiration', 'pc-feat-extraattack': 'Extra Attack' };
    Object.keys(FEAT_IDS).forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.checked = (pc.features || []).indexOf(FEAT_IDS[id]) >= 0;
    });
  })();
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
    portrait: window._pendingPortrait !== undefined ? (window._pendingPortrait || undefined) : (existingPC && existingPC.portrait),
    str: parseInt(document.getElementById('pc-str').value) || 10,
    dex: parseInt(document.getElementById('pc-dex').value) || 10,
    con: parseInt(document.getElementById('pc-con').value) || 10,
    int: parseInt(document.getElementById('pc-int').value) || 10,
    wis: parseInt(document.getElementById('pc-wis').value) || 10,
    cha: parseInt(document.getElementById('pc-cha').value) || 10,
    moves: document.getElementById('pc-moves').value,
    actions: collectActions(),
    spells: (function() {
      var sp = collectSpells();
      var added = 0;
      sp.forEach(function(s) { if (typeof upsertHomebrewSpell === 'function' && upsertHomebrewSpell(s)) added++; });
      if (added) showToast('📖 ' + added + ' homebrew spell' + (added > 1 ? 's' : '') + ' saved to your spellbook — forever, in every campaign', 'success');
      return sp;
    })(),
    features: (function() {
      var f = [];
      var FEAT_IDS = { 'pc-feat-rage': 'Rage', 'pc-feat-reckless': 'Reckless Attack', 'pc-feat-surge': 'Action Surge',
        'pc-feat-secondwind': 'Second Wind', 'pc-feat-sneak': 'Sneak Attack', 'pc-feat-uncanny': 'Uncanny Dodge',
        'pc-feat-smite': 'Divine Smite', 'pc-feat-bardic': 'Bardic Inspiration', 'pc-feat-extraattack': 'Extra Attack' };
      Object.keys(FEAT_IDS).forEach(function(id) {
        var el = document.getElementById(id);
        if (el && el.checked) f.push(FEAT_IDS[id]);
      });
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
  var roll = window.prompt('Initiative for ' + pc.name + ' — their total bonus is ' + sign + ' (DEX ' + Math.floor(((pc.dex || 10) - 10) / 2) + ' + misc ' + (pc.initBonus || 0) + ').\nEnter the RAW d20 only — the ' + sign + ' is added automatically. Leave blank to auto-roll.', '');
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
  var slotIcons = { weapon: '⚔', armor: '🛡', shield: '🛡', light: '🕯', gear: '🎒', potion: '🧪', ammo: '🏹' };
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
      '<div class="field-group" style="margin:0;"><label>Item <span style="color:#666;font-weight:normal;">(type to search — known names auto-fill stats)</span></label><input id="inv-new-name" list="inv-name-datalist" autocomplete="off" placeholder="Start typing: Flame Tongue, Plate, Potion of..."></div>' +
      '<div class="field-group" style="margin:0;"><label>Qty</label><input id="inv-new-qty" type="number" value="1" style="text-align:center;"></div>' +
      '<div class="field-group" style="margin:0;"><label>Slot</label><select id="inv-new-slot">' +
        '<option value="gear">Gear</option><option value="weapon">Weapon</option><option value="armor">Armor</option><option value="shield">Shield</option><option value="light">Light</option><option value="potion">Potion</option><option value="ammo">Ammo</option>' +
      '</select></div>' +
      '<button class="btn btn-gold btn-sm" onclick="addInventoryItem(' + pcId + ')">+ Add</button>' +
    '</div>' +
    '<div style="margin-top:8px;text-align:center;"><button class="btn btn-ghost btn-sm" onclick="openItemLibrary(' + pcId + ',0)">📚 Browse magic item library…</button></div>' +
    '<datalist id="inv-name-datalist">' + itemNameOptions().map(function(n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>' +
    '</div>';

  // Item list
  if (!pc.inventory.length) {
    html += '<div style="color:var(--text-dim);font-size:13px;padding:12px;text-align:center;font-style:italic;">No items yet.</div>';
  } else {
    pc.inventory.forEach(function(it) {
      var extra = [];
      if (it.dice) extra.push((it.magicBonus ? '+' + it.magicBonus + ' ' : '') + it.dice + (it.damageType ? ' ' + it.damageType : ''));
      (it.riderDamage || []).forEach(function(rd) { extra.push('☠ +' + rd.dice + (rd.type ? ' ' + rd.type : '')); });
      if (it.onHitSave && it.onHitSave.condition) extra.push('DC' + it.onHitSave.dc + ' ' + String(it.onHitSave.ability || '').toUpperCase() + ' or ' + it.onHitSave.condition);
      if (it.critRange && it.critRange < 20) extra.push('crit ' + it.critRange + '+');
      if (it.acBonus) extra.push('+' + it.acBonus + ' AC');
      if (it.saveBonus) extra.push('+' + it.saveBonus + ' saves');
      if (it.allAttackBonus) extra.push('+' + it.allAttackBonus + ' all atk');
      if (it.statBonuses) Object.keys(it.statBonuses).forEach(function(k){ if (it.statBonuses[k]) extra.push('+' + it.statBonuses[k] + ' ' + k.toUpperCase()); });
      if (it.grantResist && it.grantResist.length) extra.push('resist ' + it.grantResist.join('/'));
      if (it.charges) extra.push('🔋 ' + (typeof it.charges.left==='number'?it.charges.left:it.charges.max) + '/' + it.charges.max);
      if (it.lightFt) extra.push('💡 ' + it.lightFt + ' ft');
      if (it.healDice) extra.push('heals ' + it.healDice);
      if (it.range && it.slot === 'weapon') extra.push(it.range + ' ft');
      var canEq = ['weapon','armor','shield','wearable','light'].indexOf(it.slot) >= 0;
      // Two-line card: name + details on top, controls on their own row (never crammed).
      html += '<div style="padding:8px 10px;border:1px solid ' + (it.equipped ? 'rgba(212,175,55,0.45)' : 'rgba(255,255,255,0.08)') + ';border-radius:6px;margin-bottom:6px;background:' + (it.equipped ? 'rgba(212,175,55,0.06)' : 'rgba(0,0,0,0.2)') + ';">' +
        '<div style="display:flex;align-items:baseline;gap:6px;">' +
          '<span style="flex-shrink:0;">' + (slotIcons[it.slot] || '🎒') + '</span>' +
          '<span style="font-size:14px;color:var(--parchment);font-weight:600;">' + esc(it.name) + (it.qty > 1 ? ' ×' + it.qty : '') + '</span>' +
        '</div>' +
        (extra.length ? '<div style="font-size:11px;color:var(--text-dim);margin:3px 0 6px 22px;">' + extra.join(' · ') + '</div>' : '<div style="height:4px;"></div>') +
        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-left:22px;">' +
          '<select title="Category" onchange="dmSetItemSlot(' + pcId + ',' + it.id + ',this.value)" style="font-size:11px;padding:3px 4px;">' +
            ['weapon','armor','shield','wearable','potion','light','ammo','gear'].map(function(s){ return '<option value="' + s + '"' + ((it.slot||'gear')===s?' selected':'') + '>' + s + '</option>'; }).join('') +
          '</select>' +
          '<button class="btn btn-ghost btn-sm" title="Edit magical effects (+stats, resistances, special attacks...)" onclick="editItemEffects(' + pcId + ',' + it.id + ')">✨ Effects</button>' +
          (canEq ? '<button class="btn btn-ghost btn-sm" style="' + (it.equipped ? 'border-color:var(--gold);color:var(--gold);' : '') + '" onclick="dmToggleEquip(' + pcId + ',' + it.id + ')">' + (it.equipped ? '✓ Equipped' : 'Equip') + '</button>' : '') +
          '<button onclick="deleteInventoryItem(' + pcId + ',' + it.id + ')" title="Delete" style="margin-left:auto;background:none;border:1px solid var(--border);color:var(--blood-light);border-radius:3px;cursor:pointer;width:26px;height:26px;font-size:12px;">✕</button>' +
        '</div>' +
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

// Every item name we can autocomplete: library items + known base-item presets.
function itemNameOptions() {
  var names = {};
  if (typeof ITEM_LIBRARY !== 'undefined') ITEM_LIBRARY.forEach(function(t) { names[t.name] = 1; });
  if (typeof ITEM_PRESETS !== 'undefined') Object.keys(ITEM_PRESETS).forEach(function(k) {
    names[k.replace(/\b\w/g, function(c) { return c.toUpperCase(); })] = 1;
  });
  return Object.keys(names).sort();
}

function addInventoryItem(pcId) {
  var pc = party.find(function(p) { return p.id === pcId; });
  if (!pc) return;
  var name = document.getElementById('inv-new-name').value.trim();
  if (!name) return;
  var qty = parseInt(document.getElementById('inv-new-qty').value) || 1;
  var slot = document.getElementById('inv-new-slot').value;
  // Exact library match → full effects (a typed "Flame Tongue Longsword" keeps its rider).
  var lib = (typeof ITEM_LIBRARY !== 'undefined') ? ITEM_LIBRARY.find(function(t) { return t.name.toLowerCase() === name.toLowerCase(); }) : null;
  if (lib && typeof resolveItemFromName === 'function') {
    var libItem = resolveItemFromName(name);
    libItem.qty = qty;
    pc.inventory = pc.inventory || [];
    pc.inventory.push(libItem);
    if (typeof recomputePcCombat === 'function') recomputePcCombat(pc);
    savePartyStorage();
    renderInventoryModal(pcId);
    showToast('✨ ' + libItem.name + ' → ' + pc.name, 'success');
    return;
  }
  var item = { id: typeof uniqueId === 'function' ? uniqueId() : Date.now(), name: name, qty: qty, slot: slot, equipped: false };
  var preset = typeof itemPresetFor === 'function' ? itemPresetFor(name) : null;
  if (preset) {
    item.slot = preset.slot;
    if (preset.healDice) item.healDice = preset.healDice;
    if (preset.slot === 'ammo' && qty === 1) item.qty = 20;
    if (preset.acBonus) item.acBonus = preset.acBonus;
    if (preset.dice) item.dice = preset.dice;
    if (preset.range) item.range = preset.range;
    if (preset.damageType) item.damageType = preset.damageType;
    if (preset.lightFt) item.lightFt = preset.lightFt;
  } else if (slot === 'weapon') {
    // Resolve base dice + magic +X from the name (e.g. "+1 Longsword" → 1d8, +1)
    if (typeof hydrateWeaponStats === 'function') hydrateWeaponStats(item);
    else { item.dice = '1d6'; item.range = 5; item.damageType = typeof inferDamageType === 'function' ? (inferDamageType(name) || 'bludgeoning') : 'bludgeoning'; }
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
  if (typeof enforceSlotLimits === 'function') {
    var swapped = enforceSlotLimits(pc, it);
    if (swapped.length) showToast('🎒 Swapped out: ' + swapped.join(', '), 'info');
  }
  if (typeof recomputePcCombat === 'function') recomputePcCombat(pc);
  savePartyStorage();
  renderParty();
  renderCombatants();
  renderInventoryModal(pcId);
}

// DM fixes an item's category in a player's bag
function dmSetItemSlot(pcId, itemId, slot) {
  var pc = party.find(function(p) { return p.id === pcId; });
  var it = pc && (pc.inventory || []).find(function(i) { return i.id === itemId; });
  if (!it) return;
  it.slot = slot;
  if (['weapon', 'armor', 'shield', 'wearable', 'light'].indexOf(slot) < 0) it.equipped = false;
  if (typeof recomputePcCombat === 'function') recomputePcCombat(pc);
  savePartyStorage();
  renderParty();
  renderInventoryModal(pcId);
  showToast('🎒 ' + it.name + ' → ' + slot, 'info');
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
  var all = SPELL_DB.concat(typeof homebrewSpells !== 'undefined' ? homebrewSpells : []);
  dl.innerHTML = all.map(function(s) {
    return '<option value="' + s.name.replace(/"/g, '&quot;') + '">' + (s.level === 0 ? 'Cantrip' : 'L' + s.level) + (SPELL_DB.indexOf(s) < 0 ? ' · homebrew' : '') + '</option>';
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
    // Known spell? Backfill anything left blank straight from the database.
    if (typeof findSpell === 'function') {
      var kn = findSpell(name);
      if (kn) {
        if (!s.dice) s.dice = kn.dice || '';
        if (!s.damageType && kn.damageType) s.damageType = kn.damageType;
        if (kn.saveAbility && s.kind === 'save') s.saveAbility = s.saveAbility || kn.saveAbility;
        if (kn.aoeFt && !parseInt(row.querySelector('.ps-aoe').value)) s.aoeFt = kn.aoeFt;
        if (kn.aoeShape) s.aoeShape = kn.aoeShape;
        if (kn.upcastDice && !s.upcastDice) s.upcastDice = kn.upcastDice;
        if (kn.concentration) s.concentration = true;
        if (kn.applyCondition) s.applyCondition = kn.applyCondition;
        if (kn.kind === 'buff') s.kind = 'buff';
      }
    }
    if (!s.dice && s.kind !== 'buff') s.dice = '1d6';
    if (row.dataset.applyCondition && !s.applyCondition) s.applyCondition = row.dataset.applyCondition;
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
// Fields the library stamps onto an item (everything except bookkeeping)
var ITEM_EFFECT_FIELDS = ['slot','dice','damageType','magicBonus','toHitBonus','damageBonus','critRange','riderDamage','vsType','onHitSave',
  'acBonus','speedBonus','lightFt','allAttackBonus','allDamageBonus','saveBonus','grantsExtraAttack','statBonuses','skillBonus',
  'grantResist','grantImmune','grantVuln','conditionImmune','grantAction','grantSpell','charges','healDice','range'];

// Deep-ish clone so a library template never shares array/object refs with an item
function cloneItemFields(src) {
  var out = {};
  ITEM_EFFECT_FIELDS.forEach(function(k) {
    if (src[k] === undefined) return;
    out[k] = (src[k] && typeof src[k] === 'object') ? JSON.parse(JSON.stringify(src[k])) : src[k];
  });
  return out;
}

// Stamp a library template onto an item (id 0 = create a brand-new item on the pc)
function applyLibraryItem(pcId, itemId, libIndex) {
  var pc = party.find(function(p) { return p.id === pcId; });
  if (!pc) return;
  var tpl = (typeof ITEM_LIBRARY !== 'undefined') ? ITEM_LIBRARY[libIndex] : null;
  if (!tpl) return;
  var fields = cloneItemFields(tpl);
  var it;
  if (itemId) {
    it = (pc.inventory || []).find(function(i) { return i.id === itemId; });
    if (!it) return;
    Object.keys(fields).forEach(function(k) { it[k] = fields[k]; });
    it.name = tpl.name;
  } else {
    it = Object.assign({ id: typeof uniqueId === 'function' ? uniqueId() : Date.now(), name: tpl.name, qty: 1, equipped: false }, fields);
    pc.inventory = pc.inventory || [];
    pc.inventory.push(it);
  }
  if (typeof hydrateWeaponStats === 'function' && it.slot === 'weapon') hydrateWeaponStats(it);
  if (typeof recomputePcCombat === 'function') recomputePcCombat(pc);
  savePartyStorage();
  var lm = document.getElementById('item-lib-modal'); if (lm) lm.remove();
  var fm = document.getElementById('item-fx-modal'); if (fm) fm.remove();
  renderParty(); renderCombatants(); renderInventoryModal(pcId);
  showToast('📚 ' + tpl.name + ' added to ' + pc.name, 'success');
  editItemEffects(pcId, it.id); // open the editor so they can tweak immediately
}

// Library browser — grid of prebuilt items with their effect summary
var _libCtx = { pcId: 0, itemId: 0, q: '', cat: '' };
var LIB_CATS = [
  { key: '', label: 'All' }, { key: 'weapon', label: '⚔ Weapons' }, { key: 'armor', label: '🛡 Armor & Shields' },
  { key: 'wearable', label: '💍 Wearables' }, { key: 'wand', label: '🪄 Wands & Staves' }, { key: 'potion', label: '🧪 Potions' }
];
function libItemCategory(t) {
  var n = String(t.name || '').toLowerCase();
  if (/wand|staff|\brod\b/.test(n)) return 'wand';
  if (t.slot === 'armor' || t.slot === 'shield') return 'armor';
  if (t.slot === 'weapon') return 'weapon';
  if (t.slot === 'potion') return 'potion';
  if (t.slot === 'wearable') return 'wearable';
  return 'other';
}
function libChipStyle(on) {
  return 'font-size:11px;padding:4px 11px;border-radius:12px;cursor:pointer;border:1px solid ' +
    (on ? 'var(--gold)' : 'rgba(255,255,255,0.15)') + ';background:' + (on ? 'rgba(212,175,55,0.18)' : 'rgba(0,0,0,0.25)') +
    ';color:' + (on ? 'var(--gold)' : '#aaa') + ';';
}
function openItemLibrary(pcId, itemId) {
  _libCtx = { pcId: pcId, itemId: itemId || 0, q: '', cat: '' };
  var existing = document.getElementById('item-lib-modal'); if (existing) existing.remove();
  var ov = document.createElement('div');
  ov.id = 'item-lib-modal';
  ov.className = 'modal-overlay show';
  ov.style.zIndex = '2720';
  var esc2 = function(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  var target = itemId ? 'turn this item into it' : 'add it to ' + esc2((party.find(function(p){return p.id===pcId;})||{}).name);
  var cats = LIB_CATS.map(function(c) {
    return '<span data-cat="' + c.key + '" onclick="libSetCat(\'' + c.key + '\')" style="' + libChipStyle(c.key === '') + '">' + c.label + '</span>';
  }).join('');
  ov.innerHTML = '<div class="modal" style="max-width:540px;width:96%;max-height:88vh;display:flex;flex-direction:column;">' +
    '<h3 style="font-family:Cinzel,serif;color:var(--gold);margin-bottom:4px;">📚 Magic Item Library</h3>' +
    '<div style="font-size:11px;color:var(--text-dim);margin-bottom:10px;">Search or filter, then click one to ' + target + ' — tweak anything after in the effects editor.</div>' +
    '<input id="lib-search" oninput="libSearch(this.value)" autocomplete="off" placeholder="🔍 Search by name or effect (poison, fire, +2, stealth…)" style="width:100%;padding:9px 12px;font-size:14px;margin-bottom:8px;box-sizing:border-box;">' +
    '<div id="lib-cats" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">' + cats + '</div>' +
    '<div id="lib-count" style="font-size:10px;color:#666;margin-bottom:6px;"></div>' +
    '<div id="lib-list" style="overflow-y:auto;flex:1;min-height:120px;"></div>' +
    '<div class="modal-btns" style="margin-top:10px;"><button class="btn btn-ghost" onclick="document.getElementById(\'item-lib-modal\').remove()">Close</button></div>' +
  '</div>';
  ov.addEventListener('click', function(e) { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
  renderLibList();
}
function libSearch(v) { _libCtx.q = String(v || '').toLowerCase(); renderLibList(); }
function libSetCat(c) {
  _libCtx.cat = c;
  document.querySelectorAll('#lib-cats [data-cat]').forEach(function(el) { el.style.cssText = libChipStyle(el.getAttribute('data-cat') === c); });
  renderLibList();
}
function renderLibList() {
  var list = document.getElementById('lib-list'); if (!list) return;
  var lib = (typeof ITEM_LIBRARY !== 'undefined') ? ITEM_LIBRARY : [];
  var esc2 = function(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  var q = _libCtx.q, cat = _libCtx.cat, pcId = _libCtx.pcId, itemId = _libCtx.itemId;
  var out = [];
  lib.forEach(function(t, i) {
    if (cat && libItemCategory(t) !== cat) return;
    if (q && (t.name + ' ' + (t.desc || '') + ' ' + t.slot).toLowerCase().indexOf(q) < 0) return;
    out.push('<div onclick="applyLibraryItem(' + pcId + ',' + itemId + ',' + i + ')" style="padding:9px 11px;border:1px solid rgba(255,255,255,0.1);border-radius:6px;margin-bottom:6px;cursor:pointer;background:rgba(0,0,0,0.2);" onmouseover="this.style.borderColor=\'var(--gold)\'" onmouseout="this.style.borderColor=\'rgba(255,255,255,0.1)\'">' +
      '<div style="font-size:14px;color:var(--gold-light);font-family:Cinzel,serif;">' + esc2(t.name) + ' <span style="font-size:10px;color:#666;">' + esc2(t.slot) + '</span></div>' +
      '<div style="font-size:11px;color:var(--text-dim);margin-top:2px;">' + esc2(t.desc || '') + '</div>' +
    '</div>');
  });
  list.innerHTML = out.length ? out.join('') : '<div style="color:var(--text-dim);font-style:italic;padding:20px;text-align:center;">No items match — try a different search or filter.</div>';
  var cnt = document.getElementById('lib-count'); if (cnt) cnt.textContent = out.length + ' item' + (out.length === 1 ? '' : 's');
}

// Damage types + conditions used by the item builder dropdowns
var ITEM_DMG_TYPES = ['slashing','piercing','bludgeoning','fire','cold','lightning','thunder','poison','acid','necrotic','radiant','force','psychic'];
function itemConditionList() {
  // The conditions worth granting immunity to (skip stances/DM bookkeeping ones)
  var common = ['Poisoned','Prone','Frightened','Restrained','Stunned','Blinded','Deafened','Grappled','Charmed','Paralyzed','Petrified','Incapacitated','Unconscious','Exhaustion'];
  if (typeof CONDITION_EFFECTS !== 'undefined') {
    var keys = Object.keys(CONDITION_EFFECTS);
    common.forEach(function(c) { if (keys.indexOf(c) < 0) keys.push(c); });
    return common.filter(function(c) { return keys.indexOf(c) >= 0; });
  }
  return common;
}
// Toggle-chip helpers for the item builder — click instead of typing (no typos).
function fxChipStyle(on) {
  return 'display:inline-block;padding:3px 10px;margin:2px 4px 2px 0;border-radius:12px;font-size:11px;cursor:pointer;user-select:none;border:1px solid ' +
    (on ? 'var(--gold)' : 'rgba(255,255,255,0.15)') + ';background:' + (on ? 'rgba(212,175,55,0.18)' : 'rgba(0,0,0,0.25)') +
    ';color:' + (on ? 'var(--gold)' : '#bbb') + ';';
}
function fxChips(group, options, selected) {
  return options.map(function(o) {
    var on = (selected || []).indexOf(o) >= 0;
    return '<span class="fx-chip" data-group="' + group + '" data-val="' + o + '" data-on="' + (on ? '1' : '0') + '" onclick="fxToggleChip(this)" style="' + fxChipStyle(on) + '">' + o + '</span>';
  }).join('');
}
function fxToggleChip(el) {
  var on = el.getAttribute('data-on') !== '1';
  el.setAttribute('data-on', on ? '1' : '0');
  el.style.cssText = fxChipStyle(on);
}
function fxReadChips(group) {
  var out = [];
  document.querySelectorAll('.fx-chip[data-group="' + group + '"][data-on="1"]').forEach(function(el) { out.push(el.getAttribute('data-val')); });
  return out;
}
function fxSection(title, sub) {
  return '<div style="margin:14px 0 6px;padding-top:10px;border-top:1px solid rgba(212,175,55,0.18);">' +
    '<span style="font-size:10px;font-family:Cinzel,serif;letter-spacing:0.09em;color:var(--gold);">' + title + '</span>' +
    (sub ? '<div style="font-size:10px;color:#666;margin-top:2px;">' + sub + '</div>' : '') + '</div>';
}

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
  var oh = it.onHitSave || {};
  var ch = it.charges || {};
  var riders = (it.riderDamage && it.riderDamage.length) ? it.riderDamage.slice() : [];
  while (riders.length < 3) riders.push({});
  var esc2 = function(s) { return String(s || '').replace(/"/g, '&quot;'); };
  var typeOpts = function(sel) { return '<option value="">type</option>' + ITEM_DMG_TYPES.map(function(t) { return '<option value="' + t + '"' + (sel === t ? ' selected' : '') + '>' + t + '</option>'; }).join(''); };
  var condOpts = function(sel) { return '<option value="">— condition —</option>' + itemConditionList().map(function(c) { return '<option value="' + c + '"' + (sel === c ? ' selected' : '') + '>' + c + '</option>'; }).join(''); };
  var isWeapon = it.slot === 'weapon';

  var html = '<div class="modal" style="max-width:520px;width:96%;max-height:88vh;overflow-y:auto;">' +
    '<h3 style="font-family:Cinzel,serif;color:var(--gold);margin-bottom:2px;">✨ ' + esc2(it.name) + '</h3>' +
    '<div style="font-size:11px;color:var(--text-dim);margin-bottom:6px;">Craft the item. Everything here applies automatically while it\'s equipped. <a href="#" onclick="openItemLibrary(' + pcId + ',' + itemId + ');return false;" style="color:var(--gold-light);">📚 Load from library…</a></div>';

  // ── WEAPON section ──
  html += fxSection('⚔ WEAPON', isWeapon ? 'Base dice + magic, plus extra effects on every hit.' : 'Only applies if this item\'s category is Weapon.');
  html += '<div style="display:grid;grid-template-columns:70px 1fr 60px;gap:6px;margin-bottom:6px;align-items:end;">' +
    '<div class="field-group" style="margin:0;"><label>Dice</label><input id="fx-dice" value="' + esc2(it.dice || '') + '" placeholder="1d8" style="text-align:center;"></div>' +
    '<div class="field-group" style="margin:0;"><label>Damage type</label><select id="fx-dtype" style="width:100%;">' + typeOpts(it.damageType) + '</select></div>' +
    '<div class="field-group" style="margin:0;"><label>Magic +</label><input id="fx-magic" type="number" value="' + (it.magicBonus || 0) + '" style="text-align:center;" title="+X to hit AND damage"></div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:6px;">' +
      '<div class="field-group" style="margin:0;"><label>+ to-hit</label><input id="fx-tohit" type="number" value="' + (it.toHitBonus || 0) + '" style="text-align:center;" title="This weapon only, on top of magic"></div>' +
      '<div class="field-group" style="margin:0;"><label>+ damage</label><input id="fx-dmgbonus" type="number" value="' + (it.damageBonus || 0) + '" style="text-align:center;"></div>' +
      '<div class="field-group" style="margin:0;"><label>Crit on</label><select id="fx-crit" style="width:100%;"><option value="20"' + ((it.critRange||20)==20?' selected':'') + '>20</option><option value="19"' + (it.critRange==19?' selected':'') + '>19–20</option><option value="18"' + (it.critRange==18?' selected':'') + '>18–20</option></select></div>' +
    '</div>';

  // Rider damage rows
  html += '<label style="font-size:10px;color:var(--text-dim);">RIDER DAMAGE <span style="color:#666;">— extra dice of another type on every hit (2d10 poison…)</span></label>';
  riders.forEach(function(rd, i) {
    html += '<div style="display:grid;grid-template-columns:80px 1fr 90px;gap:5px;margin:4px 0;align-items:center;">' +
      '<input id="fx-rd-dice-' + i + '" value="' + esc2(rd.dice || '') + '" placeholder="2d10" style="font-size:12px;padding:5px;text-align:center;">' +
      '<select id="fx-rd-type-' + i + '" style="font-size:11px;padding:5px;">' + typeOpts(rd.type) + '</select>' +
      '<label style="font-size:10px;color:var(--text-dim);display:flex;align-items:center;gap:4px;"><input id="fx-rd-crit-' + i + '" type="checkbox"' + (rd.onCrit ? ' checked' : '') + '>crit only</label>' +
    '</div>';
  });

  // On-hit save
  html += '<label style="font-size:10px;color:var(--text-dim);margin-top:6px;display:block;">ON-HIT SAVE <span style="color:#666;">— target saves or suffers a condition</span></label>' +
    '<div style="display:grid;grid-template-columns:70px 60px 1fr 60px;gap:5px;margin:4px 0 2px;align-items:center;">' +
      '<select id="fx-oh-ability" style="font-size:11px;padding:5px;"><option value="">save</option>' + ['str','dex','con','int','wis','cha'].map(function(a){ return '<option value="' + a + '"' + (oh.ability===a?' selected':'') + '>' + a.toUpperCase() + '</option>'; }).join('') + '</select>' +
      '<input id="fx-oh-dc" type="number" value="' + (oh.dc || '') + '" placeholder="DC" style="font-size:12px;padding:5px;text-align:center;">' +
      '<select id="fx-oh-cond" style="font-size:11px;padding:5px;">' + condOpts(oh.condition) + '</select>' +
      '<input id="fx-oh-dur" type="number" value="' + (oh.duration || '') + '" placeholder="rds" style="font-size:12px;padding:5px;text-align:center;" title="Rounds (blank = until removed)">' +
    '</div>';

  // ── PASSIVE section ──
  html += fxSection('🛡 PASSIVE (while equipped)');
  html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px;">' +
      '<div class="field-group" style="margin:0;"><label>+ AC</label><input id="fx-ac" type="number" value="' + (it.acBonus || 0) + '" style="text-align:center;"></div>' +
      '<div class="field-group" style="margin:0;"><label>+ Speed ft</label><input id="fx-speed" type="number" value="' + (it.speedBonus || 0) + '" style="text-align:center;"></div>' +
      '<div class="field-group" style="margin:0;"><label>Light ft</label><input id="fx-light" type="number" value="' + (it.lightFt || 0) + '" style="text-align:center;"></div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px;">' +
      '<div class="field-group" style="margin:0;"><label title="Every attack, not just one weapon">+ hit (all)</label><input id="fx-allatk" type="number" value="' + (it.allAttackBonus || 0) + '" style="text-align:center;"></div>' +
      '<div class="field-group" style="margin:0;"><label>+ dmg (all)</label><input id="fx-alldmg" type="number" value="' + (it.allDamageBonus || 0) + '" style="text-align:center;"></div>' +
      '<div class="field-group" style="margin:0;"><label>+ all saves</label><input id="fx-savebonus" type="number" value="' + (it.saveBonus || 0) + '" style="text-align:center;"></div>' +
    '</div>' +
    '<label style="font-size:10px;color:var(--text-dim);">STAT BONUSES</label>' +
    '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin:4px 0 8px;">' +
      ['str','dex','con','int','wis','cha'].map(function(s) {
        return '<div style="text-align:center;"><div style="font-size:9px;color:var(--text-dim);">' + s.toUpperCase() + '</div><input id="fx-' + s + '" type="number" value="' + (st[s] || 0) + '" style="width:100%;text-align:center;font-size:12px;padding:4px 2px;"></div>';
      }).join('') +
    '</div>' +
    (function() {
      var skl = it.skillBonus || {}; var sklKeys = Object.keys(skl);
      var row = function(idx) {
        var k = sklKeys[idx] || ''; var v = k ? skl[k] : '';
        var opts = '<option value="">— skill —</option>' +
          SKILL_LIST.map(function(s) { return '<option value="' + s.key + '"' + (k === s.key ? ' selected' : '') + '>' + s.label + '</option>'; }).join('') +
          '<option value="all"' + (k === 'all' ? ' selected' : '') + '>ALL skills</option>';
        return '<div style="display:flex;gap:6px;margin-bottom:4px;"><select id="fx-skill-key-' + idx + '" style="flex:1;font-size:12px;padding:4px;">' + opts + '</select>' +
          '<input id="fx-skill-val-' + idx + '" type="number" value="' + (v || '') + '" placeholder="+" style="width:56px;text-align:center;"></div>';
      };
      return '<div style="margin:6px 0;"><label style="font-size:10px;font-family:Cinzel,serif;letter-spacing:0.08em;color:var(--text-dim);">SKILL BONUS</label>' + row(0) + row(1) + row(2) + '</div>';
    })() +
    '<label style="font-size:11px;color:var(--text-dim);display:flex;align-items:center;gap:6px;margin-bottom:4px;"><input id="fx-extraatk" type="checkbox"' + (it.grantsExtraAttack ? ' checked' : '') + '> Grants Extra Attack (2 attacks per Action)</label>';

  // ── DEFENSES ── (tap chips, no typing)
  var defRow = function(label, hint, group, opts, sel) {
    return '<div style="margin-bottom:9px;">' +
      '<div style="font-size:11px;color:var(--text-dim);margin-bottom:3px;">' + label + (hint ? ' <span style="color:#666;">' + hint + '</span>' : '') + '</div>' +
      '<div>' + fxChips(group, opts, sel) + '</div></div>';
  };
  html += fxSection('🧬 DEFENSES', 'Tap to toggle — no typing, no typos.');
  html += defRow('Resist', '(half damage)', 'resist', ITEM_DMG_TYPES, it.grantResist || []);
  html += defRow('Immune', '(no damage)', 'immune', ITEM_DMG_TYPES, it.grantImmune || []);
  html += defRow('Vulnerable', '(double — cursed)', 'vuln', ITEM_DMG_TYPES, it.grantVuln || []);
  html += defRow('Condition immunity', '', 'condimmune', itemConditionList(), it.conditionImmune || []);

  // ── GRANTED ACTION ──
  html += fxSection('🌟 GRANTED ACTION', 'An extra attack/blast this item lets you use (Flame Tongue Blast, wand bolt…).');
  html += '<div style="display:grid;grid-template-columns:2fr 56px 56px 70px 1fr;gap:5px;margin-bottom:6px;">' +
      '<input id="fx-aname" placeholder="Fire Bolt" value="' + esc2(ga.name) + '" style="font-size:12px;padding:5px;">' +
      '<input id="fx-arange" type="number" placeholder="ft" value="' + (ga.range || '') + '" style="font-size:12px;padding:5px;text-align:center;">' +
      '<input id="fx-abonus" type="number" placeholder="+hit" value="' + (ga.bonus !== undefined ? ga.bonus : '') + '" style="font-size:12px;padding:5px;text-align:center;">' +
      '<input id="fx-adice" placeholder="2d6" value="' + esc2(ga.dice) + '" style="font-size:12px;padding:5px;">' +
      '<select id="fx-atype" style="font-size:11px;padding:5px;">' + typeOpts(ga.damageType) + '</select>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:4px;">' +
      '<div class="field-group" style="margin:0;"><label>Charges (max)</label><input id="fx-charges" type="number" value="' + (ch.max || '') + '" placeholder="e.g. 3" style="text-align:center;"></div>' +
      '<div class="field-group" style="margin:0;"><label>Recharge</label><select id="fx-recharge" style="width:100%;"><option value="">— none —</option><option value="short"' + (ch.per==='short'?' selected':'') + '>Short rest</option><option value="long"' + (ch.per==='long'?' selected':'') + '>Long rest</option><option value="dawn"' + (ch.per==='dawn'?' selected':'') + '>Dawn</option></select></div>' +
    '</div>';

  html += '<div class="modal-btns" style="margin-top:14px;">' +
      '<button class="btn btn-gold" onclick="saveItemEffects(' + pcId + ',' + itemId + ')">💾 Save</button>' +
      '<button class="btn btn-ghost" onclick="document.getElementById(\'item-fx-modal\').remove()">Cancel</button>' +
    '</div></div>';
  ov.innerHTML = html;
  ov.addEventListener('click', function(e) { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
}

function saveItemEffects(pcId, itemId) {
  var pc = party.find(function(p) { return p.id === pcId; });
  var it = pc && (pc.inventory || []).find(function(i) { return i.id === itemId; });
  if (!it) return;
  var num = function(id) { var el = document.getElementById(id); return el ? (parseInt(el.value) || 0) : 0; };
  var val = function(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
  var chk = function(id) { var el = document.getElementById(id); return !!(el && el.checked); };
  var csv = function(id) {
    return (val(id) || '').split(',').map(function(s) { return s.trim().toLowerCase(); }).filter(function(s) { return ITEM_DMG_TYPES.indexOf(s) >= 0; });
  };
  var csvRaw = function(id) { return (val(id) || '').split(',').map(function(s) { return s.trim(); }).filter(Boolean); };

  // set the key to a truthy value, or DELETE it — never leave `undefined` behind
  // (a single undefined value makes Firestore reject the whole cloud save).
  var setDel = function(key, v) { if (v) it[key] = v; else delete it[key]; };

  // Weapon
  var d = val('fx-dice'); if (d) it.dice = d;
  var dt = val('fx-dtype'); if (dt) it.damageType = dt;
  setDel('magicBonus', num('fx-magic'));
  setDel('toHitBonus', num('fx-tohit'));
  setDel('damageBonus', num('fx-dmgbonus'));
  var cr = parseInt(val('fx-crit')) || 20; setDel('critRange', cr < 20 ? cr : 0);
  var riders = [];
  for (var i = 0; i < 3; i++) {
    var rdd = val('fx-rd-dice-' + i);
    if (rdd) { var rd = { dice: rdd, type: val('fx-rd-type-' + i) || '' }; if (chk('fx-rd-crit-' + i)) rd.onCrit = true; riders.push(rd); }
  }
  setDel('riderDamage', riders.length ? riders : null);
  var ohAb = val('fx-oh-ability'), ohDc = num('fx-oh-dc'), ohCond = val('fx-oh-cond');
  setDel('onHitSave', (ohAb && ohDc && ohCond) ? { ability: ohAb, dc: ohDc, condition: ohCond, duration: num('fx-oh-dur') || 0 } : null);

  // Passive
  setDel('acBonus', num('fx-ac'));
  setDel('speedBonus', num('fx-speed'));
  setDel('lightFt', num('fx-light'));
  setDel('allAttackBonus', num('fx-allatk'));
  setDel('allDamageBonus', num('fx-alldmg'));
  setDel('saveBonus', num('fx-savebonus'));
  setDel('grantsExtraAttack', chk('fx-extraatk'));
  // Skill bonuses — from the skill dropdowns
  var sk = {}, skAny = false;
  for (var si = 0; si < 3; si++) {
    var kk = val('fx-skill-key-' + si), vv = num('fx-skill-val-' + si);
    if (kk && vv) { sk[kk] = vv; skAny = true; }
  }
  setDel('skillBonus', skAny ? sk : null);
  var stats = {}, any = false;
  ['str','dex','con','int','wis','cha'].forEach(function(s) { var v = num('fx-' + s); if (v) { stats[s] = v; any = true; } });
  setDel('statBonuses', any ? stats : null);

  // Defenses — from the toggle chips
  it.grantResist = fxReadChips('resist'); if (!it.grantResist.length) delete it.grantResist;
  it.grantImmune = fxReadChips('immune'); if (!it.grantImmune.length) delete it.grantImmune;
  it.grantVuln = fxReadChips('vuln'); if (!it.grantVuln.length) delete it.grantVuln;
  it.conditionImmune = fxReadChips('condimmune'); if (!it.conditionImmune.length) delete it.conditionImmune;

  // Granted action + charges
  var an = val('fx-aname');
  setDel('grantAction', an ? {
    name: an, kind: 'attack', range: num('fx-arange') || 5, bonus: num('fx-abonus') || 0,
    dice: val('fx-adice') || '1d6',
    damageType: val('fx-atype') || (typeof inferDamageType === 'function' ? inferDamageType(an) : '')
  } : null);
  var chMax = num('fx-charges'), chPer = val('fx-recharge');
  setDel('charges', chMax ? { max: chMax, left: (it.charges && typeof it.charges.left === 'number' && it.charges.max === chMax) ? it.charges.left : chMax, per: chPer || 'long' } : null);

  if (typeof recomputePcCombat === 'function') recomputePcCombat(pc);
  savePartyStorage();
  renderParty();
  renderCombatants();
  var m = document.getElementById('item-fx-modal');
  if (m) m.remove();
  renderInventoryModal(pcId);
  showToast('✨ ' + it.name + ' enchanted', 'success');
}
