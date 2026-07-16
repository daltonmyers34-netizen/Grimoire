// ============================================================
// AMBIENT AUTO-SOUND — cinematic stings on combat beats
// ============================================================
// Procedurally synthesized (WebAudio) so there are no assets to host and
// nothing to load. Auto-fires on combat start, a boss dropping low, phase
// changes, and victory. Toggle + test buttons live on the Sound tab.
// Device preference (not campaign state), like the player-view mute.

var dmAmbientOn = localStorage.getItem('dm_ambient_sound') === '1'; // default OFF (opt-in on the Sound tab)
var _dmAudioCtx = null;

function dmTone(freq, dur, delay, type, vol) {
  try {
    if (!dmAmbientOn) return;
    _dmAudioCtx = _dmAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (_dmAudioCtx.state === 'suspended') _dmAudioCtx.resume();
    var t0 = _dmAudioCtx.currentTime + (delay || 0);
    var o = _dmAudioCtx.createOscillator(), g = _dmAudioCtx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(_dmAudioCtx.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  } catch (e) {}
}

// A short sweep used for horns/rumbles
function dmSweep(f1, f2, dur, delay, type, vol) {
  try {
    if (!dmAmbientOn) return;
    _dmAudioCtx = _dmAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (_dmAudioCtx.state === 'suspended') _dmAudioCtx.resume();
    var t0 = _dmAudioCtx.currentTime + (delay || 0);
    var o = _dmAudioCtx.createOscillator(), g = _dmAudioCtx.createGain();
    o.type = type || 'sawtooth';
    o.frequency.setValueAtTime(f1, t0);
    o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.16, t0 + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(_dmAudioCtx.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  } catch (e) {}
}

function dmSound(kind) {
  if (!dmAmbientOn) return;
  switch (kind) {
    case 'combatStart': // war horn swell + drum
      dmTone(70, 0.22, 0, 'square', 0.2);            // drum thump
      dmSweep(98, 147, 0.7, 0.05, 'sawtooth', 0.15); // G2 → D3 horn rise
      dmSweep(131, 196, 0.7, 0.1, 'sawtooth', 0.12);
      dmTone(70, 0.22, 0.5, 'square', 0.18);         // second drum
      break;
    case 'bossLow': // ominous heartbeat drone (tritone)
      dmTone(65, 0.5, 0, 'sawtooth', 0.12);
      dmTone(92, 0.5, 0, 'sawtooth', 0.1);           // 65 & 92 ≈ tritone
      dmTone(58, 0.35, 0.55, 'square', 0.14);        // heart-thud 1
      dmTone(58, 0.35, 0.85, 'square', 0.14);        // heart-thud 2
      break;
    case 'bossPhase': // dramatic rising stinger
      dmSweep(120, 60, 0.5, 0, 'sawtooth', 0.14);    // downward rumble
      dmTone(880, 0.14, 0.3, 'square', 0.12);        // sharp accent
      dmTone(1174, 0.4, 0.42, 'triangle', 0.12);
      break;
    case 'victory': // triumphant major fanfare (C–E–G–C)
      dmTone(523, 0.16, 0, 'triangle', 0.16);
      dmTone(659, 0.16, 0.16, 'triangle', 0.16);
      dmTone(784, 0.16, 0.32, 'triangle', 0.16);
      dmTone(1046, 0.5, 0.48, 'triangle', 0.18);
      dmTone(1568, 0.5, 0.48, 'sine', 0.08);         // shimmer above
      break;
    case 'combatEnd': // soft two-note fade
      dmTone(392, 0.25, 0, 'sine', 0.12);
      dmTone(294, 0.4, 0.2, 'sine', 0.1);
      break;
  }
}

// Any enemy carrying boss config (or simply a big solo monster) counts.
function isBossCombatant(c) {
  if (!c || c.type !== 'enemy') return false;
  return !!(c.legendaryResist || (c.phases && c.phases.length) ||
            (c.lairActions && c.lairActions.length) || (c.maxHp || 0) >= 100);
}

// Called from the renderCombatants wrapper — fires once when a boss first
// drops to/below 25% HP. Flag is cleared by resetBossState at startCombat.
function checkBossLowSound() {
  if (!combatActive || !dmAmbientOn) return;
  combatants.forEach(function (c) {
    if (!isBossCombatant(c) || c.hp <= 0 || c._lowHpSounded) return;
    if (c.hp / (c.maxHp || 1) <= 0.25) {
      c._lowHpSounded = true;
      dmSound('bossLow');
      showToast('🩸 ' + c.name + ' is bloodied — the end is near', 'warn');
    }
  });
}

// ─── Sound tab controls ──────────────────────────────────────
function toggleAmbientSound() {
  dmAmbientOn = !dmAmbientOn;
  localStorage.setItem('dm_ambient_sound', dmAmbientOn ? '1' : '0');
  renderAmbientToggle();
  if (dmAmbientOn) dmSound('combatStart'); // audible confirmation
  showToast(dmAmbientOn ? '🔔 Ambient auto-sound ON' : '🔕 Ambient auto-sound OFF', 'info');
}

function renderAmbientToggle() {
  var btn = document.getElementById('ambient-toggle-btn');
  if (btn) {
    btn.textContent = dmAmbientOn ? '🔔 Auto-Sound: ON' : '🔕 Auto-Sound: OFF';
    btn.classList.toggle('btn-gold', dmAmbientOn);
    btn.classList.toggle('btn-ghost', !dmAmbientOn);
  }
}
