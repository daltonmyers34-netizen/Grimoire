// ============================================================
// FULL SESSION PERSISTENCE
// ============================================================
var SESSION_KEY  = 'dm_grimoire_session';
var SESSIONS_KEY = 'dm_grimoire_sessions';

function collectState() {
  return {
    version: 3,
    savedAt: new Date().toISOString(),
    combatants: combatants,
    npcs: npcs,
    locations: window.locations || [],
    party: party,
    presets: JSON.parse(localStorage.getItem('dm_presets') || '[]'),
    worldTotalHours: worldTotalHours,
    worldSeason: worldSeason,
    totalXP: totalXP,
    xpLog: xpLog,
    timerSeconds: timerSeconds,
    currentRound: round,
    currentTurn: currentTurn,
    combatActive: combatActive,
    pvMessages: window.pvMessages || {},
    pvPartyMessage: window.pvPartyMessage || '',
    notes: {
      session: document.getElementById('session-notes') ? document.getElementById('session-notes').value : '',
      plot:    document.getElementById('plot-notes') ? document.getElementById('plot-notes').value : '',
    }
  };
}

function applyState(s) {
  if (s.combatants)  { combatants = s.combatants; renderCombatants(); }
  if (s.npcs)        { npcs = s.npcs; renderNPCs(); }
  if (s.locations)   { window.locations = s.locations; if(typeof renderLocations==='function') renderLocations(); }
  if (s.party)       { party = s.party; renderParty(); }
  if (s.presets)     { localStorage.setItem('dm_presets', JSON.stringify(s.presets)); }
  if (s.worldTotalHours !== undefined) { worldTotalHours = s.worldTotalHours; worldSeason = s.worldSeason||0; updateWorldDisplay(); syncTopBar(); }
  if (s.totalXP !== undefined) { totalXP = s.totalXP; xpLog = s.xpLog||[]; renderXP(); }
  if (s.timerSeconds) timerSeconds = s.timerSeconds;
  if (s.currentRound !== undefined) {
    round = s.currentRound;
    var re = document.getElementById('round-display'); if(re) re.textContent = s.currentRound;
  }
  if (s.currentTurn !== undefined) { currentTurn = s.currentTurn; }
  if (s.combatActive !== undefined) { combatActive = s.combatActive; }
  if (s.pvMessages) { window.pvMessages = s.pvMessages; }
  if (s.pvPartyMessage) { window.pvPartyMessage = s.pvPartyMessage; }
  if (s.notes) {
    var sn = document.getElementById('session-notes'); if(sn) sn.value = s.notes.session||'';
    var pn = document.getElementById('plot-notes');   if(pn) pn.value = s.notes.plot||'';
  }
}

function saveSession() {
  try {
    var state = collectState();
    localStorage.setItem(SESSION_KEY, JSON.stringify(state));
    if (window.cloudSave) window.cloudSave();
    showToast('Session saved!', 'success');
  } catch(e) { showToast('Save failed: ' + e.message, 'danger'); }
}

function loadSession() {
  try {
    var raw = localStorage.getItem(SESSION_KEY);
    if (!raw) { showToast('No saved session found', 'info'); return; }
    applyState(JSON.parse(raw));
    showToast('Session restored!', 'success');
  } catch(e) { showToast('Load failed: ' + e.message, 'danger'); }
}

function getSessions() {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]'); }
  catch(e) { return []; }
}

function saveNamedSession(name) {
  try {
    var sessions = getSessions();
    var state = collectState();
    state.name = name;
    var idx = sessions.findIndex(function(s) { return s.name === name; });
    if (idx >= 0) sessions[idx] = state;
    else sessions.unshift(state);
    if (sessions.length > 20) sessions.splice(20);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    localStorage.setItem(SESSION_KEY, JSON.stringify(state));
    showToast('Saved as "' + name + '"', 'success');
    closeSessionsModal();
  } catch(e) { showToast('Save failed: ' + e.message, 'danger'); }
}

function loadNamedSession(name) {
  var sessions = getSessions();
  var s = sessions.find(function(s) { return s.name === name; });
  if (!s) { showToast('Session not found', 'danger'); return; }
  applyState(s);
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  showToast('Loaded "' + name + '"', 'success');
  closeSessionsModal();
}

function deleteNamedSession(name) {
  var sessions = getSessions().filter(function(s) { return s.name !== name; });
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  openSessionsModal();
}

function exportSession() {
  try {
    var state = collectState();
    state.name = state.name || 'grimoire-export';
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href = url;
    a.download = (state.name||'session') + '-' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Session exported!', 'success');
  } catch(e) { showToast('Export failed: ' + e.message, 'danger'); }
}

function importSession(file) {
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var s = JSON.parse(e.target.result);
      if (!s.version) throw new Error('Not a valid session file');
      applyState(s);
      if (s.name) {
        var sessions = getSessions();
        var idx = sessions.findIndex(function(x) { return x.name === s.name; });
        if (idx >= 0) sessions[idx] = s; else sessions.unshift(s);
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      showToast('Session imported: "' + (s.name||'unnamed') + '"', 'success');
      closeSessionsModal();
    } catch(err) { showToast('Import failed: ' + err.message, 'danger'); }
  };
  reader.readAsText(file);
}

function openSessionsModal() {
  var modal = document.getElementById('sessions-modal');
  if (!modal) return;
  modal.classList.add('show');
  renderSessionsList();
}

function closeSessionsModal() {
  var modal = document.getElementById('sessions-modal');
  if (modal) modal.classList.remove('show');
}

function renderSessionsList() {
  var list = document.getElementById('sessions-list');
  if (!list) return;
  var sessions = getSessions();
  if (!sessions.length) {
    list.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-dim);font-style:italic;">No saved sessions yet.<br>Enter a name above and click Save.</div>';
    return;
  }
  list.innerHTML = sessions.map(function(s) {
    var dt = new Date(s.savedAt);
    var dateStr = dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    var combatantCount = (s.combatants||[]).length;
    var npcCount = (s.npcs||[]).length;
    var partyCount = (s.party||[]).length;
    return '<div style="background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:6px;padding:14px;margin-bottom:10px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">' +
        '<div>' +
          '<div style="font-family:Cinzel,serif;font-size:15px;color:var(--gold);">' + (s.name||'Unnamed') + '</div>' +
          '<div style="font-size:11px;color:var(--text-dim);margin-top:2px;">' + dateStr + '</div>' +
        '</div>' +
        '<button onclick="deleteNamedSession(\'' + s.name.replace(/'/g,"\\'") + '\')" style="background:rgba(139,26,26,0.2);border:1px solid rgba(139,26,26,0.4);color:#e08080;border-radius:4px;padding:3px 8px;cursor:pointer;font-size:11px;">&#128465;</button>' +
      '</div>' +
      '<div style="display:flex;gap:8px;font-size:11px;color:var(--text-dim);margin-bottom:10px;">' +
        '<span>&#9876; ' + combatantCount + ' combatants</span>' +
        '<span>&#129497; ' + npcCount + ' NPCs</span>' +
        '<span>&#128101; ' + partyCount + ' party</span>' +
      '</div>' +
      '<button onclick="loadNamedSession(\'' + s.name.replace(/'/g,"\\'") + '\')" style="width:100%;padding:8px;background:linear-gradient(135deg,var(--gold-dim),var(--gold));color:var(--ink);border:none;border-radius:4px;font-family:Cinzel,serif;font-size:11px;font-weight:bold;cursor:pointer;letter-spacing:0.08em;">&#9654; LOAD SESSION</button>' +
    '</div>';
  }).join('');
}

function clearSession() {
  if (!confirm('Clear all session data? This cannot be undone.')) return;
  localStorage.removeItem(SESSION_KEY);
  showToast('Session cleared', 'info');
}

// Auto-save every 60 seconds (silent — no toast)
setInterval(function() {
  try {
    var state = collectState();
    localStorage.setItem(SESSION_KEY, JSON.stringify(state));
    if (window.cloudSave) window.cloudSave();
  } catch(e) {}
}, 60000);
