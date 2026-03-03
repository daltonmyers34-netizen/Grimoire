// ============================================================
// SESSION TIMER & XP TRACKER
// ============================================================
let timerInterval = null, timerSeconds = 0, timerRunning = false;
let xpLog = [], totalXP = 0;

function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  timerInterval = setInterval(() => {
    timerSeconds++;
    const h = Math.floor(timerSeconds/3600);
    const m = Math.floor((timerSeconds%3600)/60);
    const s = timerSeconds%60;
    const str = h+':'+(m<10?'0':'')+m+':'+(s<10?'0':'')+s;
    const el = document.getElementById('session-timer');
    if (el) el.textContent = str;
    const top = document.getElementById('top-session-time');
    if (top) top.textContent = str;
  }, 1000);
}

function pauseTimer() {
  timerRunning = false;
  clearInterval(timerInterval);
}

function resetTimer() {
  pauseTimer();
  timerSeconds = 0;
  document.getElementById('session-timer').textContent = '0:00:00';
}

function addXP() {
  const creature = document.getElementById('xp-creature').value.trim();
  const xp = parseInt(document.getElementById('xp-amount').value) || 0;
  if (!xp) return;
  xpLog.unshift({ creature: creature || 'Unknown', xp, time: new Date().toLocaleTimeString() });
  totalXP += xp;
  document.getElementById('xp-creature').value = '';
  document.getElementById('xp-amount').value = '';
  renderXP();
}

function clearXP() { xpLog = []; totalXP = 0; renderXP(); }

function renderXP() {
  const xpTotalEl = document.getElementById('xp-total-display');
  if (xpTotalEl) xpTotalEl.textContent = totalXP.toLocaleString();
  const xpTotalElTop = document.getElementById('top-xp-total');
  if (xpTotalElTop) xpTotalElTop.textContent = totalXP.toLocaleString();
  const log = document.getElementById('xp-kills-log');
  if (!log) return;
  log.innerHTML = xpLog.slice(0,10).map(e => `
    <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px;border-bottom:1px solid rgba(255,255,255,0.05);">
      <span style="color:var(--parchment);">⚔ ${e.creature}</span>
      <span style="color:var(--gold);">+${e.xp} XP</span>
    </div>
  `).join('');

  // Update per-player split
  const playerList = document.getElementById('xp-player-list');
  if (!playerList) return;
  if (!window.party || !party.length) {
    playerList.innerHTML = '<div style="color:var(--text-dim);font-size:13px;padding:8px;">Add party members in the Party tab first.</div>';
    return;
  }
  const perPlayer = party.length ? Math.floor(totalXP / party.length) : 0;
  playerList.innerHTML = party.map(pc => {
    const nextLevelXP = [0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000][pc.level] || 999999;
    const pct = Math.min(100, (perPlayer / nextLevelXP) * 100);
    return `<div class="xp-player-row">
      <div class="xp-player-name">${pc.name} <span style="font-size:10px;color:var(--text-dim);">Lv${pc.level}</span></div>
      <div class="xp-player-val">${perPlayer.toLocaleString()} XP</div>
    </div>
    <div class="xp-bar-wrap"><div class="xp-bar-fill" style="width:${pct}%"></div></div>`;
  }).join('');
}

// ============================================================
// WORLD TIME & WEATHER
// ============================================================
let worldTotalHours = 6; // start at dawn, day 1
let worldSeason = 0; // 0=spring,1=summer,2=autumn,3=winter

const TIME_OF_DAY = [
  { label:'Deep Night', hours:[0,4],   icon:'🌑' },
  { label:'Pre-Dawn',   hours:[4,6],   icon:'🌒' },
  { label:'Dawn',       hours:[6,8],   icon:'🌅' },
  { label:'Morning',    hours:[8,12],  icon:'🌤' },
  { label:'Midday',     hours:[12,14], icon:'☀️' },
  { label:'Afternoon',  hours:[14,18], icon:'🌤' },
  { label:'Evening',    hours:[18,20], icon:'🌇' },
  { label:'Dusk',       hours:[20,22], icon:'🌆' },
  { label:'Night',      hours:[22,24], icon:'🌃' },
];

const MOON_PHASES = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];
const MOON_NAMES  = ['New Moon','Waxing Crescent','First Quarter','Waxing Gibbous','Full Moon','Waning Gibbous','Last Quarter','Waning Crescent'];
const SEASONS = ['Spring','Summer','Autumn','Winter'];

function updateWorldDisplay() {
  const seasonEl = document.getElementById('world-season');
  if (seasonEl) worldSeason = parseInt(seasonEl.value);
  const dayTotal = Math.floor(worldTotalHours / 24);
  const hour     = worldTotalHours % 24;
  const minute   = 0;
  const tod = TIME_OF_DAY.find(t => hour >= t.hours[0] && hour < t.hours[1]) || TIME_OF_DAY[0];
  const moonPhase = Math.floor((dayTotal % 30) / (30/8));

  const wtd = document.getElementById('world-time-display');
  const wdd = document.getElementById('world-date-display');
  const wmd = document.getElementById('world-moon-display');
  const wml = document.getElementById('world-moon-label');
  if (wtd) wtd.textContent = `${tod.icon} ${tod.label} · ${hour}:00`;
  if (wdd) wdd.textContent = `Day ${dayTotal+1} · ${SEASONS[worldSeason]}`;
  if (wmd) wmd.textContent = MOON_PHASES[moonPhase % 8];
  if (wml) wml.textContent = MOON_NAMES[moonPhase % 8];
  // Always update top bar
  syncTopBar();
}

function resetWorldTime() {
  worldTotalHours = 6;
  document.getElementById('world-season').value = 0;
  worldSeason = 0;
  updateWorldDisplay();
}

// Weather tables
const WEATHER_TABLES = window.WEATHER_TABLES = {
  temperate: [
    { icon:'☀️', desc:'Clear and Sunny',       temp:[60,80],  wind:'Calm',                visibility:'Crystal clear skies, perfect for travel and navigation.',                  effects:'' },
    { icon:'⛅', desc:'Partly Cloudy',          temp:[55,75],  wind:'Light breeze',         visibility:'Good visibility with comfortable travelling conditions.',                   effects:'' },
    { icon:'🌥', desc:'Overcast',               temp:[50,65],  wind:'Moderate wind',        visibility:'Grey skies. No rain yet, but feels heavy.',                               effects:'' },
    { icon:'🌧', desc:'Light Rain',             temp:[45,60],  wind:'Steady wind',          visibility:'Drizzle reduces visibility to 300ft. Roads become muddy.',                effects:'Disadvantage on Perception (sight). Torches extinguish in wind.' },
    { icon:'⛈', desc:'Thunderstorm',           temp:[45,60],  wind:'Strong gusts',         visibility:'Lightning illuminates the sky every 1d6 minutes.',                       effects:'Ranged attacks at disadvantage. Flying is dangerous (DC 12 Str save). Risk of lightning (rare).' },
    { icon:'❄️', desc:'Snow Flurries',          temp:[25,35],  wind:'Biting wind',          visibility:'Light snow reduces visibility to 150ft.',                                 effects:'Difficult terrain on paths. Constitution saves vs cold if exposed without gear.' },
  ],
  arctic: [
    { icon:'🌨', desc:'Heavy Snowfall',         temp:[-10,20], wind:'Howling blizzard',     visibility:'Visibility reduced to 30ft. All terrain is difficult.',                    effects:'DC 15 Con save each hour or gain 1 level of exhaustion. Fires require shelter.' },
    { icon:'❄️', desc:'Frozen and Clear',       temp:[-20,0],  wind:'Bitter cold',          visibility:'Eerily clear, every sound carries.',                                      effects:'Unprotected creatures must save vs cold each hour. Ice terrain — difficult and dangerous.' },
    { icon:'🌬', desc:'Whiteout Blizzard',      temp:[-30,-5], wind:'Violent storm',        visibility:'Zero visibility beyond 10ft. Navigation impossible without magic.',       effects:'DC 18 Con save each hour, heavy difficult terrain, ranged attacks impossible.' },
  ],
  desert: [
    { icon:'☀️', desc:'Blazing and Arid',       temp:[95,120], wind:'Scorching wind',       visibility:'Heat shimmer causes mirages past 100ft.',                                 effects:'DC 13 Con save each hour in full sun or take 1d4 fire damage. Water consumption doubled.' },
    { icon:'💨', desc:'Sandstorm',              temp:[80,100], wind:'Howling sand',         visibility:'Reduced to 15ft. Exposed skin is abraded.',                              effects:'Disadvantage on all attacks, Perception. 1d4 slashing damage each minute unprotected.' },
    { icon:'🌅', desc:'Cool Desert Morning',   temp:[55,75],  wind:'Light breeze',         visibility:'Perfect clarity before the heat builds.',                                 effects:'Best travel window before midday heat.' },
  ],
  tropical: [
    { icon:'🌦', desc:'Tropical Shower',       temp:[75,90],  wind:'Warm breeze',          visibility:'Short intense rain, over in minutes.',                                    effects:'Briefly difficult terrain on stone or wood. Stealth checks improved in rain.' },
    { icon:'🌧', desc:'Monsoon Rain',          temp:[70,85],  wind:'Gusting',              visibility:'Heavy rain to 100ft. Flash flood risk in valleys.',                      effects:'Disadvantage on fire attacks. Flying creatures grounded. Survival DC 14 to navigate.' },
    { icon:'☀️', desc:'Humid and Sweltering', temp:[85,100], wind:'Oppressive stillness', visibility:'Clear but haze in the distance.',                                         effects:'Exhaustion saves after strenuous activity (DC 12 Con after 1hr combat/travel).' },
  ],
  mountain: [
    { icon:'💨', desc:'Bitter Mountain Wind', temp:[30,50],  wind:'Howling alpine gust',  visibility:'Gusts can knock creatures prone (DC 12 Str).',                            effects:'Ranged attacks have disadvantage. Flying creatures must succeed DC 14 Str saves.' },
    { icon:'🌩', desc:'Mountain Thunderstorm',temp:[35,50],  wind:'Rolling thunder',      visibility:'Storm wraps around peaks, lightning strikes ridgelines.',                 effects:'Metal armor wearers attract lightning (DM discretion). DC 10 Athletics to climb.' },
    { icon:'🌨', desc:'Snow Above the Pass',  temp:[20,35],  wind:'Cutting wind',         visibility:'Pass snow reduces visibility to 60ft.',                                   effects:'Mountain passage may be blocked. Snow bridges are treacherous.' },
    { icon:'☀️', desc:'Crystal Alpine Day',  temp:[40,60],  wind:'Thin calm air',        visibility:'Extraordinary visibility — can see 20 miles on clear peaks.',             effects:'Bright sun on snow: unprotected eyes risk snow blindness (DC 12 save).' },
  ],
  coast: [
    { icon:'🌊', desc:'Stormy Seas',           temp:[50,65],  wind:'Force 8 gale',         visibility:'Waves crash the shore, salt spray everywhere.',                           effects:'Sea travel impossible for small vessels. Coastal roads slippery — half speed.' },
    { icon:'🌫', desc:'Thick Sea Fog',         temp:[50,65],  wind:'Near calm',            visibility:'Reduced to 20ft. Ships risk grounding. Very eerie.',                     effects:'Disadvantage on sight-based Perception. Navigation by sight impossible.' },
    { icon:'🌤', desc:'Fair Sailing Wind',     temp:[60,75],  wind:'Fresh westerly',       visibility:'Good. Perfect for sailing travel.',                                       effects:'Sailing ships double speed downwind. A perfect day on the water.' },
  ]
};

// ============================================================
// CONDITION TOOLTIPS
// ============================================================
const CONDITION_INFO = {
  'Blinded':      'Cannot see. Auto-fails checks requiring sight. Attack rolls against have advantage. Your attacks have disadvantage.',
  'Charmed':      'Cannot attack charmer or target with harmful abilities. Charmer has advantage on social checks against you.',
  'Deafened':     'Cannot hear. Auto-fails checks requiring hearing.',
  'Frightened':   'Disadvantage on ability checks and attacks while source of fear is in line of sight. Cannot willingly move closer.',
  'Grappled':     'Speed becomes 0. Ends if grappler is incapacitated or you are moved out of reach.',
  'Incapacitated':'Cannot take actions or reactions.',
  'Invisible':    'Cannot be seen without special sense. Attacks against have disadvantage. Your attacks have advantage.',
  'Paralyzed':    'Incapacitated, cannot move or speak. Auto-fail STR/DEX saves. Attacks have advantage. Hits within 5ft are critical.',
  'Petrified':    'Transformed to stone. Incapacitated, unaware. Attacks have advantage. Auto-fail STR/DEX saves. Resistant to all damage. Immune to poison and disease.',
  'Poisoned':     'Disadvantage on attack rolls and ability checks.',
  'Prone':        'Movement costs double to stand up. Disadvantage on attacks. Attacks within 5ft have advantage; beyond 5ft have disadvantage.',
  'Restrained':   'Speed 0. Disadvantage on attack rolls. Attackers have advantage. Disadvantage on DEX saves.',
  'Stunned':      'Incapacitated, cannot move. Auto-fail STR/DEX saves. Attacks have advantage.',
  'Unconscious':  'Incapacitated, prone. Auto-fail STR/DEX saves. Attacks have advantage. Hits within 5ft are critical.',
  'Exhaustion 1': 'Disadvantage on ability checks.',
  'Exhaustion 2': 'Speed halved.',
  'Exhaustion 3': 'Disadvantage on attack rolls and saving throws.',
  'Exhaustion 4': 'HP maximum halved.',
  'Exhaustion 5': 'Speed reduced to 0.',
  'Concentration':'Maintaining a concentration spell. Takes damage → DC 10 or damage/2 Constitution save or lose concentration.',
  'Rage':         'Advantage on STR checks/saves. Bonus damage on STR melee attacks. Resistance to B/P/S damage. Lasts 1 minute.',
  'Hasted':       'Double speed. +2 AC. Advantage on DEX saves. Extra action (attack, dash, disengage, hide, or use object).',
  'Cursed':       'DM determines effect. Typically disadvantage on specified checks or attacks, or other penalties.',
  'Marked':       'Creature has imposed mark. Typically: attack misses marked creature → opportunity attack (no reaction cost).',
};

document.addEventListener('mouseover', e => {
  try {
    const badge = e.target.closest('.cond-badge');
    if (!badge) return;
    const cond = badge.textContent.replace(' ✕','').trim();
    const info = CONDITION_INFO[cond];
    if (!info) return;
    const tip = document.getElementById('cond-tooltip');
    if (!tip) return;
    document.getElementById('cond-tooltip-name').textContent = cond;
    document.getElementById('cond-tooltip-text').textContent = info;
    tip.style.display = 'block';
    tip.style.left = Math.min(e.clientX + 12, window.innerWidth - 280) + 'px';
    tip.style.top  = (e.clientY - 10 + window.scrollY) + 'px';
  } catch(err) {}
});
document.addEventListener('mouseout', e => {
  try {
    if (e.target.closest('.cond-badge')) {
      const tip = document.getElementById('cond-tooltip');
      if (tip) tip.style.display = 'none';
    }
  } catch(err) {}
});
document.addEventListener('mousemove', e => {
  try {
    const tip = document.getElementById('cond-tooltip');
    if (tip && tip.style.display === 'block') {
      tip.style.left = Math.min(e.clientX + 12, window.innerWidth - 280) + 'px';
      tip.style.top  = (e.clientY - 10 + window.scrollY) + 'px';
    }
  } catch(err) {}
});

// ============================================================
// TOP BAR SYNC
// ============================================================
function syncTopBar() {
  try {
  // World time
  const dayTotal = Math.floor(worldTotalHours / 24);
  const hour = worldTotalHours % 24;
  const TIME_OF_DAY_SYNC = [
    {label:'Night',hours:[0,4],icon:'🌑'},{label:'Pre-Dawn',hours:[4,6],icon:'🌒'},
    {label:'Dawn',hours:[6,8],icon:'🌅'},{label:'Morning',hours:[8,12],icon:'🌤'},
    {label:'Midday',hours:[12,14],icon:'☀️'},{label:'Afternoon',hours:[14,18],icon:'🌤'},
    {label:'Evening',hours:[18,20],icon:'🌇'},{label:'Dusk',hours:[20,22],icon:'🌆'},
    {label:'Night',hours:[22,24],icon:'🌃'},
  ];
  const tod = TIME_OF_DAY_SYNC.find(t => hour >= t.hours[0] && hour < t.hours[1]) || TIME_OF_DAY_SYNC[0];
  const seasons = ['Spring','Summer','Autumn','Winter'];
  const topTime = document.getElementById('top-world-time');
  const topIcon = document.getElementById('top-world-icon');
  if (topTime) topTime.textContent = tod.label + ' · Day ' + (dayTotal+1);
  if (topIcon) topIcon.textContent = tod.icon;
  } catch(e) {}
}

// BUG FIX: Guard worldTotalHours from going negative
function advanceTime(hours) {
  worldTotalHours = Math.max(0, (worldTotalHours || 0) + hours);
  updateWorldDisplay(); // syncTopBar called inside updateWorldDisplay
}

function syncWeatherTop(desc, icon) {
  const wi = document.getElementById('top-weather-icon');
  const wl = document.getElementById('top-weather-label');
  if (wi) wi.textContent = icon;
  if (wl) wl.textContent = desc.split(' ').slice(0,2).join(' ');
}

function generateWeather() {
  const climate = document.getElementById('weather-climate').value;
  const WEATHER_T = window.WEATHER_TABLES || {};
  const table = WEATHER_T[climate] || [];
  if (!table.length) { return; }
  const w = table[Math.floor(Math.random() * table.length)];
  const tempF = Math.floor(Math.random() * (w.temp[1] - w.temp[0] + 1)) + w.temp[0];
  const tempC = Math.round((tempF - 32) * 5/9);
  document.getElementById('weather-icon').textContent = w.icon;
  document.getElementById('weather-desc').textContent = w.desc;
  document.getElementById('weather-temp').textContent = tempF+'°F / '+tempC+'°C · '+['Spring','Summer','Autumn','Winter'][worldSeason];
  document.getElementById('weather-wind').textContent = w.wind;
  document.getElementById('weather-visibility').textContent = w.visibility;
  document.getElementById('weather-effects').innerHTML = w.effects
    ? '<strong style="color:var(--gold);font-family:Cinzel,serif;font-size:10px;letter-spacing:0.1em;">MECHANICAL EFFECTS</strong><br>'+w.effects
    : '<span style="color:var(--text-dim);">No special mechanical effects.</span>';
  syncWeatherTop(w.desc, w.icon);
}

// Initialize world
try { updateWorldDisplay(); } catch(e) { console.warn("updateWorldDisplay();", e); }
try { renderXP(); } catch(e) { console.warn("renderXP();", e); }
try { syncTopBar(); } catch(e) { console.warn("syncTopBar();", e); }
