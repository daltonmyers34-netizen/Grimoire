// ============================================================
// SESSION TIMER & XP TRACKER
// ============================================================
// timerInterval, timerSeconds, timerRunning, xpLog, totalXP declared in app.js

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
// worldTotalHours, worldSeason declared in app.js
// TIME_OF_DAY, MOON_PHASES, MOON_NAMES, SEASONS declared in data/weather.js

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

// WEATHER_TABLES declared in data/weather.js
// CONDITION_INFO declared in data/conditions.js

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
