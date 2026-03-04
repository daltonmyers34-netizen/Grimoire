// ============================================================
// AI INTEGRATION (Claude API via OpenRouter or direct Anthropic)
// ============================================================
// lastGeneratedNPC, lastEncounterData, lastGeneratedLocation declared in app.js

async function callClaudeAPI(prompt, maxTokens) {
  if (maxTokens === undefined) maxTokens = 1000;
  if (!window.ANTHROPIC_KEY) throw new Error('No API key. Tap the key icon in the top bar.');

  var key = window.ANTHROPIC_KEY;
  var isOpenRouter = key.indexOf('sk-or-') === 0;

  // Build request — key goes in URL path to avoid Authorization header (triggers CORS preflight)
  // Simple POST with only Content-Type: application/json avoids preflight on iOS Safari
  var url, bodyObj, resp, data, text;

  if (isOpenRouter) {
    // Pass key via query param to avoid Authorization header & CORS preflight
    url = 'https://openrouter.ai/api/v1/chat/completions';
    bodyObj = {
      model: 'anthropic/claude-haiku-4-5',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    };
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + key
        },
        body: JSON.stringify(bodyObj),
        mode: 'cors',
        credentials: 'omit'
      });
    } catch(fetchErr) {
      // fetch blocked by Safari — try XHR which sometimes handles CORS differently
      return await callClaudeXHR(url, key, bodyObj, 'openrouter');
    }
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error('API error ' + resp.status + ': ' + errText.slice(0, 200));
    }
    try { data = await resp.json(); } catch(e) { throw new Error('Bad response from OpenRouter'); }
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    text = (data.choices && data.choices[0] && data.choices[0].message) ? data.choices[0].message.content : '';
  } else {
    url = 'https://api.anthropic.com/v1/messages';
    bodyObj = {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    };
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-ipc': 'true'
        },
        body: JSON.stringify(bodyObj),
        mode: 'cors',
        credentials: 'omit'
      });
    } catch(fetchErr) {
      return await callClaudeXHR(url, key, bodyObj, 'anthropic');
    }
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error('API error ' + resp.status + ': ' + errText.slice(0, 200));
    }
    try { data = await resp.json(); } catch(e) { throw new Error('Bad response from Anthropic'); }
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    text = (data.content || []).map(function(b) { return b.text || ''; }).join('');
  }

  if (!text) throw new Error('Empty API response. Check your key has credits.');
  return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

function callClaudeXHR(url, key, bodyObj, provider) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    if (provider === 'openrouter') {
      xhr.setRequestHeader('Authorization', 'Bearer ' + key);
    } else {
      xhr.setRequestHeader('x-api-key', key);
      xhr.setRequestHeader('anthropic-version', '2023-06-01');
      xhr.setRequestHeader('anthropic-dangerous-direct-browser-ipc', 'true');
    }
    xhr.withCredentials = false;
    xhr.onload = function() {
      try {
        var data = JSON.parse(xhr.responseText);
        if (data.error) { reject(new Error(data.error.message || JSON.stringify(data.error))); return; }
        var text = '';
        if (provider === 'openrouter') {
          text = (data.choices && data.choices[0] && data.choices[0].message) ? data.choices[0].message.content : '';
        } else {
          text = (data.content || []).map(function(b) { return b.text || ''; }).join('');
        }
        if (!text) { reject(new Error('Empty response')); return; }
        resolve(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
      } catch(e) { reject(new Error('Parse error: ' + e.message)); }
    };
    xhr.onerror = function() {
      reject(new Error('Network blocked. You need to host this file on HTTPS. See github.com/new — free hosting in 2 min.'));
    };
    xhr.send(JSON.stringify(bodyObj));
  });
}



async function generateNPC() {
  const align   = document.getElementById('npc-gen-align').value;
  const race    = document.getElementById('npc-gen-race').value;
  const role    = document.getElementById('npc-gen-role').value;
  const context = document.getElementById('npc-gen-context').value.trim();
  const btn     = document.getElementById('npc-gen-btn');
  const resultDiv = document.getElementById('npc-gen-result');

  btn.disabled = true;
  btn.textContent = '⏳ Generating...';
  resultDiv.style.display = 'block';
  document.getElementById('npc-gen-card').innerHTML = '<div style="color:var(--text-dim);padding:20px;text-align:center;font-family:Cinzel,serif;">Consulting the fates...</div>';

  const alignLabel = {good:'Good/Heroic', neutral:'Neutral/Ambiguous', evil:'Evil/Villainous', any:'Any alignment (surprise me)'}[align] || align;
  const raceLabel  = race === 'any' ? 'any race' : race;
  const roleLabel  = role === 'any' ? 'any role' : role;

  const prompt = `You are a D&D 5e NPC designer. Create a memorable, richly characterized NPC.

Parameters:
- Alignment tendency: ${alignLabel}
- Race: ${raceLabel}
- Role/occupation: ${roleLabel}
- Story context: ${context || 'none — make them broadly useful in a fantasy setting'}

Respond ONLY with a valid JSON object, no markdown fences, no extra text:
{
  "name": "Full NPC Name",
  "race": "Race",
  "role": "Job/Title",
  "alignment": "Full alignment (e.g. Chaotic Neutral)",
  "appearance": "2-3 vivid sentences describing physical appearance, mannerisms, and distinctive features",
  "personality": "2-3 sentences on personality, motivations, and secrets or flaws",
  "hook": "1-2 sentences on how they connect to adventurers or the story",
  "hp": 22,
  "ac": 12,
  "cr": "1/2",
  "stats": {"str":10,"dex":12,"con":11,"int":14,"wis":13,"cha":16},
  "traits": [
    {"name":"Trait Name","text":"What it does mechanically or narratively."}
  ]
}`;

  try {
    const clean = await callClaudeAPI(prompt, 1000);
    const npc = JSON.parse(clean);
    lastGeneratedNPC = npc;
    renderGeneratedNPC(npc);
  } catch(e) {
    console.error('NPC generation error:', e);
    document.getElementById('npc-gen-card').innerHTML =
      `<div style="color:var(--blood-light);padding:12px;line-height:1.6;">
        <strong>Error:</strong> ${e.message}<br>
        <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
          <button onclick="promptAPIKey()" style="padding:6px 12px;background:rgba(212,175,55,0.15);border:1px solid var(--gold);border-radius:4px;color:var(--gold);cursor:pointer;font-family:Cinzel,serif;font-size:11px;">🔑 Set API Key</button>
          <button onclick="generateNPC()" style="padding:6px 12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:4px;color:#f0e6cc;cursor:pointer;font-size:11px;">↺ Retry</button>
        </div>
      </div>`;
  }

  btn.disabled = false;
  btn.textContent = '⚡ Generate NPC';
}

function renderGeneratedNPC(npc) {
  const mod = s => { const m = Math.floor((s-10)/2); return m>=0?'+'+m:''+m; };
  const alignColor = {
    'Lawful Good':'#3498db','Neutral Good':'#2ecc71','Chaotic Good':'#1abc9c',
    'Lawful Neutral':'#95a5a6','True Neutral':'#95a5a6','Chaotic Neutral':'#e67e22',
    'Lawful Evil':'#9b59b6','Neutral Evil':'#e74c3c','Chaotic Evil':'#c0392b'
  }[npc.alignment] || '#888';

  const statsHTML = npc.stats ? ['STR','DEX','CON','INT','WIS','CHA'].map((s,i) => {
    const val = [npc.stats.str,npc.stats.dex,npc.stats.con,npc.stats.int,npc.stats.wis,npc.stats.cha][i]||10;
    return `<div class="party-stat"><div class="party-stat-val">${mod(val)}</div><div class="party-stat-lbl">${s}</div></div>`;
  }).join('') : '';

  const traitsHTML = (npc.traits||[]).map(t =>
    `<div style="font-size:12px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
      <strong style="color:var(--gold-light);">${t.name}.</strong> <span style="color:var(--parchment);">${t.text}</span>
    </div>`
  ).join('');

  document.getElementById('npc-gen-card').innerHTML = `
    <div style="background:linear-gradient(135deg,rgba(20,12,4,0.95),rgba(32,20,8,0.9));border:1px solid rgba(212,175,55,0.3);border-radius:8px;padding:14px;border-top:3px solid ${alignColor};">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <div>
          <div style="font-family:Cinzel,serif;font-size:17px;color:var(--gold);font-weight:bold;">${npc.name}</div>
          <div style="font-size:12px;color:var(--text-dim);margin-top:2px;">${npc.race} · ${npc.role}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px;color:${alignColor};font-family:Cinzel,serif;">${npc.alignment}</div>
          <div style="font-size:11px;color:var(--text-dim);">HP ${npc.hp} · AC ${npc.ac} · CR ${npc.cr}</div>
        </div>
      </div>
      ${npc.stats ? `<div class="party-stats-row" style="margin-bottom:10px;">${statsHTML}</div>` : ''}
      <div style="font-size:13px;color:var(--parchment);line-height:1.6;margin-bottom:8px;"><strong style="color:var(--gold-light);font-size:10px;font-family:Cinzel,serif;letter-spacing:0.1em;">APPEARANCE</strong><br>${npc.appearance}</div>
      <div style="font-size:13px;color:var(--parchment);line-height:1.6;margin-bottom:8px;"><strong style="color:var(--gold-light);font-size:10px;font-family:Cinzel,serif;letter-spacing:0.1em;">PERSONALITY</strong><br>${npc.personality}</div>
      <div style="font-size:13px;color:var(--parchment);line-height:1.6;margin-bottom:8px;font-style:italic;"><strong style="color:var(--gold-light);font-size:10px;font-family:Cinzel,serif;letter-spacing:0.1em;">STORY HOOK</strong><br>${npc.hook}</div>
      ${traitsHTML ? `<div style="margin-top:8px;"><div style="font-size:10px;font-family:Cinzel,serif;letter-spacing:0.1em;color:var(--text-dim);margin-bottom:4px;">TRAITS</div>${traitsHTML}</div>` : ''}
    </div>`;
}

function saveGeneratedNPC() {
  if (!lastGeneratedNPC) return;
  const n = lastGeneratedNPC;
  const newNPC = {
    id: Date.now(),
    name: n.name,
    role: n.role,
    race: n.race,
    alignment: n.alignment,
    tags: [n.alignment.toLowerCase().split(' ')[0], n.role.toLowerCase().split('/')[0]],
    desc: n.appearance,
    personality: n.personality + ' ' + (n.hook||''),
    hp: n.hp, ac: n.ac, cr: n.cr,
    traits: (n.traits||[]),
    stats: n.stats ? {str:n.stats.str,dex:n.stats.dex,con:n.stats.con,int:n.stats.int,wis:n.stats.wis,cha:n.stats.cha} : {str:10,dex:10,con:10,int:10,wis:10,cha:10}
  };
  npcs.push(newNPC);
  renderNPCs();
  const btn = document.querySelector('[onclick="saveGeneratedNPC()"]');
  if (btn) { btn.textContent = '✅ Saved!'; setTimeout(() => btn.textContent = '💾 Save to NPC List', 2000); }
}

// ============================================================
// RANDOM ENCOUNTER GENERATOR
// ============================================================
function openEncounterModal() {
  document.getElementById('encounter-modal').classList.add('show');
  document.getElementById('enc-result').style.display = 'none';
  document.getElementById('enc-load-btn').style.display = 'none';
  document.getElementById('enc-generate-btn').textContent = '⚡ Generate Encounter';
  document.getElementById('enc-generate-btn').disabled = false;
  lastEncounterData = null;
}

function closeEncounterModal() {
  document.getElementById('encounter-modal').classList.remove('show');
}

async function generateEncounter() {
  const env       = document.getElementById('enc-environment').value;
  const diff      = document.getElementById('enc-difficulty').value;
  const party     = document.getElementById('enc-partysize').value;
  const level     = document.getElementById('enc-level').value;
  const context   = document.getElementById('enc-context').value.trim();
  const resultEl  = document.getElementById('enc-result');
  const genBtn    = document.getElementById('enc-generate-btn');
  const loadBtn   = document.getElementById('enc-load-btn');

  genBtn.textContent = '⏳ Generating...';
  genBtn.disabled = true;
  loadBtn.style.display = 'none';
  resultEl.style.display = 'block';
  resultEl.innerHTML = '<span style="color:var(--text-dim);">Summoning enemies from the aether...</span>';

  const envLabels = {dungeon:'Dungeon/Cave',forest:'Forest/Wilderness',tavern:'Tavern/Town',road:'Road/Plains',mountain:'Mountain/Hills',swamp:'Swamp/Marsh',underdark:'Underdark',sea:'Sea/Coast',ruins:'Ancient Ruins',castle:'Castle/Keep'};
  const diffLabels = {easy:'Easy',medium:'Medium',hard:'Hard',deadly:'Deadly'};

  const prompt = `You are a D&D 5e encounter designer. Generate a random encounter with the following parameters:
- Environment: ${envLabels[env]}
- Difficulty: ${diffLabels[diff]}
- Party: ${party} players at average level ${level}
- Extra context: ${context || 'none'}

Respond ONLY with a JSON object, no markdown, no explanation. Format:
{
  "title": "Short dramatic encounter title",
  "description": "2-3 sentence scene description for the DM to read",
  "enemies": [
    {"name": "Creature Name", "count": 2, "hp": 15, "ac": 13, "initiative_bonus": 2, "notes": "brief tactic note"}
  ]
}

Rules:
- HP, AC, and initiative_bonus should be D&D 5e appropriate for the level and difficulty
- initiative_bonus is just the modifier (e.g. 2 for +2 Dex), not the rolled result
- count should be a number (how many of this creature)
- Keep it to 1-4 distinct enemy types
- Fit the environment and difficulty appropriately
- notes should be a very short tactic hint (e.g. "focuses on weakest PC", "uses hit and run")`;

  try {
    const raw = await callClaudeAPI(prompt, 1000);
    const clean = raw.trim();
    const enc = JSON.parse(clean);
    lastEncounterData = enc;

    // Build display
    let html = `<div style="color:var(--gold);font-family:Cinzel,serif;font-size:15px;margin-bottom:8px;">⚔ ${enc.title}</div>`;
    html += `<div style="color:var(--text-dim);margin-bottom:12px;font-style:italic;">${enc.description}</div>`;
    html += `<div style="display:flex;flex-direction:column;gap:6px;">`;
    enc.enemies.forEach(e => {
      const sign = e.initiative_bonus >= 0 ? '+' : '';
      html += `<div style="background:rgba(180,30,30,0.15);border:1px solid rgba(180,30,30,0.3);border-radius:4px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <span style="color:var(--parchment);font-weight:bold;">${e.count > 1 ? `${e.count}× ` : ''}${e.name}</span>
        <span style="color:var(--text-dim);font-size:12px;">HP ${e.hp} · AC ${e.ac} · Init ${sign}${e.initiative_bonus}</span>
        <span style="color:var(--text-dim);font-size:11px;font-style:italic;flex:1;text-align:right;">${e.notes}</span>
      </div>`;
    });
    html += '</div>';
    resultEl.innerHTML = html;
    loadBtn.style.display = 'inline-block';
  } catch(err) {
    resultEl.innerHTML = `<span style="color:var(--blood-light);">⚠ Error generating encounter: ${err.message}</span>`;
  }

  genBtn.textContent = '↺ Regenerate';
  genBtn.disabled = false;
}

function loadEncounterToInitiative() {
  if (!lastEncounterData) return;
  lastEncounterData.enemies.forEach(e => {
    for (let i = 0; i < e.count; i++) {
      const name = e.count > 1 ? `${e.name} ${i + 1}` : e.name;
      const init = Math.floor(Math.random() * 20) + 1 + (e.initiative_bonus || 0);
      combatants.push({
        id: Date.now(),
        name,
        init: Math.max(1, init),
        hp: e.hp,
        maxHp: e.hp,
        ac: e.ac,
        type: 'enemy',
        conditions: []
      });
    }
  });
  combatants.sort((a, b) => b.init - a.init);
  renderCombatants();
  closeEncounterModal();
  // Switch to initiative tab
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-initiative').classList.add('active');
  document.querySelector('.nav-tab[onclick*="initiative"]').classList.add('active');
}

// ============================================================
// LOCATION GENERATOR
// ============================================================
async function generateLocation() {
  const locType    = document.getElementById('loc-gen-type').value;
  const locMood    = document.getElementById('loc-gen-mood').value;
  const locContext = document.getElementById('loc-gen-context').value.trim();
  const btn        = document.getElementById('loc-gen-btn');
  const resultDiv  = document.getElementById('loc-gen-result');
  const card       = document.getElementById('loc-gen-card');

  btn.disabled = true;
  btn.textContent = '⏳ Conjuring...';
  resultDiv.style.display = 'block';
  card.innerHTML = '<div style="color:var(--text-dim);padding:20px;text-align:center;font-family:Cinzel,serif;">Weaving the scene...</div>';

  const prompt = `You are a D&D 5e location designer. Create a vivid, memorable location for the DM.

Parameters:
- Type: ${locType}
- Mood/Tone: ${locMood}
- Context: ${locContext || 'general fantasy setting'}

Respond ONLY with valid JSON, no markdown:
{
  "name": "Evocative location name",
  "type": "${locType}",
  "mood": "${locMood}",
  "description": "3-4 sentence atmospheric description the DM can read aloud or paraphrase",
  "details": ["Specific sensory detail 1","Specific sensory detail 2","Specific sensory detail 3"],
  "secret": "One hidden detail, secret, or twist the players might discover",
  "encounter_hook": "One sentence plot or encounter hook tied to this place",
  "npcs": ["Brief NPC who might be here 1", "Brief NPC who might be here 2"]
}`;

  try {
    const clean = await callClaudeAPI(prompt, 800);
    const loc = JSON.parse(clean);
    lastGeneratedLocation = loc;
    renderGeneratedLocation(loc);
  } catch(e) {
    card.innerHTML = `<div style="color:var(--blood-light);padding:12px;">Error: ${e.message}</div>`;
  }
  btn.disabled = false;
  btn.textContent = '🗺 Generate Location';
}

function renderGeneratedLocation(loc) {
  const moodColors = {
    'Eerie/Dark':'#9b59b6','Mystical/Magical':'#3498db','Cozy/Safe':'#2ecc71',
    'Dangerous/Hostile':'#e74c3c','Ancient/Ruined':'#e67e22','Bustling/Lively':'#f1c40f'
  };
  const color = moodColors[loc.mood] || 'var(--gold)';
  document.getElementById('loc-gen-card').innerHTML = `
    <div style="background:linear-gradient(135deg,rgba(20,12,4,0.95),rgba(32,20,8,0.9));border:1px solid ${color}44;border-radius:8px;padding:14px;border-top:3px solid ${color};">
      <div style="font-family:Cinzel,serif;font-size:17px;color:var(--gold);font-weight:bold;margin-bottom:4px;">${loc.name}</div>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:12px;">${loc.type} · <span style="color:${color};">${loc.mood}</span></div>
      <div style="font-size:13px;color:#f0e6cc;line-height:1.7;margin-bottom:10px;font-style:italic;">"${loc.description}"</div>
      <div style="font-size:10px;font-family:Cinzel,serif;letter-spacing:0.12em;color:var(--text-dim);margin-bottom:6px;">DETAILS</div>
      ${(loc.details||[]).map(d=>`<div style="font-size:12px;color:#d4c090;padding:2px 0;padding-left:10px;border-left:2px solid ${color}44;">• ${d}</div>`).join('')}
      ${loc.secret ? `<div style="margin-top:10px;padding:8px;background:rgba(0,0,0,0.3);border-radius:6px;border-left:3px solid #9b59b6;"><div style="font-size:10px;font-family:Cinzel,serif;letter-spacing:0.1em;color:#9b59b6;margin-bottom:3px;">🔒 SECRET</div><div style="font-size:12px;color:#f0e6cc;">${loc.secret}</div></div>` : ''}
      ${loc.encounter_hook ? `<div style="margin-top:8px;padding:8px;background:rgba(0,0,0,0.3);border-radius:6px;border-left:3px solid var(--blood-light);"><div style="font-size:10px;font-family:Cinzel,serif;letter-spacing:0.1em;color:var(--blood-light);margin-bottom:3px;">⚡ HOOK</div><div style="font-size:12px;color:#f0e6cc;">${loc.encounter_hook}</div></div>` : ''}
      ${loc.npcs?.length ? `<div style="margin-top:8px;"><div style="font-size:10px;font-family:Cinzel,serif;letter-spacing:0.1em;color:var(--text-dim);margin-bottom:4px;">POSSIBLE NPCS</div>${loc.npcs.map(n=>`<div style="font-size:12px;color:#d4c090;">🧑 ${n}</div>`).join('')}</div>` : ''}
    </div>`;
}

function saveGeneratedLocation() {
  if (!lastGeneratedLocation) return;
  const loc = lastGeneratedLocation;
  const newLoc = {
    id: Date.now(),
    name: loc.name,
    type: loc.type,
    tags: [loc.type.toLowerCase(), loc.mood.toLowerCase().split('/')[0]],
    desc: loc.description,
    details: (loc.details||[]).join('\n'),
    secret: loc.secret || '',
    hook: loc.encounter_hook || ''
  };
  if (!window.locations) window.locations = [];
  window.locations.push(newLoc);
  if (typeof renderLocations === 'function') renderLocations();
  const btn = document.querySelector('[onclick="saveGeneratedLocation()"]');
  if (btn) { btn.textContent = '✅ Saved!'; setTimeout(()=>btn.textContent='💾 Save to Locations',2000); }
}
