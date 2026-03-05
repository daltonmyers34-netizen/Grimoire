// ============================================================
// NPCs
// ============================================================
const PRELOADED_NPCS = [
  {
    id: 1, name: "Aldric Thornwood", role: "Innkeeper", race: "Human", alignment: "Lawful Good",
    tags: ["friendly", "quest-giver", "town"],
    desc: "A barrel-chested man in his late fifties with a snow-white beard and laugh lines carved deep into his ruddy face. He smells perpetually of pipe smoke and roasted boar. Moves with a slight limp from an old battle wound he never speaks of.",
    personality: "Warm and welcoming to travelers, but fiercely protective of his regulars. Despises thieves and dishonesty above all else. Secretly a retired soldier who misses the camaraderie of his unit.",
    hp: 22, ac: 10, cr: "1/8",
    traits: [
      { name: "Homebrewed Wisdom", text: "Aldric always has an old soldier's proverb for every situation." },
      { name: "The Back Room", text: "He keeps a locked room for guild members — for a price." }
    ],
    stats: { str: 14, dex: 9, con: 15, int: 11, wis: 14, cha: 13 }
  },
  {
    id: 2, name: "Vex Silvertongue", role: "Information Broker / Fence", race: "Half-Elf", alignment: "Chaotic Neutral",
    tags: ["shady", "merchant", "city", "criminal"],
    desc: "Slight and androgynous, with silver-streaked hair cut asymmetrically above one ear. Dresses in layers of dark fabric adorned with hidden pockets. Eyes the color of wet slate that seem to catalog everything in a room within seconds of entering.",
    personality: "Everything has a price. Deals in information as much as goods. Never lies outright — but says only what is advantageous. Has a soft spot for street orphans, anonymously funding a local shelter.",
    hp: 18, ac: 13, cr: "1/4",
    traits: [
      { name: "Silver Tongue", text: "Advantage on Deception and Persuasion checks in mercantile contexts." },
      { name: "Dead Drop Network", text: "Can get a message anywhere in the city within 2 hours for 5gp." }
    ],
    stats: { str: 8, dex: 16, con: 10, int: 15, wis: 12, cha: 18 }
  },
  {
    id: 3, name: "Sister Morvaine", role: "Cleric of the Death God", race: "Tiefling", alignment: "Lawful Neutral",
    tags: ["temple", "religious", "mysterious", "potential-ally"],
    desc: "Tall and willowy with obsidian skin and bone-white hair pulled into tight braids wound with silver thread. Her eyes are solid silver — unsettling, but serene. Speaks in measured tones, as if each word is selected from a limited supply.",
    personality: "Believes death is sacred and not to be feared. Has no patience for necromancy or undeath, which she views as blasphemy. Will heal the dying without question, but demands honesty in exchange. Knows dark secrets of the city's ruling families.",
    hp: 38, ac: 15, cr: "2",
    traits: [
      { name: "Last Rites", text: "Can cast Speak with Dead once per day without components." },
      { name: "Death's Favour", text: "Immune to the frightened condition. Undead suffer disadv. attacking her." }
    ],
    stats: { str: 11, dex: 13, con: 14, int: 16, wis: 18, cha: 14 }
  },
  {
    id: 4, name: "Captain Bram Dunn", role: "City Guard Captain", race: "Human", alignment: "Lawful Neutral",
    tags: ["guard", "authority", "town", "antagonist"],
    desc: "Heavyset and imposing, with a shaved head and a thick black mustache going grey at the tips. Wears his dented armor like a second skin. A scar bisects his left eyebrow from a street fight twenty years ago.",
    personality: "Tired. Has seen too much. Believes in order above all — the law is the law, even when the law is wrong. Can be bribed, but only if convinced it serves the city's greater order. Secretly investigating his own superior for corruption.",
    hp: 52, ac: 16, cr: "3",
    traits: [
      { name: "Tactical Command", text: "Allies within 30ft gain +1 to attack rolls while Bram is conscious." },
      { name: "City Authority", text: "Can call 1d6+2 guards as reinforcements with 10 minutes notice." }
    ],
    stats: { str: 17, dex: 12, con: 16, int: 11, wis: 13, cha: 11 }
  },
  {
    id: 5, name: "The Pale Scholar", role: "Arcane Researcher (Unknown Allegiance)", race: "Unknown", alignment: "Unknown",
    tags: ["mysterious", "arcane", "potential-villain", "quest-giver"],
    desc: "Always seen in a voluminous grey robe with the hood raised. No one has seen their face. Hands appear skeletal — either from age, illness, or something else. They smell faintly of ozone and old books. Appear and disappear without explanation.",
    personality: "Communicates in questions, never direct answers. Is obsessed with a specific arcane theory involving the boundary between life and death. Has approached multiple scholars and adventurers with cryptic tasks. Motivations entirely unclear.",
    hp: 45, ac: 12, cr: "5",
    traits: [
      { name: "Inscrutable", text: "Immune to Detect Thoughts and similar divination magic." },
      { name: "Arcane Scholarship", text: "Advantage on all Arcana checks. Can identify magic items on touch." }
    ],
    stats: { str: 8, dex: 12, con: 11, int: 20, wis: 17, cha: 14 }
  },
  {
    id: 6, name: "Grunda Ironveil", role: "Blacksmith", race: "Dwarf", alignment: "Neutral Good",
    tags: ["merchant", "craftsperson", "town", "friendly"],
    desc: "A stout dwarven woman whose powerful arms are covered in old forge scars. Iron-grey hair in twin braids bound with copper rings. Laughs loudly and often. Chews on an unlit pipe.",
    personality: "Takes immense pride in her craft. Will not sell weapons to anyone she suspects of harming innocents. Offers fair prices but won't bargain down. Has a running bet with the local fletcher she will never admit she's losing.",
    hp: 35, ac: 13, cr: "1/2",
    traits: [
      { name: "Master Smith", text: "Weapons she crafts deal +1 damage for 1 week before wearing off." },
      { name: "Appraiser's Eye", text: "Can identify the quality and origin of any metalwork at a glance." }
    ],
    stats: { str: 18, dex: 9, con: 17, int: 13, wis: 12, cha: 11 }
  }
];

const PRELOADED_LOCATIONS = [
  {
    id: 1, name: "The Ember & Ash Inn", type: "Tavern / Inn",
    desc: "A low-beamed tavern built into the remains of a burned-out temple, its crumbling stone walls patched with mismatched timber. Smoke-stained murals of forgotten gods still cling to the walls above the fireplace. The smell is: roasting meat, sawdust, and too many people. A one-eyed cat named Scar rules the hearth.",
    notes: "Run by Aldric Thornwood. Three rooms upstairs (2gp/night). Back room reserved for guild use. Rumours board above the bar — roll a d6 for a random hook. Kitchen does a famous black-pepper mutton stew."
  },
  {
    id: 2, name: "Ashford", type: "Town / Village",
    desc: "A walled market town of roughly 2,000 souls perched at the crossroads of two trade routes. Stone-cobbled main street with cramped timber-framed buildings leaning toward each other overhead. The town takes its name from the grey ash trees lining the river road — though locals whisper the name came first from a great fire, not the trees.",
    notes: "Mayor Orvyn Grelt (corrupt, in debt to a thieves' guild). Notable locations: The Ember & Ash Inn, Grunda's Forge, The Temple of the Silver Flame, the Old Gatehouse (abandoned). Weekly market on Thursdays. Thieves' guild presence moderate."
  },
  {
    id: 3, name: "The Hollow Warrens", type: "Dungeon",
    desc: "A network of collapsed tunnels beneath the old city quarter, now inhabited by a goblin clan and worse. The air is wet and cold, smelling of mold and old death. Makeshift bridges of rope and plank cross flooded chambers. Bioluminescent fungi provide dim blue light in deeper sections, casting everything in unsettling shadows.",
    notes: "Three levels. Level 1: Goblin scouts and traps. Level 2: The clan's den, led by Skrix the Shrewd (smarter than he looks). Level 3: Something older and darker that even the goblins avoid. Rumoured to connect to the city sewers."
  },
  {
    id: 4, name: "The Thornwood", type: "Forest",
    desc: "An ancient and reputedly cursed forest east of the trade road. The trees grow unnaturally close, their roots erupting from the soil in gnarled knots that make travel treacherous. Birdsong is absent. Travellers report a persistent feeling of being watched from the moment they cross the treeline.",
    notes: "Home to a reclusive druid circle (potentially hostile, potentially allied). A ruined watchtower at its centre marked on old maps as 'the Shepherd's Eye'. Wolves here are unusual — some appear to understand human speech."
  }
];

function initNPCs() {
  // Only set preloaded defaults if npcs array is empty (cloud state may have already loaded)
  if (!npcs || npcs.length === 0) {
    npcs = [...PRELOADED_NPCS];
  }
  if (!locations || locations.length === 0) {
    locations = [...PRELOADED_LOCATIONS];
  }
  renderNPCs();
  renderLocations();
  loadNotes();
}

function renderNPCs(filter = '') {
  const grid = document.getElementById('npc-grid');
  const filtered = filter
    ? npcs.filter(n => n.name.toLowerCase().includes(filter) || n.role.toLowerCase().includes(filter) || (n.tags || []).join(' ').toLowerCase().includes(filter) || (n.desc || '').toLowerCase().includes(filter))
    : npcs;
  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty-state"><div class="icon">🧙</div>No NPCs found.</div>';
    return;
  }
  grid.innerHTML = filtered.map(n => `
    <div class="npc-card" onclick="showNPCDetail(${n.id})">
      <div class="npc-card-header">
        <div>
          <div class="npc-name">${n.name}</div>
          <div class="npc-role">${n.race} · ${n.role}</div>
        </div>
        <div style="font-family:Cinzel,serif;font-size:11px;color:var(--text-dim);">${n.alignment || ''}</div>
      </div>
      <div class="npc-desc">${n.desc}</div>
      <div class="npc-tags">${(n.tags||[]).map(t => `<span class="tag">${t}</span>`).join('')}</div>
    </div>
  `).join('');
}

function filterNPCs() {
  renderNPCs(document.getElementById('npc-search').value.toLowerCase().trim());
}

function showNPCDetail(id) {
  const n = npcs.find(x => x.id === id);
  if (!n) return;
  const mod = v => { const m = Math.floor((v - 10) / 2); return (m >= 0 ? '+' : '') + m; };
  const stats = n.stats || { str:10,dex:10,con:10,int:10,wis:10,cha:10 };
  const traits = (n.traits || []).map(t => `<div class="trait"><span class="trait-name">${t.name}.</span> ${t.text}</div>`).join('');
  document.getElementById('npc-detail-content').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
      <div>
        <div class="npc-detail-name">${n.name}</div>
        <div style="color:var(--text-dim);font-style:italic;font-size:15px;">${n.race} ${n.role} · ${n.alignment || 'Unknown Alignment'}</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="closeNPCDetailBtn()" style="margin-top:4px">✕ Close</button>
    </div>
    <div class="npc-stat-block">
      <div style="display:flex;gap:20px;font-size:14px;">
        <span><strong style="color:#d4b880">HP:</strong> ${n.hp}</span>
        <span><strong style="color:#d4b880">AC:</strong> ${n.ac}</span>
        <span><strong style="color:#d4b880">CR:</strong> ${n.cr}</span>
      </div>
      <div class="npc-stats-row">
        ${['STR','DEX','CON','INT','WIS','CHA'].map((s,i) => {
          const keys = ['str','dex','con','int','wis','cha'];
          const v = stats[keys[i]] || 10;
          return `<div class="npc-stat"><div class="npc-stat-name">${s}</div><div class="npc-stat-val">${v}</div><div class="npc-stat-mod">${mod(v)}</div></div>`;
        }).join('')}
      </div>
    </div>
    <div class="npc-section-title">Description</div>
    <p style="font-size:16px;line-height:1.7;color:#d4b880">${n.desc}</p>
    <div class="npc-section-title">Personality & Motivation</div>
    <p style="font-size:16px;line-height:1.7;color:#d4b880">${n.personality}</p>
    ${traits ? `<div class="npc-section-title">Traits & Abilities</div>${traits}` : ''}
    <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;">
      ${(n.tags||[]).map(t => `<span class="tag">${t}</span>`).join('')}
    </div>
    <div style="margin-top:16px;display:flex;gap:8px;">
      <button class="btn btn-gold btn-sm" onclick="addToInitiativeFromNPC(${n.id})">+ Add to Initiative</button>
      <button class="btn btn-blood btn-sm" onclick="deleteNPC(${n.id})">Delete NPC</button>
    </div>
  `;
  document.getElementById('npc-detail-overlay').classList.add('show');
}

function addToInitiativeFromNPC(id) {
  const n = npcs.find(x => x.id === id);
  if (!n) return;
  const init = Math.floor(Math.random() * 20) + 1;
  combatants.push({ id: Date.now(), name: n.name, init, hp: n.hp, maxHp: n.hp, ac: n.ac, type: 'enemy', conditions: [] });
  combatants.sort((a,b) => b.init - a.init);
  renderCombatants();
  if (window.cloudSave) window.cloudSave();
  closeNPCDetailBtn();
  alert(`${n.name} added to initiative with roll of ${init}! Switch to the Initiative tab.`);
}

function deleteNPC(id) {
  if (!confirm('Delete this NPC?')) return;
  npcs = npcs.filter(x => x.id !== id);
  closeNPCDetailBtn();
  renderNPCs();

  if (window.cloudSave) window.cloudSave();
}

function closeNPCDetailBtn() {
  document.getElementById('npc-detail-overlay').classList.remove('show');
}

function closeNPCDetail(e) {
  if (e.target === document.getElementById('npc-detail-overlay')) closeNPCDetailBtn();
}

function showAddNPC() { document.getElementById('npc-add-panel').style.display = 'block'; }
function hideAddNPC() { document.getElementById('npc-add-panel').style.display = 'none'; }

function saveNPC() {
  const name = document.getElementById('anpc-name').value.trim();
  if (!name) return alert('Name required');
  npcs.push({
    id: Date.now(),
    name,
    role: document.getElementById('anpc-role').value,
    race: document.getElementById('anpc-race').value,
    alignment: document.getElementById('anpc-align').value,
    desc: document.getElementById('anpc-desc').value,
    personality: document.getElementById('anpc-personality').value,
    hp: parseInt(document.getElementById('anpc-hp').value) || 10,
    ac: parseInt(document.getElementById('anpc-ac').value) || 10,
    cr: document.getElementById('anpc-cr').value || '—',
    tags: document.getElementById('anpc-tags').value.split(',').map(t => t.trim()).filter(Boolean),
    traits: [],
    stats: { str:10,dex:10,con:10,int:10,wis:10,cha:10 }
  });
  hideAddNPC();
  renderNPCs();

  if (window.cloudSave) window.cloudSave();
}

function showParseNPC() {
  document.getElementById('npc-parse-panel').style.display = 'block';
  document.getElementById('parse-result').classList.remove('show');
}
function hideParse() { document.getElementById('npc-parse-panel').style.display = 'none'; }

function parseNPC() {
  const text = document.getElementById('parse-input').value.trim();
  if (!text) return;
  // Simple text parsing
  const parsed = smartParseText(text, 'npc');
  const resultEl = document.getElementById('parse-result');
  resultEl.textContent = `Parsed NPC Created:\n\nName: ${parsed.name}\nRole: ${parsed.role}\nRace: ${parsed.race}\nHP: ${parsed.hp} · AC: ${parsed.ac}\nDescription: ${parsed.desc.substring(0,200)}...\n\n✅ NPC has been added to your library!`;
  resultEl.classList.add('show');
  npcs.push(parsed);
  renderNPCs();
}

function smartParseText(text, type) {
  const lines = text.split(/[\n.]+/).map(l => l.trim()).filter(Boolean);
  // Extract HP
  const hpMatch = text.match(/hp[:\s]+(\d+)/i) || text.match(/(\d+)\s*hit points/i) || text.match(/hp\s*(\d+)/i);
  const acMatch = text.match(/ac[:\s]+(\d+)/i) || text.match(/armor class\s*(\d+)/i);
  const crMatch = text.match(/cr[:\s]+([\d\/]+)/i) || text.match(/challenge\s*([\d\/]+)/i);
  // Extract name (first capitalized word sequence)
  const nameMatch = text.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/);
  const name = nameMatch ? nameMatch[1] : 'Unknown';
  // Race detection
  const races = ['human','elf','dwarf','halfling','gnome','orc','tiefling','dragonborn','half-elf','half-orc','goblin','kobold'];
  const race = races.find(r => text.toLowerCase().includes(r)) || 'Unknown';
  // Role detection
  const roles = ['wizard','warrior','ranger','rogue','cleric','paladin','bard','druid','fighter','sorcerer','warlock','monk','barbarian','innkeeper','merchant','guard','assassin','thief','scholar'];
  const role = roles.find(r => text.toLowerCase().includes(r)) || 'NPC';
  // Get description (first 2 sentences)
  const desc = lines.slice(0, 2).join('. ');
  const personality = lines.slice(2, 4).join('. ');
  return {
    id: Date.now(),
    name,
    role: role.charAt(0).toUpperCase() + role.slice(1),
    race: race.charAt(0).toUpperCase() + race.slice(1),
    alignment: 'True Neutral',
    desc,
    personality,
    hp: hpMatch ? parseInt(hpMatch[1]) : 20,
    ac: acMatch ? parseInt(acMatch[1]) : 12,
    cr: crMatch ? crMatch[1] : '1',
    tags: [role, race].filter(Boolean),
    traits: [],
    stats: { str:10, dex:10, con:10, int:10, wis:10, cha:10 }
  };
}

// ============================================================
// LOCATIONS
// ============================================================
function renderLocations(filter = '') {
  const list = document.getElementById('location-list');
  const filtered = filter
    ? locations.filter(l => l.name.toLowerCase().includes(filter) || l.type.toLowerCase().includes(filter) || l.desc.toLowerCase().includes(filter))
    : locations;
  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="icon">🏰</div>No locations found.</div>';
    return;
  }
  list.innerHTML = filtered.map(l => `
    <div class="location-card" onclick="toggleLocation(${l.id})">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div class="location-name">${l.name}</div>
          <div class="location-type">${l.type}</div>
        </div>
        <button class="btn btn-blood btn-sm" onclick="event.stopPropagation();deleteLocation(${l.id})">Delete</button>
      </div>
      <div class="location-desc">${l.desc}</div>
      <div id="loc-notes-${l.id}" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">
        <div style="font-family:Cinzel,serif;font-size:11px;letter-spacing:0.15em;color:var(--blood-light);margin-bottom:6px;">DM NOTES</div>
        <div style="font-size:15px;color:var(--text-dim);line-height:1.6">${l.notes}</div>
      </div>
    </div>
  `).join('');
}

function toggleLocation(id) {
  const el = document.getElementById('loc-notes-' + id);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function filterLocations() {
  renderLocations(document.getElementById('loc-search').value.toLowerCase());
}

function showAddLocation() { document.getElementById('loc-add-panel').style.display = 'block'; }
function hideAddLocation() { document.getElementById('loc-add-panel').style.display = 'none'; }

function saveLocation() {
  const name = document.getElementById('aloc-name').value.trim();
  if (!name) return alert('Name required');
  locations.push({
    id: Date.now(),
    name,
    type: document.getElementById('aloc-type').value,
    desc: document.getElementById('aloc-desc').value,
    notes: document.getElementById('aloc-notes').value
  });
  hideAddLocation();
  renderLocations();

  if (window.cloudSave) window.cloudSave();
}

function deleteLocation(id) {
  if (!confirm('Delete this location?')) return;
  locations = locations.filter(x => x.id !== id);
  renderLocations();

  if (window.cloudSave) window.cloudSave();
}

// ============================================================
// NOTES (auto-save to localStorage)
// ============================================================
function loadNotes() {
  document.getElementById('session-notes').value = localStorage.getItem('dm-session-notes') || '';
  document.getElementById('plot-notes').value = localStorage.getItem('dm-plot-notes') || '';
}
document.addEventListener('input', (e) => {
  if (e.target.id === 'session-notes') { localStorage.setItem('dm-session-notes', e.target.value); if(window.cloudSave) window.cloudSave(); }
  if (e.target.id === 'plot-notes') { localStorage.setItem('dm-plot-notes', e.target.value); if(window.cloudSave) window.cloudSave(); }
});
function clearNotes() {
  if (!confirm('Clear all session notes?')) return;
  document.getElementById('session-notes').value = '';
  localStorage.removeItem('dm-session-notes');
}
function clearPlotNotes() {
  if (!confirm('Clear plot hooks & threads?')) return;
  document.getElementById('plot-notes').value = '';
  localStorage.removeItem('dm-plot-notes');
}
