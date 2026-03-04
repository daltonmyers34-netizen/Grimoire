// ============================================================
// PARTY SIDEBAR
// ============================================================

function togglePartySidebar() {
  partySidebarOpen = !partySidebarOpen;
  var panel = document.getElementById('party-sidebar-panel');
  if (partySidebarOpen) { panel.classList.add('open'); renderSidebar(); }
  else panel.classList.remove('open');
}

function renderSidebar() {
  var list = document.getElementById('sidebar-pc-list');
  if (!list) return;
  if (!party || !party.length) {
    list.innerHTML = '<div style="color:var(--text-dim);font-size:12px;text-align:center;padding:16px 0;">No party members.<br>Add them in the Party tab.</div>';
    return;
  }
  list.innerHTML = party.map(function(pc) {
    var currentHp = pc.currentHp !== undefined ? pc.currentHp : pc.maxhp;
    var pct = Math.max(0, currentHp / pc.maxhp * 100);
    var hpClass = pct > 50 ? '' : pct > 25 ? 'medium' : 'low';
    return '<div class="sidebar-pc" onclick="switchTab(\'party\')">' +
      '<div class="sidebar-pc-name">' + pc.name + ' <span style="font-size:9px;color:var(--text-dim);">Lv.' + (pc.level||1) + ' ' + pc.cls + '</span></div>' +
      '<div class="sidebar-pc-row"><span>HP:</span><span class="sidebar-pc-hp">' + currentHp + ' / ' + pc.maxhp + '</span><span>AC: ' + pc.ac + '</span></div>' +
      '<div class="sidebar-hp-bar"><div class="sidebar-hp-fill ' + hpClass + '" style="width:' + pct + '%"></div></div>' +
    '</div>';
  }).join('');
}

function openPad(url) {
  window.open(url, '_blank', 'width=900,height=700,resizable=yes,scrollbars=yes');
}

// ============================================================
// SIDEBAR DRAG
// ============================================================
function initSidebarDrag() {
  var sidebar = document.getElementById('party-sidebar');
  if (!sidebar) return;
  var startY, startTop, dragging = false;

  function getTopPx() {
    var r = sidebar.getBoundingClientRect();
    return r.top;
  }

  function startDrag(cy) {
    startY = cy;
    startTop = getTopPx();
    dragging = true;
    sidebar.style.transform = 'none';
    sidebar.style.top = startTop + 'px';
    sidebar.classList.add('dragging');
  }

  function moveDrag(cy) {
    if (!dragging) return;
    var newTop = startTop + (cy - startY);
    var H = sidebar.offsetHeight;
    newTop = Math.max(8, Math.min(window.innerHeight - H - 8, newTop));
    sidebar.style.top = newTop + 'px';
  }

  function endDrag() { dragging = false; sidebar.classList.remove('dragging'); }

  var tab = document.getElementById('party-sidebar-tab');
  if (tab) {
    tab.addEventListener('touchstart', function(e) {
      startDrag(e.touches[0].clientY);
    }, { passive: true });
  }

  document.addEventListener('touchmove', function(e) {
    if (!dragging) return;
    e.preventDefault();
    moveDrag(e.touches[0].clientY);
  }, { passive: false });

  document.addEventListener('touchend', endDrag);

  if (tab) {
    tab.addEventListener('mousedown', function(e) { startDrag(e.clientY); e.preventDefault(); });
  }
  document.addEventListener('mousemove', function(e) { if (dragging) moveDrag(e.clientY); });
  document.addEventListener('mouseup', endDrag);
}
