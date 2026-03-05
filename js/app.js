// ============================================================
// CORE STATE
// ============================================================
let combatants = [];
let currentTurn = -1;
let round = 0;
let combatActive = false;
let hpTargetId = null;
let condTargetId = null;
let partySidebarOpen = false;
let hoverCardTimeout = null;
let npcs = [];
let locations = [];
let party = JSON.parse(localStorage.getItem('dm_party') || '[]');
let battlePresets = JSON.parse(localStorage.getItem('dm_presets') || '[]');
let combatLog = [];
let diceHistory = [];
let diceAdvMode = 'normal';
let lootSessionLog = [];
let pendingLootEntries = [];
let partyInventory = JSON.parse(localStorage.getItem('dm-party-inventory') || '[]');
let timerInterval = null, timerSeconds = 0, timerRunning = false;
let xpLog = [], totalXP = 0;
let lastGeneratedNPC = null;
let lastEncounterData = null;
let diceOverlayExpanded = true;
let worldTotalHours = 6;
let worldSeason = 0;
let lastGeneratedLocation = null;
let turnTimerActive = false;
let turnTimerSecs = 0;
let turnTimerInt = null;
let aoeSelected = new Set();
let widgetDieSides = 20;
let acSelectedIdx = -1;

// ============================================================
// UTILITY: Unique ID generator (fixes Date.now() collision bug)
// ============================================================
let _idCounter = 0;
function uniqueId() {
  return Date.now() * 1000 + (++_idCounter % 1000);
}

// ============================================================
// UTILITY: XSS sanitizer (was only used in Player View before)
// ============================================================
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============================================================
// TABS - BUG FIX: Accept explicit tabName, use it to set active tab
// Original bug: used implicit `event` global which fails in Firefox
// ============================================================
function switchTab(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const section = document.getElementById('tab-' + name);
  if (section) section.classList.add('active');
  // Find and activate the matching nav tab
  const tab = document.querySelector('.nav-tab[onclick*="' + name + '"]');
  if (tab) tab.classList.add('active');
}

// ============================================================
// MODAL - BUG FIX: Accept modal ID parameter
// Original bug: openModal/closeModal ignored parameter, always targeted hp-modal
// This broke AoE damage feature entirely
// ============================================================
function openModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add('show');
}

function closeModal(modalId) {
  if (modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('show');
  } else {
    // Fallback: close hp-modal for backward compatibility
    const el = document.getElementById('hp-modal');
    if (el) el.classList.remove('show');
  }
  // Clear target IDs when closing modals
  if (!modalId || modalId === 'hp-modal') hpTargetId = null;
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(msg, type) {
  if (!type) type = 'info';
  const existing = document.getElementById('dm-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'dm-toast';
  const bg = type === 'success' ? 'rgba(46,204,113,0.18)' : type === 'danger' ? 'rgba(224,80,80,0.18)' : 'rgba(212,175,55,0.15)';
  const border = type === 'success' ? '#2ecc71' : type === 'danger' ? '#e05050' : 'var(--gold)';
  toast.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:9999;' +
    'background:' + bg + ';border:1px solid ' + border + ';border-radius:8px;padding:10px 18px;' +
    'font-family:Cinzel,serif;font-size:13px;color:#f0e6cc;text-align:center;' +
    'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);' +
    'box-shadow:0 4px 20px rgba(0,0,0,0.6);white-space:nowrap;' +
    'animation:traySlideIn 0.25s ease-out;';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function() { if (toast.parentNode) toast.style.opacity = '0'; }, 2700);
  setTimeout(function() { if (toast.parentNode) toast.remove(); }, 3000);
}

// ============================================================
// SYNC INDICATOR
// ============================================================
function showSyncIndicator() {
  const el = document.getElementById('sync-indicator');
  if (el) {
    el.style.display = 'inline-block';
    setTimeout(function() { el.style.display = 'none'; }, 2000);
  }
}

// ============================================================
// API KEY MANAGEMENT - BUG FIX: Allow clearing the key
// ============================================================
window.ANTHROPIC_KEY = localStorage.getItem('dm_api_key') || '';

function promptAPIKey() {
  const existing = document.getElementById('api-key-panel');
  if (existing) { existing.style.display = 'block'; return; }
  const panel = document.createElement('div');
  panel.id = 'api-key-panel';
  panel.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
    'z-index:9999;background:linear-gradient(135deg,#1a0f06,#2a1a0a);border:1px solid var(--gold);' +
    'border-radius:12px;padding:24px;width:min(360px,90vw);box-shadow:0 8px 40px rgba(0,0,0,0.9);';
  panel.innerHTML =
    '<div style="font-family:Cinzel,serif;font-size:15px;color:var(--gold);margin-bottom:8px;">🔑 AI API Key</div>' +
    '<div style="font-size:12px;color:var(--text-dim);margin-bottom:12px;line-height:1.5;">' +
    'Required for AI features (NPC, Encounter, Location generators).<br>' +
    '<strong style="color:#ffe066;">You must use an OpenRouter key</strong> (starts with <code style="color:#90c8ff;">sk-or-</code>).<br>' +
    'Get one free at <a href="https://openrouter.ai/keys" target="_blank" style="color:#90c8ff;">openrouter.ai/keys</a><br>' +
    '<span style="color:#ff9090;">Direct Anthropic keys (sk-ant-) do NOT work from browsers due to CORS.</span></div>' +
    '<input id="api-key-input" type="password" placeholder="sk-or-v1-abc123... (OpenRouter key)" ' +
    'style="width:100%;padding:10px;background:rgba(0,0,0,0.4);border:1px solid rgba(212,175,55,0.3);' +
    'border-radius:6px;color:#f0e6cc;font-size:13px;margin-bottom:12px;" ' +
    'value="' + esc(window.ANTHROPIC_KEY) + '">' +
    '<div style="display:flex;gap:8px;">' +
    '<button onclick="saveAPIKey()" style="flex:1;padding:10px;background:var(--gold);color:#1a0f06;' +
    'border:none;border-radius:6px;font-family:Cinzel,serif;font-size:12px;cursor:pointer;font-weight:bold;">Save Key</button>' +
    '<button onclick="document.getElementById(\'api-key-panel\').style.display=\'none\'" ' +
    'style="padding:10px 14px;background:transparent;border:1px solid rgba(255,255,255,0.15);' +
    'border-radius:6px;color:var(--text-dim);cursor:pointer;font-size:12px;">Cancel</button></div>';
  document.body.appendChild(panel);
}

function saveAPIKey() {
  const val = document.getElementById('api-key-input').value.trim();
  window.ANTHROPIC_KEY = val;
  localStorage.setItem('dm_api_key', val);
  if (val && val.indexOf('sk-or-') !== 0) {
    showToast('Warning: Only OpenRouter keys (sk-or-...) work from browsers. Get one at openrouter.ai/keys', 'danger');
  } else {
    showToast(val ? 'API key saved!' : 'API key cleared', 'success');
  }
  document.getElementById('api-key-panel').style.display = 'none';
}

// ============================================================
// APP INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  try { initNPCs(); } catch(e) { console.warn('initNPCs:', e); }
  try { renderParty(); } catch(e) { console.warn('renderParty:', e); }
  try { renderPresets(); } catch(e) { console.warn('renderPresets:', e); }
  try { renderPartyInventory(); } catch(e) { console.warn('renderPartyInventory:', e); }
  try { refreshNamePanel(); } catch(e) { console.warn('refreshNamePanel:', e); }
  try { rollOneName(); } catch(e) { console.warn('rollOneName:', e); }
  try { initSidebarDrag(); } catch(e) { console.warn('initSidebarDrag:', e); }
  var mini = document.getElementById('dice-overlay-mini');
  if (mini) mini.classList.add('dice-hidden');
});
