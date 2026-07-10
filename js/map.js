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
    walls: [],
    roads: [],
    buildings: [],
    fog: [],
    tokens: {}
  };
}

var mapMeasure = null;       // {x0,y0,x1,y1} while dragging with the ruler
var mapSelectedAoE = { r: 4, color: '255,120,30' }; // radius in cells (20ft fireball default)

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
  drawMapRoads(ctx, m);
  drawMapWalls(ctx, m);
  drawMapBuildings(ctx, m);
  drawMapAoE(ctx, m);
  drawMapProps(ctx, m);
  drawMapTokens(ctx, m, false);
  drawMapFog(ctx, m, false);
  drawMapGrid(ctx, m);
  drawMapMeasure(ctx, m);
}

function drawMapRoads(ctx, m) {
  (m.roads || []).forEach(function(key) {
    var p = key.split(',');
    var x = parseInt(p[0]), y = parseInt(p[1]);
    var v = mapCellHash(x, y, m.seed + 31);
    var d = Math.floor((v - 0.5) * 14);
    ctx.fillStyle = 'rgb(' + (122 + d) + ',' + (108 + d) + ',' + (88 + d) + ')';
    ctx.fillRect(x * m.cell, y * m.cell, m.cell, m.cell);
  });
}

var BUILDING_STYLES = {
  inn:        { roof: '#7a4520', wall: '#5a3818', label: 'Inn' },
  smithy:     { roof: '#4e4e52', wall: '#3a3a3e', label: 'Smithy' },
  temple:     { roof: '#7a7a9c', wall: '#5c5c78', label: 'Temple' },
  shop:       { roof: '#6e5a28', wall: '#544418', label: 'Shop' },
  house:      { roof: '#5e4a32', wall: '#463624', label: 'House' },
  guardhouse: { roof: '#46525e', wall: '#343e48', label: 'Guardhouse' },
  stable:     { roof: '#6a5030', wall: '#503c20', label: 'Stable' }
};

function drawMapBuildings(ctx, m) {
  (m.buildings || []).forEach(function(b) {
    var st = BUILDING_STYLES[b.type] || BUILDING_STYLES.house;
    var px = b.x * m.cell, py = b.y * m.cell;
    var pw = b.w * m.cell, ph = b.h * m.cell;
    // walls (slightly inset), then roof with a ridge line
    ctx.fillStyle = st.wall;
    ctx.fillRect(px + 2, py + 2, pw - 4, ph - 4);
    ctx.fillStyle = st.roof;
    ctx.fillRect(px + 5, py + 5, pw - 10, ph - 10);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px + 2, py + 2, pw - 4, ph - 4);
    // roof ridge
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    if (pw >= ph) { ctx.moveTo(px + 8, py + ph / 2); ctx.lineTo(px + pw - 8, py + ph / 2); }
    else { ctx.moveTo(px + pw / 2, py + 8); ctx.lineTo(px + pw / 2, py + ph - 8); }
    ctx.stroke();
    // door notch on the south face
    ctx.fillStyle = 'rgba(20,12,6,0.85)';
    ctx.fillRect(px + pw / 2 - 4, py + ph - 7, 8, 5);
    // label — crisp canvas text with outline
    if (b.name) {
      ctx.font = 'bold ' + Math.max(11, Math.floor(m.cell * 0.30)) + 'px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(b.name, px + pw / 2, py + ph / 2);
      ctx.fillStyle = '#f0e0b8';
      ctx.fillText(b.name, px + pw / 2, py + ph / 2);
    }
  });
}

function mapHitBuilding(pt) {
  var bs = mapState.buildings || [];
  for (var i = bs.length - 1; i >= 0; i--) {
    var b = bs[i];
    if (pt.x >= b.x && pt.x < b.x + b.w && pt.y >= b.y && pt.y < b.y + b.h) return b;
  }
  return null;
}

function drawMapWalls(ctx, m) {
  (m.walls || []).forEach(function(key) {
    var p = key.split(',');
    var x = parseInt(p[0]), y = parseInt(p[1]);
    ctx.fillStyle = '#1c1815';
    ctx.fillRect(x * m.cell, y * m.cell, m.cell, m.cell);
    // subtle top-edge highlight for a raised look
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(x * m.cell, y * m.cell, m.cell, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(x * m.cell, (y + 1) * m.cell - 3, m.cell, 3);
  });
}

function drawMapAoE(ctx, m) {
  (m.props || []).forEach(function(p) {
    if (p.kind !== 'aoe') return;
    var cx = (p.x + 0.5) * m.cell, cy = (p.y + 0.5) * m.cell;
    var r = p.r * m.cell;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(' + (p.color || '255,120,30') + ',0.22)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(' + (p.color || '255,120,30') + ',0.75)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(' + (p.color || '255,120,30') + ',0.9)';
    ctx.font = 'bold ' + Math.floor(m.cell * 0.28) + 'px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((p.r * 5) + 'ft', cx, cy);
  });
}

function drawMapMeasure(ctx, m) {
  if (!mapMeasure) return;
  var x0 = (mapMeasure.x0 + 0.5) * m.cell, y0 = (mapMeasure.y0 + 0.5) * m.cell;
  var x1 = (mapMeasure.x1 + 0.5) * m.cell, y1 = (mapMeasure.y1 + 0.5) * m.cell;
  ctx.beginPath();
  ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
  ctx.strokeStyle = '#ffe066';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([8, 5]);
  ctx.stroke();
  ctx.setLineDash([]);
  // 5-10-5 variant rule: diagonals alternate 5 ft, 10 ft, 5 ft...
  var dx = Math.abs(mapMeasure.x1 - mapMeasure.x0);
  var dy = Math.abs(mapMeasure.y1 - mapMeasure.y0);
  var diag = Math.min(dx, dy);
  var straight = Math.max(dx, dy) - diag;
  var ft = straight * 5 + diag * 5 + Math.floor(diag / 2) * 5;
  var label = ft + ' ft';
  var mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - 12;
  ctx.font = 'bold 15px Cinzel, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.strokeText(label, mx, my);
  ctx.fillStyle = '#ffe066';
  ctx.fillText(label, mx, my);
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
    if (p.kind === 'aoe') return; // drawn in drawMapAoE
    var span = p.cells || 1;
    var cx = (p.x + span / 2) * m.cell;
    var cy = (p.y + span / 2) * m.cell;
    // Parchment base plate so dark icons stay visible on dark ground
    var br = m.cell * span * 0.44;
    var grad = ctx.createRadialGradient(cx, cy, br * 0.2, cx, cy, br);
    grad.addColorStop(0, 'rgba(232,218,184,0.34)');
    grad.addColorStop(1, 'rgba(232,218,184,0.06)');
    ctx.beginPath();
    ctx.arc(cx, cy, br, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = Math.floor(m.cell * span * (p.size || 0.8)) + 'px serif';
    ctx.fillText(p.icon, cx, cy + m.cell * span * 0.05);
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
      // avoid stacking on an occupied cell or a wall
      var tries = 0;
      var blocked = function(p) {
        return list.some(function(t){ return t.x === p.x && t.y === p.y; }) ||
               (mapState.walls || []).indexOf(p.x + ',' + p.y) >= 0;
      };
      while (tries < 80 && blocked(pos)) {
        pos.x = (pos.x + 1) % mapState.cols;
        if (pos.x === 0) pos.y = (pos.y + 1) % mapState.rows;
        tries++;
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
  var aoePal = document.getElementById('map-aoe-palette');
  if (aoePal) aoePal.style.display = tool === 'aoe' ? 'flex' : 'none';
  var canvas = document.getElementById('battle-map-canvas');
  if (canvas) canvas.style.cursor = tool === 'move' ? 'grab' : tool === 'erase' ? 'not-allowed' : 'crosshair';
}

function setMapAoE(radiusFt, color, btn) {
  mapSelectedAoE = { r: radiusFt / 5, color: color };
  document.querySelectorAll('.map-aoe-btn').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
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
    var p = props[i];
    var span = p.kind === 'aoe' ? 1 : (p.cells || 1);
    if (pt.x >= p.x && pt.x < p.x + span && pt.y >= p.y && pt.y < p.y + span) return p;
  }
  return null;
}

function mapResizeProp(p, delta) {
  if (p.kind === 'aoe') return;
  var next = Math.max(1, Math.min(4, (p.cells || 1) + delta));
  if (next === (p.cells || 1)) return;
  p.cells = next;
  renderMap();
  syncMapState();
  showToast(p.icon + ' now ' + next + '×' + next + ' (' + (next * 5) + ' ft)', 'info');
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
    var b = mapHitBuilding(pt);
    if (b) { mapDrag = { kind: 'building', id: b.id, offX: pt.x - b.x, offY: pt.y - b.y }; return; }
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
  else if (mapTool === 'wall') {
    if (pt.x < 0 || pt.y < 0 || pt.x >= mapState.cols || pt.y >= mapState.rows) return;
    mapFogPainting = true; // reuse the drag-paint flag
    mapPaintWall(pt);
    renderMap();
  }
  else if (mapTool === 'measure') {
    mapMeasure = { x0: pt.x, y0: pt.y, x1: pt.x, y1: pt.y };
    mapFogPainting = true;
    renderMap();
  }
  else if (mapTool === 'aoe') {
    if (pt.x < 0 || pt.y < 0 || pt.x >= mapState.cols || pt.y >= mapState.rows) return;
    mapState.props.push({ id: Date.now(), kind: 'aoe', x: pt.x, y: pt.y, r: mapSelectedAoE.r, color: mapSelectedAoE.color });
    renderMap();
    mapNeedsSync = true;
  }
  else if (mapTool === 'erase') {
    var hit = mapHitProp(pt);
    if (hit) {
      mapState.props = mapState.props.filter(function(p) { return p.id !== hit.id; });
      renderMap();
      mapNeedsSync = true;
    } else {
      var wkey = pt.x + ',' + pt.y;
      var widx = (mapState.walls || []).indexOf(wkey);
      if (widx >= 0) {
        mapState.walls.splice(widx, 1);
        renderMap();
        mapNeedsSync = true;
      }
    }
  }
}

function mapPaintWall(pt) {
  if (pt.x < 0 || pt.y < 0 || pt.x >= mapState.cols || pt.y >= mapState.rows) return;
  if (!mapState.walls) mapState.walls = [];
  var key = pt.x + ',' + pt.y;
  if (mapState.walls.indexOf(key) < 0) { mapState.walls.push(key); mapNeedsSync = true; }
}

function mapMouseMove(e) {
  var pt = mapEventCell(e);
  if (mapDrag) {
    if (pt.x < 0 || pt.y < 0 || pt.x >= mapState.cols || pt.y >= mapState.rows) return;
    if (mapDrag.kind === 'token') {
      mapState.tokens[mapDrag.id] = { x: pt.x, y: pt.y };
    } else if (mapDrag.kind === 'building') {
      var b = (mapState.buildings || []).find(function(bb) { return bb.id === mapDrag.id; });
      if (b) {
        b.x = Math.max(0, Math.min(mapState.cols - b.w, pt.x - mapDrag.offX));
        b.y = Math.max(0, Math.min(mapState.rows - b.h, pt.y - mapDrag.offY));
      }
    } else {
      var p = mapState.props.find(function(pp) { return pp.id === mapDrag.id; });
      if (p) { p.x = pt.x; p.y = pt.y; }
    }
    renderMap();
    mapNeedsSync = true;
  } else if (mapFogPainting) {
    if (mapTool === 'measure' && mapMeasure) {
      mapMeasure.x1 = pt.x; mapMeasure.y1 = pt.y;
      renderMap();
    } else if (mapTool === 'wall') {
      mapPaintWall(pt);
      renderMap();
    } else {
      mapPaintFog(pt, mapTool === 'reveal');
      renderMap();
    }
  }
}

function mapMouseUp() {
  if (mapDrag || mapFogPainting || mapNeedsSync) {
    mapDrag = null;
    mapFogPainting = false;
    if (mapMeasure) { mapMeasure = null; renderMap(); }
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
        return;
      }
      var bhit = mapHitBuilding(pt);
      if (bhit && confirm('Remove "' + (bhit.name || 'building') + '"?')) {
        mapState.buildings = mapState.buildings.filter(function(b) { return b.id !== bhit.id; });
        renderMap();
        syncMapState();
      }
    });
    // Scroll wheel over a prop resizes it (1×1 up to 4×4)
    canvas.addEventListener('wheel', function(e) {
      var pt = mapEventCell(e);
      var hit = mapHitProp(pt);
      if (!hit || hit.kind === 'aoe') return; // let the page scroll normally
      e.preventDefault();
      mapResizeProp(hit, e.deltaY < 0 ? 1 : -1);
    }, { passive: false });
    // Double-click: cycle prop size, or rename a building
    canvas.addEventListener('dblclick', function(e) {
      var pt = mapEventCell(e);
      var hit = mapHitProp(pt);
      if (hit && hit.kind !== 'aoe') {
        var next = (hit.cells || 1) >= 4 ? 1 : (hit.cells || 1) + 1;
        hit.cells = next;
        renderMap();
        syncMapState();
        showToast(hit.icon + ' now ' + next + '×' + next + ' (' + (next * 5) + ' ft)', 'info');
        return;
      }
      var bhit = mapHitBuilding(pt);
      if (bhit) {
        var name = prompt('Building name:', bhit.name || '');
        if (name === null) return;
        bhit.name = name.trim();
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
  renderSavedMaps();
  // First render may have auto-placed new tokens — push them to players
  if (mapNeedsSync) { mapNeedsSync = false; syncMapState(); }
}

// ============================================================
// MAP GENERATORS — procedural dungeon / tavern / forest
// ============================================================

function mapSyncControls() {
  var gsel = document.getElementById('map-ground'); if (gsel) gsel.value = mapState.ground;
  var mc = document.getElementById('map-cols'); if (mc) mc.value = mapState.cols;
  var mr = document.getElementById('map-rows'); if (mr) mr.value = mapState.rows;
}

function mapRandInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

function mapGenDungeon() {
  var m = mapState;
  m.ground = Math.random() < 0.5 ? 'stone' : 'cave';
  m.seed = Math.floor(Math.random() * 100000);
  m.props = [];
  m.tokens = {};
  m.fog = [];
  m.roads = [];
  m.buildings = [];

  // Start with everything as wall, carve rooms + corridors
  var floor = {};
  var rooms = [];
  var attempts = 0;
  var targetRooms = mapRandInt(4, 7);
  while (rooms.length < targetRooms && attempts < 80) {
    attempts++;
    var w = mapRandInt(3, 6), h = mapRandInt(3, 5);
    var x = mapRandInt(1, m.cols - w - 2), y = mapRandInt(1, m.rows - h - 2);
    var overlaps = rooms.some(function(r) {
      return x < r.x + r.w + 1 && x + w + 1 > r.x && y < r.y + r.h + 1 && y + h + 1 > r.y;
    });
    if (overlaps) continue;
    rooms.push({ x: x, y: y, w: w, h: h, cx: x + Math.floor(w/2), cy: y + Math.floor(h/2) });
  }
  rooms.forEach(function(r) {
    for (var yy = r.y; yy < r.y + r.h; yy++)
      for (var xx = r.x; xx < r.x + r.w; xx++)
        floor[xx + ',' + yy] = true;
  });
  // L-shaped corridors between consecutive room centers
  for (var i = 1; i < rooms.length; i++) {
    var a = rooms[i - 1], b = rooms[i];
    var x0 = a.cx, y0 = a.cy, x1 = b.cx, y1 = b.cy;
    var xx2, yy2;
    if (Math.random() < 0.5) {
      for (xx2 = Math.min(x0, x1); xx2 <= Math.max(x0, x1); xx2++) floor[xx2 + ',' + y0] = true;
      for (yy2 = Math.min(y0, y1); yy2 <= Math.max(y0, y1); yy2++) floor[x1 + ',' + yy2] = true;
    } else {
      for (yy2 = Math.min(y0, y1); yy2 <= Math.max(y0, y1); yy2++) floor[x0 + ',' + yy2] = true;
      for (xx2 = Math.min(x0, x1); xx2 <= Math.max(x0, x1); xx2++) floor[xx2 + ',' + y1] = true;
    }
  }
  // Walls = every non-floor cell
  var walls = [];
  for (var wy = 0; wy < m.rows; wy++)
    for (var wx = 0; wx < m.cols; wx++)
      if (!floor[wx + ',' + wy]) walls.push(wx + ',' + wy);
  m.walls = walls;

  // Dress the rooms: torches, a chest, bones
  rooms.forEach(function(r, idx) {
    m.props.push({ id: Date.now() + idx * 7 + 1, x: r.x, y: r.y, icon: '🕯', size: 0.6 });
    if (idx === rooms.length - 1) {
      m.props.push({ id: Date.now() + idx * 7 + 2, x: r.cx, y: r.cy, icon: '📦', size: 0.8 });
    }
    if (Math.random() < 0.4) {
      m.props.push({ id: Date.now() + idx * 7 + 3, x: r.x + r.w - 1, y: r.y + r.h - 1, icon: Math.random() < 0.5 ? '💀' : '🦴', size: 0.7 });
    }
  });

  mapSyncControls();
  renderMap();
  syncMapState();
  showToast('⚒ Dungeon generated — ' + rooms.length + ' rooms. Reroll if it isn\'t right!', 'success');
}

function mapGenTavern() {
  var m = mapState;
  m.ground = 'wood';
  m.seed = Math.floor(Math.random() * 100000);
  m.props = [];
  m.tokens = {};
  m.fog = [];
  m.roads = [];
  m.buildings = [];

  // Outer walls with a door on the south side
  var walls = [];
  for (var x = 0; x < m.cols; x++) { walls.push(x + ',0'); walls.push(x + ',' + (m.rows - 1)); }
  for (var y = 0; y < m.rows; y++) { walls.push('0,' + y); walls.push((m.cols - 1) + ',' + y); }
  var doorX = Math.floor(m.cols / 2);
  walls = walls.filter(function(k) { return k !== doorX + ',' + (m.rows - 1) && k !== (doorX + 1) + ',' + (m.rows - 1); });
  m.walls = walls;
  m.props.push({ id: Date.now(), x: doorX, y: m.rows - 1, icon: '🚪', size: 0.85 });

  // Bar along the top: barrels + counter
  for (var bx = 2; bx < Math.min(m.cols - 2, 9); bx++) {
    m.props.push({ id: Date.now() + bx * 3 + 1, x: bx, y: 2, icon: '🛢', size: 0.75 });
  }
  // Fireplace on the east wall
  m.props.push({ id: Date.now() + 500, x: m.cols - 2, y: Math.floor(m.rows / 2), icon: '🔥', size: 0.8 });
  // Tables with chairs scattered in the common room
  var tables = mapRandInt(4, 6);
  for (var t = 0; t < tables; t++) {
    var tx = mapRandInt(3, m.cols - 4), ty = mapRandInt(5, m.rows - 4);
    m.props.push({ id: Date.now() + 600 + t * 5, x: tx, y: ty, icon: '🪑', size: 0.75 });
    if (Math.random() < 0.7) m.props.push({ id: Date.now() + 601 + t * 5, x: tx + 1, y: ty, icon: '🪑', size: 0.75 });
  }
  // Candles for mood
  m.props.push({ id: Date.now() + 900, x: 2, y: m.rows - 3, icon: '🕯', size: 0.6 });

  mapSyncControls();
  renderMap();
  syncMapState();
  showToast('🍺 Tavern generated — bar\'s at the top, door\'s at the bottom', 'success');
}

function mapGenForest() {
  var m = mapState;
  m.ground = 'grass';
  m.seed = Math.floor(Math.random() * 100000);
  m.props = [];
  m.walls = [];
  m.tokens = {};
  m.fog = [];
  m.roads = [];
  m.buildings = [];

  // Tree clusters
  var clusters = mapRandInt(4, 6);
  for (var c = 0; c < clusters; c++) {
    var cx = mapRandInt(2, m.cols - 3), cy = mapRandInt(2, m.rows - 3);
    var size = mapRandInt(3, 7);
    for (var i = 0; i < size; i++) {
      var tx = Math.max(0, Math.min(m.cols - 1, cx + mapRandInt(-2, 2)));
      var ty = Math.max(0, Math.min(m.rows - 1, cy + mapRandInt(-2, 2)));
      m.props.push({ id: Date.now() + c * 100 + i, x: tx, y: ty, icon: Math.random() < 0.5 ? '🌳' : '🌲', size: 0.85 });
    }
  }
  // Rocks and undergrowth
  var scatter = mapRandInt(4, 8);
  for (var s = 0; s < scatter; s++) {
    m.props.push({ id: Date.now() + 1000 + s, x: mapRandInt(0, m.cols - 1), y: mapRandInt(0, m.rows - 1), icon: Math.random() < 0.5 ? '🪨' : '🌿', size: 0.7 });
  }
  // A campfire clearing near the middle
  if (Math.random() < 0.7) {
    m.props.push({ id: Date.now() + 2000, x: Math.floor(m.cols / 2), y: Math.floor(m.rows / 2), icon: '🔥', size: 0.8 });
    m.props.push({ id: Date.now() + 2001, x: Math.floor(m.cols / 2) + 1, y: Math.floor(m.rows / 2), icon: '🪵', size: 0.7 });
  }

  mapSyncControls();
  renderMap();
  syncMapState();
  showToast('🌲 Forest generated — reroll for a new layout', 'success');
}

// ============================================================
// SAVED MAPS — prep maps ahead of the session
// ============================================================
function saveCurrentMap() {
  var name = prompt('Name this map:', '');
  if (name === null) return;
  name = name.trim() || 'Untitled Map';
  var snapshot = {
    id: Date.now(),
    name: name,
    savedAt: new Date().toISOString(),
    cols: mapState.cols, rows: mapState.rows, cell: mapState.cell,
    ground: mapState.ground, seed: mapState.seed,
    props: JSON.parse(JSON.stringify(mapState.props || [])),
    walls: (mapState.walls || []).slice(),
    roads: (mapState.roads || []).slice(),
    buildings: JSON.parse(JSON.stringify(mapState.buildings || [])),
    fog: (mapState.fog || []).slice()
    // tokens intentionally not saved — they belong to whatever combat is live
  };
  var existing = savedMaps.findIndex(function(sm) { return sm.name === name; });
  if (existing >= 0) {
    if (!confirm('A map named "' + name + '" exists. Overwrite it?')) return;
    savedMaps[existing] = snapshot;
  } else {
    savedMaps.push(snapshot);
  }
  renderSavedMaps();
  syncMapState();
  showToast('💾 Map "' + name + '" saved', 'success');
}

function loadSavedMap(idx) {
  var sm = savedMaps[idx];
  if (!sm) return;
  mapState.cols = sm.cols; mapState.rows = sm.rows; mapState.cell = sm.cell || 40;
  mapState.ground = sm.ground; mapState.seed = sm.seed;
  mapState.props = JSON.parse(JSON.stringify(sm.props || []));
  mapState.walls = (sm.walls || []).slice();
  mapState.roads = (sm.roads || []).slice();
  mapState.buildings = JSON.parse(JSON.stringify(sm.buildings || []));
  mapState.fog = (sm.fog || []).slice();
  mapState.tokens = {}; // fresh token placement for current combatants
  var gsel = document.getElementById('map-ground'); if (gsel) gsel.value = mapState.ground;
  var mc = document.getElementById('map-cols'); if (mc) mc.value = mapState.cols;
  var mr = document.getElementById('map-rows'); if (mr) mr.value = mapState.rows;
  renderMap();
  syncMapState();
  showToast('Map "' + sm.name + '" loaded', 'success');
}

function deleteSavedMap(idx) {
  var sm = savedMaps[idx];
  if (!sm) return;
  if (!confirm('Delete saved map "' + sm.name + '"?')) return;
  savedMaps.splice(idx, 1);
  renderSavedMaps();
  syncMapState();
}

function renderSavedMaps() {
  var grid = document.getElementById('saved-maps-grid');
  if (!grid) return;
  if (!savedMaps || !savedMaps.length) {
    grid.innerHTML = '<div style="color:var(--text-dim);font-size:13px;padding:8px;">No saved maps yet. Build a map, then click "Save Map" to keep it for later.</div>';
    return;
  }
  grid.innerHTML = savedMaps.map(function(sm, i) {
    var groundLabel = (MAP_GROUNDS[sm.ground] || {}).label || sm.ground;
    return '<div class="preset-card" onclick="loadSavedMap(' + i + ')">' +
      '<div class="preset-card-name">🗺 ' + sm.name + '</div>' +
      '<div class="preset-card-meta" style="margin-top:4px;">' + groundLabel + ' · ' + sm.cols + '×' + sm.rows + ' · ' + (sm.props || []).length + ' props' + ((sm.walls || []).length ? ' · walls' : '') + '</div>' +
      '<div style="margin-top:6px;display:flex;gap:6px;">' +
        '<button onclick="event.stopPropagation();loadSavedMap(' + i + ')" style="font-size:10px;color:var(--gold);background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.3);border-radius:3px;padding:3px 8px;cursor:pointer;">Load</button>' +
        '<button onclick="event.stopPropagation();deleteSavedMap(' + i + ')" style="font-size:10px;color:var(--blood-light);background:none;border:none;cursor:pointer;padding:0;">✕ Delete</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ============================================================
// TOWN GENERATOR — roads, labeled buildings, crisp canvas text
// ============================================================
var TOWN_NAME_PARTS = {
  innFirst:  ['The Gilded', 'The Prancing', 'The Rusty', 'The Drunken', 'The Silver', 'The Laughing', 'The Sleeping', 'The Golden', 'The Broken', 'The Wandering'],
  innSecond: ['Flagon', 'Pony', 'Anchor', 'Griffin', 'Stag', 'Barrel', 'Dragon', 'Goose', 'Lantern', 'Boar'],
  smith:     ['Ironhand Forge', 'The Anvil', 'Hammerfall Smithy', 'Emberworks', 'Steelsong Forge', 'The Bellows'],
  temple:    ['Temple of Dawn', 'Silver Flame Shrine', 'Moonwell Chapel', 'Sanctum of the Oak', 'The High Seat'],
  shop:      ['Threadneedle & Sons', 'The Curio Cabinet', 'Salt & Sundries', 'The Gilded Scale', 'Wyrmwood Goods', 'The Copper Kettle', 'Hearthside Provisions'],
  guard:     ['The Watchhouse', 'North Gatehouse', 'Garrison Hall'],
  stable:    ['The Hitching Post', 'Swifthoof Stables', 'The Old Paddock']
};

function townPickName(type) {
  var P = TOWN_NAME_PARTS;
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  if (type === 'inn') return pick(P.innFirst) + ' ' + pick(P.innSecond);
  if (type === 'smithy') return pick(P.smith);
  if (type === 'temple') return pick(P.temple);
  if (type === 'guardhouse') return pick(P.guard);
  if (type === 'stable') return pick(P.stable);
  if (type === 'shop') return pick(P.shop);
  return ''; // plain houses stay unlabeled
}

function mapGenTown() {
  var m = mapState;
  m.ground = 'grass';
  m.seed = Math.floor(Math.random() * 100000);
  m.props = [];
  m.walls = [];
  m.tokens = {};
  m.fog = [];
  m.roads = [];
  m.buildings = [];

  // Main road (horizontal, 2 cells wide) + cross road (vertical)
  var mainY = Math.floor(m.rows / 2);
  var crossX = Math.floor(m.cols / 2) + mapRandInt(-3, 3);
  for (var x = 0; x < m.cols; x++) { m.roads.push(x + ',' + mainY); m.roads.push(x + ',' + (mainY + 1)); }
  for (var y = 0; y < m.rows; y++) { m.roads.push(crossX + ',' + y); m.roads.push((crossX + 1) + ',' + y); }

  // Buildings hug the roads — one of each specialty, rest are houses
  var types = ['inn', 'smithy', 'temple', 'shop', 'guardhouse', 'stable', 'house', 'house', 'shop', 'house'];
  var placed = [];
  function overlapsAny(bx, by, bw, bh) {
    // keep off roads and other buildings (with 1-cell gap)
    for (var yy = by; yy < by + bh; yy++)
      for (var xx = bx; xx < bx + bw; xx++)
        if (m.roads.indexOf(xx + ',' + yy) >= 0) return true;
    return placed.some(function(b) {
      return bx < b.x + b.w + 1 && bx + bw + 1 > b.x && by < b.y + b.h + 1 && by + bh + 1 > b.y;
    });
  }
  var idCounter = Date.now();
  types.forEach(function(type) {
    var bw = type === 'house' ? mapRandInt(2, 3) : mapRandInt(3, 5);
    var bh = type === 'house' ? 2 : mapRandInt(2, 3);
    // try positions adjacent to a road
    for (var attempt = 0; attempt < 60; attempt++) {
      var nearMain = Math.random() < 0.6;
      var bx, by;
      if (nearMain) {
        bx = mapRandInt(0, m.cols - bw);
        by = Math.random() < 0.5 ? mainY - bh - 1 : mainY + 3;
      } else {
        bx = Math.random() < 0.5 ? crossX - bw - 1 : crossX + 3;
        by = mapRandInt(0, m.rows - bh);
      }
      if (bx < 0 || by < 0 || bx + bw > m.cols || by + bh > m.rows) continue;
      if (overlapsAny(bx, by, bw, bh)) continue;
      var b = { id: ++idCounter, x: bx, y: by, w: bw, h: bh, type: type, name: townPickName(type) };
      placed.push(b);
      break;
    }
  });
  m.buildings = placed;

  // Street dressing: well at the crossroads, a few barrels/trees
  m.props.push({ id: ++idCounter, x: crossX - 1, y: mainY - 1, icon: '⚱', size: 0.7 });
  for (var s = 0; s < 4; s++) {
    var px2 = mapRandInt(0, m.cols - 1), py2 = mapRandInt(0, m.rows - 1);
    if (m.roads.indexOf(px2 + ',' + py2) >= 0) continue;
    if (placed.some(function(b) { return px2 >= b.x && px2 < b.x + b.w && py2 >= b.y && py2 < b.y + b.h; })) continue;
    m.props.push({ id: ++idCounter, x: px2, y: py2, icon: Math.random() < 0.6 ? '🌳' : '🛢', size: 0.8 });
  }

  mapSyncControls();
  renderMap();
  syncMapState();
  showToast('🏘 Town generated — ' + placed.length + ' buildings. Double-click any building to rename it.', 'success');
}

// Optional: let the AI re-flavor all building names (needs API key)
async function mapAIRenameBuildings() {
  var m = mapState;
  var named = (m.buildings || []).filter(function(b) { return b.type !== 'house'; });
  if (!named.length) { showToast('No labeled buildings on the map — generate a town first', 'info'); return; }
  try {
    showToast('✨ Asking the AI for fresh names...', 'info');
    var list = named.map(function(b, i) { return (i + 1) + '. ' + b.type; }).join('\n');
    var raw = await callClaudeAPI(
      'Invent evocative D&D fantasy establishment names for these buildings in a small town. Reply with ONLY a JSON array of strings in the same order, no other text. Keep each under 26 characters.\n' + list, 400);
    var names = JSON.parse(raw);
    named.forEach(function(b, i) { if (names[i]) b.name = String(names[i]).slice(0, 30); });
    renderMap();
    syncMapState();
    showToast('✨ Buildings renamed!', 'success');
  } catch(e) {
    showToast('AI rename failed: ' + e.message, 'danger');
  }
}
