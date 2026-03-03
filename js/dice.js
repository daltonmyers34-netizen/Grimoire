// ============================================================
// DICE ROLLER
// ============================================================
// Depends on globals: diceHistory, diceAdvMode, widgetDieSides,
//   diceOverlayExpanded, esc(), showToast()
// ============================================================

let diceHistory = [];
let diceAdvMode = 'normal'; // 'normal','adv','dis'

function toggleAdvantage() {
  diceAdvMode = diceAdvMode === 'adv' ? 'normal' : 'adv';
  document.getElementById('adv-btn').className = 'adv-btn' + (diceAdvMode==='adv' ? ' active-adv' : '');
  document.getElementById('dis-btn').className = 'adv-btn';
}
function toggleDisadvantage() {
  diceAdvMode = diceAdvMode === 'dis' ? 'normal' : 'dis';
  document.getElementById('dis-btn').className = 'adv-btn' + (diceAdvMode==='dis' ? ' active-dis' : '');
  document.getElementById('adv-btn').className = 'adv-btn';
}

function rollDie(sides) {
  const mod = parseInt(document.getElementById('dice-mod').value) || 0;
  const count = Math.max(1, parseInt(document.getElementById('dice-count').value) || 1);
  const resultEl = document.getElementById('dice-result-big');
  const detailEl = document.getElementById('dice-result-detail');

  let rolls = [], total = 0, detail = '', isCrit = false, isFumble = false;

  if (sides === 20 && count === 1) {
    const r1 = Math.ceil(Math.random() * 20);
    const r2 = Math.ceil(Math.random() * 20);
    if (diceAdvMode === 'adv') {
      const chosen = Math.max(r1, r2);
      total = chosen + mod;
      detail = `d20 [${r1}, ${r2}] \u2192 ${chosen}${mod>=0?'+':''}${mod} = ${total} (Advantage)`;
      if (chosen === 20) isCrit = true;
      if (chosen === 1) isFumble = true;
    } else if (diceAdvMode === 'dis') {
      const chosen = Math.min(r1, r2);
      total = chosen + mod;
      detail = `d20 [${r1}, ${r2}] \u2192 ${chosen}${mod>=0?'+':''}${mod} = ${total} (Disadvantage)`;
      if (chosen === 20) isCrit = true;
      if (chosen === 1) isFumble = true;
    } else {
      total = r1 + mod;
      detail = `d20 [${r1}]${mod>=0?'+':''}${mod} = ${total}`;
      if (r1 === 20) isCrit = true;
      if (r1 === 1) isFumble = true;
    }
  } else {
    for (let i = 0; i < count; i++) rolls.push(Math.ceil(Math.random() * sides));
    total = rolls.reduce((a,b) => a+b, 0) + mod;
    detail = count > 1 ? `${count}d${sides} [${rolls.join(', ')}]${mod>=0?'+':''}${mod} = ${total}` : `d${sides} [${rolls[0]}]${mod>=0?'+':''}${mod} = ${total}`;
  }

  resultEl.className = 'dice-result-big' + (isCrit ? ' crit-color' : isFumble ? ' fumble-color' : '');
  resultEl.textContent = total;
  detailEl.textContent = isCrit ? '\u2b50 CRITICAL HIT! \u2b50' : isFumble ? '\ud83d\udc80 CRITICAL FAIL!' : detail;

  // Flash die button
  const btn = document.querySelector('.die-btn[title="d' + sides + '"]') ||
              document.querySelector('.die-btn[title="d20"]');
  if (btn) {
    btn.classList.add(isCrit ? 'crit' : isFumble ? 'fumble' : 'crit');
    setTimeout(() => btn.classList.remove('crit','fumble'), 700);
  }

  // History
  diceHistory.unshift({ sides, total, detail, isCrit, isFumble, time: new Date().toLocaleTimeString() });
  if (diceHistory.length > 30) diceHistory.pop();
  renderDiceHistory();
}

function renderDiceHistory() {
  const el = document.getElementById('dice-history');
  if (!el) return;
  if (!diceHistory.length) { el.innerHTML = '<div style="color:var(--text-dim);font-size:13px;padding:8px;">No rolls yet...</div>'; return; }
  el.innerHTML = diceHistory.map(h => `
    <div class="dice-history-item ${h.isCrit?'crit':h.isFumble?'fumble':''}">
      <span>${h.detail}</span>
      <span style="color:var(--text-dim);font-size:10px;">${h.time}</span>
    </div>
  `).join('');
}

function clearDiceHistory() {
  diceHistory = [];
  renderDiceHistory();
}

// ── Dice overlay collapse ──────────────────────────────────────────
let diceOverlayExpanded = true;

function toggleDiceOverlay() {
  diceOverlayExpanded = !diceOverlayExpanded;
  const row  = document.getElementById('dice-overlay-row');
  const mini = document.getElementById('dice-overlay-mini');
  if (diceOverlayExpanded) {
    row.classList.remove('dice-hidden');
    mini.classList.add('dice-hidden');
  } else {
    row.classList.add('dice-hidden');
    mini.classList.remove('dice-hidden');
  }
}

// ═══════════════════════════════════════════════════════════════
// DRAGGABLE DICE OVERLAY
// ═══════════════════════════════════════════════════════════════
(function() {
  let dragEl, dragStartX, dragStartY, elStartX, elStartY, dragging = false;

  function initDraggable() {
    const panel = document.getElementById('dice-overlay-panel');
    if (!panel) return;

    let startX, startY, startLeft, startTop, dragging = false;

    function getPanelXY() {
      const r = panel.getBoundingClientRect();
      return { x: r.left, y: r.top };
    }

    function startDrag(cx, cy) {
      const pos = getPanelXY();
      startX = cx; startY = cy;
      startLeft = pos.x;
      startTop = pos.y;
      // Switch from bottom/transform to top/left positioning
      panel.style.bottom = 'auto';
      panel.style.transform = 'none';
      panel.style.left = startLeft + 'px';
      panel.style.top = startTop + 'px';
      dragging = true;
      panel.classList.add('dragging');
    }

    function moveDrag(cx, cy) {
      if (!dragging) return;
      let newLeft = startLeft + (cx - startX);
      let newTop  = startTop  + (cy - startY);
      const W = panel.offsetWidth, H = panel.offsetHeight;
      newLeft = Math.max(4, Math.min(window.innerWidth  - W - 4, newLeft));
      newTop  = Math.max(4, Math.min(window.innerHeight - H - 4, newTop));
      panel.style.left = newLeft + 'px';
      panel.style.top  = newTop  + 'px';
    }

    function endDrag() { dragging = false; panel.classList.remove('dragging'); }

    // Attach to BOTH mini and expanded children for drag start
    ['dice-overlay-btn','dice-overlay-btn-mini','dice-overlay-selector'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', e => {
        // Long-press to drag (> 200ms), short tap = roll
        const t = Date.now();
        const tx = e.touches[0].clientX, ty = e.touches[0].clientY;
        el._dragTimer = setTimeout(() => { startDrag(tx, ty); }, 200);
      }, { passive: true });
    });

    // Also allow dragging from the toggle buttons
    ['dice-overlay-toggle'].forEach(cls => {
      document.querySelectorAll('.' + cls).forEach(el => {
        el.addEventListener('touchstart', e => {
          startDrag(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });
      });
    });

    document.addEventListener('touchmove', e => {
      if (!dragging) return;
      e.preventDefault();
      // Clear the drag timer if we're moving quickly (it's a real drag not tap)
      moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });

    document.addEventListener('touchend', e => {
      // Clear pending drag timers
      ['dice-overlay-btn','dice-overlay-btn-mini','dice-overlay-selector'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el._dragTimer) { clearTimeout(el._dragTimer); el._dragTimer = null; }
      });
      endDrag();
    });

    // Mouse drag (desktop)
    panel.addEventListener('mousedown', e => {
      if (e.target.closest('button') || e.target.classList.contains('dop-pip')) return;
      startDrag(e.clientX, e.clientY);
    });
    document.addEventListener('mousemove', e => { if (dragging) moveDrag(e.clientX, e.clientY); });
    document.addEventListener('mouseup', endDrag);
  }

  function startDrag(cx, cy, el) {
    dragEl = el;
    dragging = true;
    dragStartX = cx;
    dragStartY = cy;
    const rect = el.getBoundingClientRect();
    elStartX = rect.left + rect.width/2;
    elStartY = rect.top  + rect.height/2;
    el.classList.add('dragging');
    el.style.cursor = 'grabbing';
    el.style.transition = 'none';
    el.style.transform = 'none';
    el.style.left   = elStartX + 'px';
    el.style.top    = elStartY + 'px';
    el.style.bottom = 'auto';
  }

  function moveDrag(cx, cy) {
    if (!dragging || !dragEl) return;
    const dx = cx - dragStartX;
    const dy = cy - dragStartY;
    let nx = elStartX + dx;
    let ny = elStartY + dy;
    const W = dragEl.offsetWidth/2, H = dragEl.offsetHeight/2;
    nx = Math.max(W, Math.min(window.innerWidth  - W, nx));
    ny = Math.max(H, Math.min(window.innerHeight - H, ny));
    dragEl.style.left = nx + 'px';
    dragEl.style.top  = ny + 'px';
  }

  function endDrag() {
    if (!dragEl) return;
    dragging = false;
    dragEl.classList.remove('dragging');
    dragEl.style.cursor = 'grab';
    dragEl = null;
  }

  document.addEventListener('DOMContentLoaded', initDraggable);
})();

// ============================================================
// DICE WIDGET
// ============================================================
let widgetDieSides = 20;

function setWidgetDie(sides) {
  widgetDieSides = sides;
  // Update top-bar pips
  document.querySelectorAll('.dice-pip').forEach(p => {
    p.classList.toggle('active', parseInt(p.dataset.sides) === sides);
  });
  // Update overlay pips
  document.querySelectorAll('.dop-pip').forEach(p => {
    p.classList.toggle('active', parseInt(p.dataset.sides) === sides);
  });
  const faces = {4:'\u25c6',6:'\u2b21',8:'\u25c8',10:'\u25c9',12:'\u2b1f',20:'\u2b21',100:'%'};
  const faceEl = document.getElementById('dice-widget-face');
  if (faceEl) faceEl.textContent = faces[sides] || '\u2b21';
  // Update overlay button
  const overlayFace = document.getElementById('dice-overlay-face');
  const overlayLabel = document.getElementById('dice-overlay-label');
  if (overlayFace) overlayFace.textContent = faces[sides] || '\u2b21';
  if (overlayLabel) overlayLabel.textContent = sides === 100 ? 'd%' : 'd' + sides;
  // sync mini state too
  const mf = document.getElementById('dice-overlay-face-mini');
  const ml = document.getElementById('dice-overlay-label-mini');
  if (mf) mf.textContent = faces[sides] || '\u2b21';
  if (ml) ml.textContent = sides === 100 ? 'd%' : 'd' + sides;
}

function quickRollDie() {
  try {
  const sides = widgetDieSides;
  const roll  = Math.ceil(Math.random() * sides);
  const isCrit   = sides === 20 && roll === 20;
  const isFumble = sides === 20 && roll === 1;

  // Animate 3D die rolling across screen
  animateDie3D(sides, roll, isCrit, isFumble);

  // Update widget in top bar
  const resultEl = document.getElementById('dice-widget-result');
  resultEl.className = '';
  resultEl.classList.add('roll-anim');
  if (isCrit)   resultEl.classList.add('widget-crit');
  if (isFumble) resultEl.classList.add('widget-fumble');
  resultEl.textContent = roll;
  setTimeout(() => resultEl.classList.remove('roll-anim','widget-crit','widget-fumble'), 2000);

  // Push to history
  diceHistory.unshift({ sides, total:roll, detail:'d'+sides+' ['+roll+']', isCrit, isFumble, time: new Date().toLocaleTimeString() });
  if (diceHistory.length > 30) diceHistory.pop();
  try { renderDiceHistory(); } catch(e){}
  } catch(err) { console.error('quickRollDie', err); alert('Roll error: ' + err.message); }
}

function animateDie3D(sides, result, isCrit, isFumble) {
  try {
  const isMobile = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window);
  const overlay = document.getElementById('dice-3d-overlay');
  const tray    = document.getElementById('dice-tray');

  // Start position: near the dice widget button (top-right area)
  const btn = document.getElementById('dice-widget-btn');
  const btnRect = btn ? btn.getBoundingClientRect() : {left: window.innerWidth - 60, top: 20, width:46, height:46};

  // End position: bottom-right tray
  const endX = window.innerWidth  - 80;   // tray center X
  const endY = window.innerHeight - 60;    // tray center Y

  const startX = btnRect.left + btnRect.width/2 - 30;
  const startY = btnRect.top + btnRect.height/2 - 30;

  // CSS custom properties for animation path
  const sx = 0, sy = 0;   // relative start (die is positioned at start)
  const ex = endX - startX;
  const ey = endY - startY;

  if (isMobile) {
    // On touch devices just show the result tray directly - skip 3D fly animation
    const tray = document.getElementById('dice-tray');
    if (tray) {
      tray.className = 'visible';
      const tr = document.getElementById('dice-tray-result');
      if (tr) {
        tr.className = '';
        if (isCrit) tr.classList.add('tray-crit');
        if (isFumble) tr.classList.add('tray-fumble');
        tr.textContent = result;
      }
      const tl = document.getElementById('dice-tray-label');
      if (tl) tl.textContent = 'd' + sides;
      const td = document.getElementById('dice-tray-detail');
      if (td) td.innerHTML = isCrit ? '<span style="color:#ffe066;">\u2b50 CRITICAL!</span>' : isFumble ? '<span style="color:#e74c3c;">\ud83d\udc80 FUMBLE!</span>' : '';
      setTimeout(() => { tray.className = ''; }, 5000);
    }
    return;
  }
  const die = document.createElement('div');
  die.className = 'die-3d';
  die.style.left = startX + 'px';
  die.style.top  = startY + 'px';
  die.style.setProperty('--sx', '0px');
  die.style.setProperty('--sy', '0px');
  die.style.setProperty('--ex', ex + 'px');
  die.style.setProperty('--ey', ey + 'px');

  const face = document.createElement('div');
  face.className = 'die-3d-face' + (isCrit ? ' crit' : isFumble ? ' fumble' : '');
  face.style.color = isCrit ? '#ffe066' : isFumble ? '#e74c3c' : 'var(--gold)';
  face.textContent = isCrit ? '\u2605' : isFumble ? '\u2620' : result;
  die.appendChild(face);
  overlay.appendChild(die);

  // Show tray with result after die lands
  setTimeout(() => {
    tray.className = 'visible';
    const trayResult = document.getElementById('dice-tray-result');
    trayResult.className = '';
    if (isCrit)   trayResult.classList.add('tray-crit');
    if (isFumble) trayResult.classList.add('tray-fumble');
    trayResult.textContent = result;

    document.getElementById('dice-tray-label').textContent = 'd' + sides;
    document.getElementById('dice-tray-detail').innerHTML = isCrit
      ? '<span style="color:#ffe066;">\u2b50 CRITICAL HIT!</span>'
      : isFumble
        ? '<span style="color:#e74c3c;">\ud83d\udc80 FUMBLE!</span>'
        : '';

    die.classList.add('settling');
  }, 1550);

  // Remove die from DOM after animation
  setTimeout(() => {
    if (die.parentNode) die.parentNode.removeChild(die);
  }, 2200);

  // Hide tray after a moment
  setTimeout(() => {
    tray.className = '';
  }, 5000);
  } catch(err) { console.warn('animateDie3D', err); }
}

// Keyboard shortcut for dice widget
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  if (e.key === 'd' || e.key === 'D' || e.key === 'r' || e.key === 'R') quickRollDie();
});
