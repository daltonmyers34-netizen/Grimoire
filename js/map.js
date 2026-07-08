// ============================================================
// BATTLE MAP — grid canvas, props, fog of war, combat tokens
// ============================================================

var mapState = defaultMapState();
var mapTool = 'move';        // move | prop | fog | reveal | erase
var mapSelectedProp = '🪨';
var mapDrag = null;          // {kind:'token'|'prop', id, offX, offY}
var mapFogPainting = false;
var mapNeedsSync = false;

function defaultMapState() {
  return {
    cols: 22,
    rows: 14,
    cell: 40,
    ground: 'stone',
    seed: 7,
    props: [],
    fog: [],
    tokens: {}
  };
}

var MAP_PROPS = [
  '🪨','🌳','🌲','🌿','🪵','🔥','💧','⛰',
  '🏠','🏛','⛺','🚪','🪟','🕯','🪑','🛏',
  '📦','🛢','⚱','💰','⚰','🗝','🪜','⚓',
  '🐴','🐺','🕸','💀','🦴','🩸','⭐','🕳'
];

var MAP_GROUNDS = {
  stone:  { base: [74, 70, 66],   jitter: 10, label: 'Stone Dungeon' },
  grass:  { base: [58, 92, 48],   jitter: 14, label: 'Grass Field' },
  wood:   { base: [96, 66, 40],   jitter: 8,  label: 'Wood Floor' },
  cave:   { base: [38, 34, 32],   jitter: 8,  label: 'Cave' },
  sand:   { base: [148, 126, 84], jitter: 12, label: 'Sand / Desert' },
  water:  { base: [40, 70, 100],  jitter: 10, label: 'Water / Coast' },
  snow:   { base: [168, 172, 180],jitter: 8,  label: 'Snow' }
};

// Deterministic per-cell hash so the ground texture is stable everywhere
function mapCellHash(x, y, seed) {
  var h = (x * 73856093) ^ (y * 19349663) ^ (seed * 83492791);
  h = h ^ (h >> 13); h = (h * 1274126177) & 0x7fffffff;
  return (h % 1000) / 1000;
}

function syncMapState() {
  if (window.cloudSave) window.cloudSave();
}

// ─── Rendering ───────────────────────────────────────────────
function renderMap() {
  var canvas = document.getElementById('battle-map-canvas');
  if (!canvas) return;
  var m = mapState;
  canvas.width = m.cols * m.cell;
  canvas.height = m.rows * m.cell;
  var ctx = canvas.getContext('2d');

  drawMapGround(ctx, m, false);
  drawMapProps(ctx, m);
  drawMapTokens(ctx, m, false);
  drawMapFog(ctx, m, false);
  drawMapGrid(ctx, m);
}

function drawMapGround(ctx, m, forPlayers) {
  var g = MAP_GROUNDS[m.ground] || MAP_GROUNDS.stone;
  for (var y = 0; y < m.rows; y++) {
    for (var x = 0; x < m.cols; x++) {
      var v = mapCellHash(x, y, m.seed);
      var d = Math.floor((v - 0.5) * 2 * g.jitter);
      ctx.fillStyle = 'rgb(' + (g.base[0]+d) + ',' + (g.base[1]+d) + ',' + (g.base[2]+d) + ')';
      ctx.fillRect(x * m.cell, y * m.cell, m.cell, m.cell);
      // occasional detail speck
      if (v > 0.92) {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.arc(x*m.cell + m.cell*v, y*m.cell + m.cell*(1-v), 2, 0, Math.PI*2);
        ctx.fill();
      }
    }
  }
}

function drawMapGrid(ctx, m) {
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 1;
  for (var x = 0; x <= m.cols; x++) {
    ctx.beginPath(); ctx.moveTo(x*m.cell + 0.5, 0); ctx.lineTo(x*m.cell + 0.5, m.rows*m.cell); ctx.stroke();
  }
  for (var y = 0; y <= m.rows; y++) {
    ctx.beginPath(); ctx.moveTo(0, y*m.cell + 0.5); ctx.lineTo(m.cols*m.cell, y*m.cell + 0.5); ctx.stroke();
  }
}

function drawMapProps(ctx, m) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  (m.props || []).forEach(function(p) {
    ctx.font = Math.floor(m.cell * (p.size || 0.8)) + 'px serif';
    ctx.fillText(p.icon, (p.x + 0.5) * m.cell, (p.y + 0.55) * m.cell);
  });
}

function mapTokenList(forPlayers) {
  // Tokens derive from live combatants; positions live in mapState.tokens
  var list = [];
  var placedAllies = 0, placedEnemies = 0;
  var cmbs = (typeof combatants !== 'undefined' && combatants) ? combatants : [];
  cmbs.forEach(function(c) {
    if (forPlayers && c.hidden) return;
    var pos = mapState.tokens[c.id];
    if (!pos) {
      // First sighting: allies enter bottom-left, enemies top-right
      if (c.type === 'ally') {
        pos = { x: 1 + (placedAllies % (mapState.cols - 2)), y: mapState.rows - 2 };
      } else {
        pos = { x: mapState.cols - 2 - (placedEnemies % (mapState.cols - 2)), y: 1 };
      }
      // avoid stacking on an occupied cell
      var tries = 0;
      while (tries < 50 && list.some(function(t){ return t.x === pos.x && t.y === pos.y; })) {
        pos.x = (pos.x + 1) % mapState.cols; tries++;
      }
      mapState.tokens[c.id] = pos;
      mapNeedsSync = true;
    }
    if (c.type === 'ally') placedAllies++; else placedEnemies++;
    list.push({ id: c.id, x: pos.x, y: pos.y, name: c.name, type: c.type, hp: c.hp, maxHp: c.maxHp, hidden: !!c.hidden, dead: c.hp <= 0 });
  });
  return list;
}

function drawMapTokens(ctx, m, forPlayers) {
  var tokens = mapTokenList(forPlayers);
  tokens.forEach(function(t) {
    var cx = (t.x + 0.5) * m.cell, cy = (t.y + 0.5) * m.cell, r = m.cell * 0.38;
    // body
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.fillStyle = t.dead ? '#3a3a3a' : (t.type === 'ally' ? '#2d6a4f' : t.type === 'enemy' ? '#8b1a1a' : '#5a5a7a');
    ctx.globalAlpha = t.hidden ? 0.45 : 1;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = t.dead ? '#666' : (t.type === 'ally' ? '#7ee0a8' : t.type === 'enemy' ? '#ff8080' : '#b0b0d0');
    ctx.stroke();
    // hp ring
    if (!t.dead && t.maxHp > 0) {
      var pct = Math.max(0, Math.min(1, t.hp / t.maxHp));
      ctx.beginPath();
      ctx.arc(cx, cy, r + 3, -Math.PI/2, -Math.PI/2 + pct * Math.PI * 2);
      ctx.strokeStyle = pct > 0.5 ? '#4caf50' : pct > 0.25 ? '#ff9800' : '#f44336';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    // initials
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + Math.floor(m.cell * 0.3) + 'px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var initials = String(t.name).split(' ').map(function(w){ return w[0]; }).join('').toUpperCase().slice(0, 2);
    ctx.fillText(t.dead ? '💀' : initials, cx, cy);
    ctx.globalAlpha = 1;
    // name label
    ctx.font = Math.floor(m.cell * 0.22) + 'px Cinzel, serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 2.5;
    var label = t.name.length > 10 ? t.name.slice(0, 10) + '…' : t.name;
    ctx.strokeText(label, cx, cy + r + 9);
    ctx.fillText(label, cx, cy + r + 9);
  });
}

function drawMapFog(ctx, m, forPlayers) {
  if (!m.fog || !m.fog.length) return;
  ctx.fillStyle = forPlayers ? '#0d0804' : 'rgba(5,3,2,0.55)';
  m.fog.forEach(function(key) {
    var parts = key.split(',');
    ctx.fillRect(parseInt(parts[0]) * m.cell, parseInt(parts[1]) * m.cell, m.cell, m.cell);
  });
}

// ─── Tools / toolbar ─────────────────────────────────────────
function setMapTool(tool) {
  mapTool = tool;
  document.querySelectorAll('.map-tool-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.tool === tool);
  });
  var palette = document.getElementById('map-prop-palette');
  if (palette) palette.style.display = tool === 'prop' ? 'flex' : 'none';
  var canvas = document.getElementById('battle-map-canvas');
  if (canvas) canvas.style.cursor = tool === 'move' ? 'grab' : tool === 'erase' ? 'not-allowed' : 'crosshair';
}

function setMapProp(icon, btn) {
  mapSelectedProp = icon;
  document.querySelectorAll('.map-prop-btn').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
}

function setMapGround(val) {
  mapState.ground = val;
  renderMap();
  syncMapState();
}

function setMapSize() {
  var c = parseInt(document.getElementById('map-cols').value) || 22;
  var r = parseInt(document.getElementById('map-rows').value) || 14;
  mapState.cols = Math.max(6, Math.min(40, c));
  mapState.rows = Math.max(6, Math.min(30, r));
  renderMap();
  syncMapState();
}

function mapFogAll() {
  var fog = [];
  for (var y = 0; y < mapState.rows; y++)
    for (var x = 0; x < mapState.cols; x++)
      fog.push(x + ',' + y);
  mapState.fog = fog;
  renderMap();
  syncMapState();
  showToast('Map fully fogged — reveal as players explore', 'info');
}

function mapClearFog() {
  mapState.fog = [];
  renderMap();
  syncMapState();
}

function mapClearProps() {
  if (!confirm('Remove all props from the map?')) return;
  mapState.props = [];
  renderMap();
  syncMapState();
}

function mapNewMap() {
  if (!confirm('Start a fresh map? Props, fog, and token positions will be cleared.')) return;
  var ground = mapState.ground, cols = mapState.cols, rows = mapState.rows;
  mapState = defaultMapState();
  mapState.ground = ground; mapState.cols = cols; mapState.rows = rows;
  mapState.seed = Math.floor(Math.random() * 100000);
  renderMap();
  syncMapState();
}

function mapResetTokens() {
  mapState.tokens = {};
  renderMap();
  syncMapState();
  showToast('Tokens re-placed: allies bottom, enemies top', 'info');
}

// ─── Mouse interaction ───────────────────────────────────────
function mapEventCell(e) {
  var canvas = document.getElementById('battle-map-canvas');
  var rect = canvas.getBoundingClientRect();
  var scaleX = canvas.width / rect.width;
  var scaleY = canvas.height / rect.height;
  var px = (e.clientX - rect.left) * scaleX;
  var py = (e.clientY - rect.top) * scaleY;
  return {
    px: px, py: py,
    x: Math.floor(px / mapState.cell),
    y: Math.floor(py / mapState.cell)
  };
}

function mapHitToken(pt) {
  var tokens = mapTokenList(false);
  for (var i = tokens.length - 1; i >= 0; i--) {
    var t = tokens[i];
    var cx = (t.x + 0.5) * mapState.cell, cy = (t.y + 0.5) * mapState.cell;
    var dx = pt.px - cx, dy = pt.py - cy;
    if (Math.sqrt(dx*dx + dy*dy) <= mapState.cell * 0.45) return t;
  }
  return null;
}

function mapHitProp(pt) {
  var props = mapState.props || [];
  for (var i = props.length - 1; i >= 0; i--) {
    if (props[i].x === pt.x && props[i].y === pt.y) return props[i];
  }
  return null;
}

function mapPaintFog(pt, reveal) {
  if (pt.x < 0 || pt.y < 0 || pt.x >= mapState.cols || pt.y >= mapState.rows) return;
  var key = pt.x + ',' + pt.y;
  var idx = mapState.fog.indexOf(key);
  if (reveal) {
    if (idx >= 0) { mapState.fog.splice(idx, 1); mapNeedsSync = true; }
  } else {
    if (idx < 0) { mapState.fog.push(key); mapNeedsSync = true; }
  }
}

function mapMouseDown(e) {
  e.preventDefault();
  var pt = mapEventCell(e);

  if (mapTool === 'move') {
    var t = mapHitToken(pt);
    if (t) { mapDrag = { kind: 'token', id: t.id }; return; }
    var p = mapHitProp(pt);
    if (p) { mapDrag = { kind: 'prop', id: p.id }; return; }
  }
  else if (mapTool === 'prop') {
    if (pt.x < 0 || pt.y < 0 || pt.x >= mapState.cols || pt.y >= mapState.rows) return;
    mapState.props.push({ id: Date.now(), x: pt.x, y: pt.y, icon: mapSelectedProp, size: 0.8 });
    renderMap();
    mapNeedsSync = true;
  }
  else if (mapTool === 'fog' || mapTool === 'reveal') {
    mapFogPainting = true;
    mapPaintFog(pt, mapTool === 'reveal');
    renderMap();
  }
  else if (mapTool === 'erase') {
    var hit = mapHitProp(pt);
    if (hit) {
      mapState.props = mapState.props.filter(function(p) { return p.id !== hit.id; });
      renderMap();
      mapNeedsSync = true;
    }
  }
}

function mapMouseMove(e) {
  var pt = mapEventCell(e);
  if (mapDrag) {
    if (pt.x < 0 || pt.y < 0 || pt.x >= mapState.cols || pt.y >= mapState.rows) return;
    if (mapDrag.kind === 'token') {
      mapState.tokens[mapDrag.id] = { x: pt.x, y: pt.y };
    } else {
      var p = mapState.props.find(function(pp) { return pp.id === mapDrag.id; });
      if (p) { p.x = pt.x; p.y = pt.y; }
    }
    renderMap();
    mapNeedsSync = true;
  } else if (mapFogPainting) {
    mapPaintFog(pt, mapTool === 'reveal');
    renderMap();
  }
}

function mapMouseUp() {
  if (mapDrag || mapFogPainting || mapNeedsSync) {
    mapDrag = null;
    mapFogPainting = false;
    if (mapNeedsSync) { mapNeedsSync = false; syncMapState(); }
  }
}

// ─── Init ────────────────────────────────────────────────────
function initMapTab() {
  var canvas = document.getElementById('battle-map-canvas');
  if (!canvas) return;
  if (!canvas._mapBound) {
    canvas._mapBound = true;
    canvas.addEventListener('mousedown', mapMouseDown);
    canvas.addEventListener('mousemove', mapMouseMove);
    window.addEventListener('mouseup', mapMouseUp);
    canvas.addEventListener('contextmenu', function(e) {
      // right-click deletes a prop regardless of tool
      e.preventDefault();
      var pt = mapEventCell(e);
      var hit = mapHitProp(pt);
      if (hit) {
        mapState.props = mapState.props.filter(function(p) { return p.id !== hit.id; });
        renderMap();
        syncMapState();
      }
    });
    // Build prop palette
    var palette = document.getElementById('map-prop-palette');
    if (palette) {
      palette.innerHTML = MAP_PROPS.map(function(icon, i) {
        return '<button class="map-prop-btn' + (i === 0 ? ' active' : '') + '" onclick="setMapProp(\'' + icon + '\', this)">' + icon + '</button>';
      }).join('');
    }
    // Ground selector
    var gsel = document.getElementById('map-ground');
    if (gsel) {
      gsel.innerHTML = Object.keys(MAP_GROUNDS).map(function(k) {
        return '<option value="' + k + '">' + MAP_GROUNDS[k].label + '</option>';
      }).join('');
      gsel.value = mapState.ground;
    }
    var mc = document.getElementById('map-cols'); if (mc) mc.value = mapState.cols;
    var mr = document.getElementById('map-rows'); if (mr) mr.value = mapState.rows;
  }
  renderMap();
  // First render may have auto-placed new tokens — push them to players
  if (mapNeedsSync) { mapNeedsSync = false; syncMapState(); }
}
