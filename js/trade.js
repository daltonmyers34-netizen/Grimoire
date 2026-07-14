// ============================================================
// TRADING — merchant shops + trade offers (DM ⇄ players)
// ============================================================
// Shops are merchant inventories the DM stocks and toggles "open". Players
// browse open shops on their phones, build a cart, and offer gold and/or
// trade-in items. Offers land in the DM inbox for Accept/Decline. The DM can
// also push a ready-made sale to a player, which they accept or decline.

// ─── Rough gp value (for trade-in credit + default prices) ────
function itemValue(item) {
  if (!item) return 0;
  if (typeof item.price === 'number' && item.price > 0) return item.price;
  var base = { weapon: 25, armor: 60, shield: 15, wearable: 80, potion: 50, light: 2, ammo: 1, gear: 5 }[item.slot] || 5;
  if (item.acBonus) base += item.acBonus * 100;         // magic protection is pricey
  if (item.healDice) base = Math.max(base, 50);
  if (/\+\d/.test(item.name || '')) base *= 2;          // "+1" etc. reads as magic
  if (item.dice && /d(10|12)/.test(item.dice)) base += 15;
  return Math.round(base);
}

// ─── Shop CRUD (DM) ──────────────────────────────────────────
function createShop() {
  var name = (document.getElementById('shop-new-name') || {}).value || '';
  name = name.trim() || 'New Shop';
  var npcSel = document.getElementById('shop-new-npc');
  shops.push({ id: uniqueId(), name: name, npcName: (npcSel && npcSel.value) || '', open: false, buyback: 0.5, items: [] });
  var ne = document.getElementById('shop-new-name'); if (ne) ne.value = '';
  renderShopsPanel();
  if (window.cloudSave) window.cloudSave();
}
function deleteShop(id) {
  if (!confirm('Delete this shop?')) return;
  shops = shops.filter(function(s) { return s.id !== id; });
  renderShopsPanel();
  if (window.cloudSaveNow) window.cloudSaveNow();
}
function toggleShopOpen(id) {
  var s = shops.find(function(x) { return x.id === id; });
  if (!s) return;
  s.open = !s.open;
  renderShopsPanel();
  showToast(s.open ? '🏪 ' + s.name + ' is now OPEN — players can shop it' : '🔒 ' + s.name + ' closed', 'info');
  if (window.cloudSaveNow) window.cloudSaveNow();
}
function setShopBuyback(id, pct) {
  var s = shops.find(function(x) { return x.id === id; });
  if (!s) return;
  s.buyback = Math.max(0, Math.min(1, (parseInt(pct) || 0) / 100));
  if (window.cloudSave) window.cloudSave();
}
function addShopItem(id) {
  var s = shops.find(function(x) { return x.id === id; });
  if (!s) return;
  var nameEl = document.getElementById('shop-item-name-' + id);
  var priceEl = document.getElementById('shop-item-price-' + id);
  var qtyEl = document.getElementById('shop-item-qty-' + id);
  var name = nameEl ? nameEl.value.trim() : '';
  if (!name) { showToast('Name the item first', 'info'); return; }
  var slot = (typeof inferItemSlot === 'function') ? inferItemSlot(name) : 'gear';
  var item = { id: uniqueId(), name: name, slot: slot, price: parseInt(priceEl && priceEl.value) || itemValue({ name: name, slot: slot }), qty: Math.max(1, parseInt(qtyEl && qtyEl.value) || 1) };
  var preset = (typeof itemPresetFor === 'function') ? itemPresetFor(name) : null;
  if (preset) for (var k in preset) { if (k !== 'slot') item[k] = preset[k]; }
  else if (slot === 'weapon' && typeof inferDamageType === 'function') { item.dice = '1d6'; item.range = /bow|crossbow|sling/i.test(name) ? 80 : 5; item.damageType = inferDamageType(name) || 'bludgeoning'; }
  s.items.push(item);
  if (nameEl) nameEl.value = ''; if (priceEl) priceEl.value = ''; if (qtyEl) qtyEl.value = '';
  renderShopsPanel();
  if (window.cloudSave) window.cloudSave();
}
function removeShopItem(shopId, itemId) {
  var s = shops.find(function(x) { return x.id === shopId; });
  if (!s) return;
  s.items = s.items.filter(function(i) { return i.id !== itemId; });
  renderShopsPanel();
  if (window.cloudSave) window.cloudSave();
}

function renderShopsPanel() {
  var wrap = document.getElementById('shops-list');
  if (!wrap) return;
  var npcOpts = '<option value="">— no NPC —</option>' + (typeof npcs !== 'undefined' ? npcs : []).map(function(n) { return '<option value="' + esc(n.name) + '">' + esc(n.name) + '</option>'; }).join('');
  var sel = document.getElementById('shop-new-npc');
  if (sel && sel.dataset.count !== String((npcs || []).length)) { sel.innerHTML = npcOpts; sel.dataset.count = String((npcs || []).length); }
  if (!shops.length) { wrap.innerHTML = '<div style="color:var(--text-dim);font-style:italic;padding:10px 0;">No shops yet — name one above and hit Create.</div>'; return; }
  wrap.innerHTML = shops.map(function(s) {
    return '<div style="border:1px solid ' + (s.open ? 'rgba(80,200,80,0.4)' : 'var(--border)') + ';border-radius:8px;padding:10px 12px;margin-bottom:10px;background:rgba(0,0,0,0.2);">' +
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">' +
        '<strong style="font-family:Cinzel,serif;color:var(--gold);">🏪 ' + esc(s.name) + '</strong>' +
        (s.npcName ? '<span style="font-size:11px;color:var(--text-dim);">run by ' + esc(s.npcName) + '</span>' : '') +
        '<span style="flex:1;"></span>' +
        '<button class="btn ' + (s.open ? 'btn-gold' : 'btn-ghost') + ' btn-sm" onclick="toggleShopOpen(' + s.id + ')">' + (s.open ? '🏪 Open' : '🔒 Closed') + '</button>' +
        '<span style="font-size:11px;color:var(--text-dim);">buyback</span>' +
        '<input type="number" min="0" max="100" value="' + Math.round((s.buyback || 0) * 100) + '" onchange="setShopBuyback(' + s.id + ',this.value)" style="width:54px;font-size:12px;padding:3px;text-align:center;"><span style="font-size:11px;color:var(--text-dim);">%</span>' +
        '<button class="btn btn-blood btn-sm" onclick="deleteShop(' + s.id + ')">🗑</button>' +
      '</div>' +
      (s.items.length ? s.items.map(function(it) {
        return '<div style="display:flex;align-items:center;gap:8px;padding:3px 0;font-size:12px;border-bottom:1px solid rgba(255,255,255,0.04);">' +
          '<span style="flex:1;color:var(--parchment);">' + esc(it.name) + '<span style="color:#555;"> · ' + it.slot + (it.qty > 1 ? ' ×' + it.qty : '') + '</span></span>' +
          '<span style="color:#ffd700;">🪙 ' + it.price + '</span>' +
          '<button onclick="removeShopItem(' + s.id + ',' + it.id + ')" style="background:none;border:1px solid var(--border);color:var(--blood-light);border-radius:3px;cursor:pointer;font-size:10px;padding:1px 6px;">✕</button>' +
        '</div>';
      }).join('') : '<div style="font-size:11px;color:#555;padding:4px 0;">Empty — add stock below.</div>') +
      '<div style="display:flex;gap:5px;margin-top:8px;flex-wrap:wrap;">' +
        '<input id="shop-item-name-' + s.id + '" placeholder="Item (e.g. Potion of Healing)" style="flex:2;min-width:130px;font-size:12px;padding:5px;" onkeypress="if(event.key===\'Enter\')addShopItem(' + s.id + ')">' +
        '<input id="shop-item-price-' + s.id + '" type="number" placeholder="🪙" title="price (auto if blank)" style="width:64px;font-size:12px;padding:5px;">' +
        '<input id="shop-item-qty-' + s.id + '" type="number" placeholder="qty" style="width:52px;font-size:12px;padding:5px;">' +
        '<button class="btn btn-ghost btn-sm" onclick="addShopItem(' + s.id + ')">+ Stock</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ─── DM push a sale to a player ──────────────────────────────
function dmOpenOffer() {
  if (typeof party === 'undefined' || !party.length) { showToast('Add a party member first', 'warn'); return; }
  window.__offerCart = [];
  var ov = document.createElement('div');
  ov.id = 'dm-offer-modal';
  ov.className = 'modal-overlay show';
  ov.style.zIndex = '2600';
  ov.innerHTML = '<div class="modal" style="max-width:460px;width:96%;max-height:88vh;overflow-y:auto;">' +
    '<h3 style="font-family:Cinzel,serif;color:var(--gold);margin-bottom:4px;">🤝 Offer a Sale</h3>' +
    '<div style="font-size:12px;color:var(--text-dim);margin-bottom:12px;">Build a sale and push it to a player — it pops on their phone to accept or decline.</div>' +
    '<div class="field-group" style="margin-bottom:8px;"><label class="gi-lbl">To</label><select id="offer-pc">' + party.map(function(p) { return '<option value="' + p.id + '">' + esc(p.name) + '</option>'; }).join('') + '</select></div>' +
    '<div style="display:flex;gap:5px;margin-bottom:6px;">' +
      '<input id="offer-item-name" placeholder="Item to sell" style="flex:1;font-size:13px;padding:6px;" onkeypress="if(event.key===\'Enter\')offerAddItem()">' +
      '<input id="offer-item-price" type="number" placeholder="🪙" style="width:70px;font-size:13px;padding:6px;">' +
      '<button class="btn btn-ghost btn-sm" onclick="offerAddItem()">+ Add</button>' +
    '</div>' +
    '<div id="offer-cart" style="margin-bottom:10px;"></div>' +
    '<div class="modal-btns"><button class="btn btn-gold" onclick="dmPushOffer()">🤝 Push Offer</button>' +
    '<button class="btn btn-ghost" onclick="document.getElementById(\'dm-offer-modal\').remove()">Cancel</button></div></div>';
  document.body.appendChild(ov);
  renderOfferCart();
}
function offerAddItem() {
  var name = (document.getElementById('offer-item-name') || {}).value.trim();
  if (!name) return;
  var slot = (typeof inferItemSlot === 'function') ? inferItemSlot(name) : 'gear';
  var price = parseInt((document.getElementById('offer-item-price') || {}).value) || itemValue({ name: name, slot: slot });
  var item = { id: uniqueId(), name: name, slot: slot, price: price, qty: 1 };
  var preset = (typeof itemPresetFor === 'function') ? itemPresetFor(name) : null;
  if (preset) for (var k in preset) { if (k !== 'slot') item[k] = preset[k]; }
  window.__offerCart.push(item);
  document.getElementById('offer-item-name').value = '';
  document.getElementById('offer-item-price').value = '';
  renderOfferCart();
}
function renderOfferCart() {
  var wrap = document.getElementById('offer-cart');
  if (!wrap) return;
  var cart = window.__offerCart || [];
  var total = cart.reduce(function(n, i) { return n + i.price; }, 0);
  wrap.innerHTML = (cart.length ? cart.map(function(it, i) {
    return '<div style="display:flex;gap:8px;font-size:12px;padding:3px 0;"><span style="flex:1;color:var(--parchment);">' + esc(it.name) + '</span><span style="color:#ffd700;">🪙 ' + it.price + '</span>' +
      '<button onclick="window.__offerCart.splice(' + i + ',1);renderOfferCart()" style="background:none;border:1px solid var(--border);color:var(--blood-light);border-radius:3px;cursor:pointer;font-size:10px;">✕</button></div>';
  }).join('') + '<div style="text-align:right;font-size:13px;color:#ffd700;margin-top:4px;">Total: 🪙 ' + total + '</div>' : '<div style="font-size:11px;color:#555;">No items yet.</div>');
}
function dmPushOffer() {
  var cart = window.__offerCart || [];
  if (!cart.length) { showToast('Add at least one item', 'info'); return; }
  var pcId = parseInt((document.getElementById('offer-pc') || {}).value);
  var pc = party.find(function(p) { return p.id === pcId; });
  if (!pc) return;
  var total = cart.reduce(function(n, i) { return n + i.price; }, 0);
  trades.push({ id: uniqueId(), origin: 'dm', status: 'awaiting-player', pcId: pc.id, pcName: pc.name,
    shopName: 'the DM', get: cart.slice(), payGold: total, payItems: [], ts: Date.now() });
  var m = document.getElementById('dm-offer-modal'); if (m) m.remove();
  showToast('🤝 Offer sent to ' + pc.name, 'success');
  renderTradeInbox();
  if (window.cloudSaveNow) window.cloudSaveNow();
}

// ─── The transfer ────────────────────────────────────────────
function executeTrade(t) {
  var pc = party.find(function(p) { return p.id === t.pcId; });
  if (!pc) return { ok: false, reason: 'player gone' };
  var cost = t.payGold || 0;
  if ((pc.gold || 0) < cost) return { ok: false, reason: pc.name + ' can\'t afford it (' + (pc.gold || 0) + '/' + cost + ' gp)' };
  // Verify the payment items still exist
  var payIds = (t.payItems || []).map(function(x) { return x.id; });
  var payItemObjs = (pc.inventory || []).filter(function(i) { return payIds.indexOf(i.id) >= 0; });
  if (payItemObjs.length !== payIds.length) return { ok: false, reason: 'a trade-in item is missing' };
  // Take payment
  pc.gold = (pc.gold || 0) - cost;
  var shop = t.shopId ? shops.find(function(s) { return s.id === t.shopId; }) : null;
  pc.inventory = (pc.inventory || []).filter(function(i) { return payIds.indexOf(i.id) < 0; });
  if (shop) payItemObjs.forEach(function(it) { shop.items.push(Object.assign({}, it, { id: uniqueId(), qty: 1, price: itemValue(it) })); });
  // Deliver goods
  (t.get || []).forEach(function(g) {
    var qty = g.qty || 1;
    for (var n = 0; n < qty; n++) {
      var copy = Object.assign({}, g); delete copy.qty; delete copy.price;
      copy.id = uniqueId(); copy.equipped = false;
      pc.inventory.push(copy);
    }
    if (shop) { var si = shop.items.find(function(x) { return x.id === g.id; }); if (si) { si.qty = (si.qty || 1) - qty; if (si.qty <= 0) shop.items = shop.items.filter(function(x) { return x.id !== si.id; }); } }
  });
  if (typeof recomputePcCombat === 'function') recomputePcCombat(pc);
  if (typeof savePartyStorage === 'function') savePartyStorage();
  if (typeof renderParty === 'function') renderParty();
  return { ok: true };
}

// ─── Player ⇄ player swap ────────────────────────────────────
function executeP2P(t) {
  var a = party.find(function(p) { return p.id === t.aPcId; });
  var b = party.find(function(p) { return p.id === t.bPcId; });
  if (!a || !b) return { ok: false, reason: 'a trader is gone' };
  if ((a.gold || 0) < (t.aGold || 0)) return { ok: false, reason: a.name + ' lacks the gold' };
  if ((b.gold || 0) < (t.bGold || 0)) return { ok: false, reason: b.name + ' lacks the gold' };
  var aIds = (t.aItems || []).map(function(x) { return x.id; });
  var bIds = (t.bItems || []).map(function(x) { return x.id; });
  var aObjs = (a.inventory || []).filter(function(i) { return aIds.indexOf(i.id) >= 0; });
  var bObjs = (b.inventory || []).filter(function(i) { return bIds.indexOf(i.id) >= 0; });
  if (aObjs.length !== aIds.length || bObjs.length !== bIds.length) return { ok: false, reason: 'a traded item is missing' };
  a.gold = (a.gold || 0) - (t.aGold || 0) + (t.bGold || 0);
  b.gold = (b.gold || 0) - (t.bGold || 0) + (t.aGold || 0);
  a.inventory = (a.inventory || []).filter(function(i) { return aIds.indexOf(i.id) < 0; });
  b.inventory = (b.inventory || []).filter(function(i) { return bIds.indexOf(i.id) < 0; });
  aObjs.forEach(function(it) { b.inventory.push(Object.assign({}, it, { id: uniqueId(), equipped: false })); });
  bObjs.forEach(function(it) { a.inventory.push(Object.assign({}, it, { id: uniqueId(), equipped: false })); });
  if (typeof recomputePcCombat === 'function') { recomputePcCombat(a); recomputePcCombat(b); }
  if (typeof savePartyStorage === 'function') savePartyStorage();
  if (typeof renderParty === 'function') renderParty();
  return { ok: true };
}

function processTradeProposeP2P(req) {
  var a = party.find(function(p) { return p.id === req.fromPcId; });
  var b = party.find(function(p) { return p.id === req.toPcId; });
  if (!a || !b || a.id === b.id) return;
  var pick = function(pc, ids) { return (ids || []).map(function(iid) { var it = (pc.inventory || []).find(function(i) { return i.id === iid; }); return it ? { id: it.id, name: it.name } : null; }).filter(Boolean); };
  var aItems = pick(a, req.giveItems), bItems = pick(b, req.wantItems);
  if (!aItems.length && !bItems.length && !req.giveGold && !req.wantGold) return;
  trades.push({ id: uniqueId(), kind: 'p2p', origin: 'player', status: 'pending',
    aPcId: a.id, aName: a.name, bPcId: b.id, bName: b.name,
    aItems: aItems, aGold: Math.max(0, parseInt(req.giveGold) || 0),
    bItems: bItems, bGold: Math.max(0, parseInt(req.wantGold) || 0), ts: Date.now() });
  showToast('🤝 ' + a.name + ' proposes a swap with ' + b.name, 'info');
  renderTradeInbox();
  if (window.cloudSaveNow) window.cloudSaveNow();
}

// Player counters a DM-pushed offer with different payment → back to DM inbox
function processTradeCounter(req) {
  var orig = trades.find(function(x) { return x.id === req.tradeId && x.status === 'awaiting-player'; });
  if (!orig || orig.pcId !== req.pcId) return;
  var pc = party.find(function(p) { return p.id === req.pcId; });
  if (!pc) return;
  orig.status = 'countered';
  var payItems = (req.payItems || []).map(function(iid) { var it = (pc.inventory || []).find(function(i) { return i.id === iid; }); return it ? { id: it.id, name: it.name } : null; }).filter(Boolean);
  trades.push({ id: uniqueId(), origin: 'player', status: 'pending', pcId: pc.id, pcName: pc.name,
    shopId: orig.shopId, shopName: orig.shopName + ' (counter)', get: orig.get, payGold: Math.max(0, parseInt(req.payGold) || 0), payItems: payItems, ts: Date.now() });
  showToast('🤝 ' + pc.name + ' counter-offered', 'info');
  renderTradeInbox();
  if (window.cloudSaveNow) window.cloudSaveNow();
}

// DM counters a player's offer: re-push the same goods at a new price
function dmCounterTrade(id) {
  var t = trades.find(function(x) { return x.id === id; });
  if (!t || t.kind === 'p2p') return;
  var suggested = window.prompt('Counter-offer to ' + t.pcName + ' — new price in gold for ' + (t.get || []).map(function(g) { return g.name; }).join(', ') + ':', String(t.payGold || 0));
  if (suggested === null) return;
  t.status = 'countered';
  trades.push({ id: uniqueId(), origin: 'dm', status: 'awaiting-player', pcId: t.pcId, pcName: t.pcName,
    shopName: (t.shopName || 'the DM') + ' (counter)', get: t.get, payGold: Math.max(0, parseInt(suggested) || 0), payItems: [], ts: Date.now() });
  showToast('🤝 Counter sent to ' + t.pcName, 'info');
  renderTradeInbox();
  if (window.cloudSaveNow) window.cloudSaveNow();
}

// ─── DM inbox: accept / decline player offers ────────────────
function acceptTrade(id) {
  var t = trades.find(function(x) { return x.id === id; });
  if (!t) return;
  var res = t.kind === 'p2p' ? executeP2P(t) : executeTrade(t);
  if (!res.ok) { showToast('🚫 ' + res.reason, 'warn'); return; }
  t.status = 'accepted';
  if (t.kind === 'p2p') {
    showToast('✅ Swap done — ' + t.aName + ' ⇄ ' + t.bName, 'success');
    if (typeof logCombat === 'function') logCombat('🤝 Swap: ' + t.aName + ' ⇄ ' + t.bName, 'info');
  } else {
    var names = (t.get || []).map(function(g) { return g.name; }).join(', ');
    showToast('✅ Trade done — ' + t.pcName + ' got ' + names, 'success');
    if (typeof logCombat === 'function') logCombat('🤝 Trade: ' + t.pcName + ' bought ' + names + ' for ' + (t.payGold || 0) + ' gp' + ((t.payItems || []).length ? ' + ' + t.payItems.map(function(x) { return x.name; }).join(', ') : ''), 'info');
  }
  renderTradeInbox();
  if (window.cloudSaveNow) window.cloudSaveNow();
}
function declineTrade(id) {
  var t = trades.find(function(x) { return x.id === id; });
  if (!t) return;
  t.status = 'declined';
  showToast('❌ Declined ' + t.pcName + '\'s offer', 'info');
  renderTradeInbox();
  if (window.cloudSaveNow) window.cloudSaveNow();
}
function clearResolvedTrades() {
  trades = trades.filter(function(t) { return t.status === 'pending' || t.status === 'awaiting-player'; });
  renderTradeInbox();
  if (window.cloudSave) window.cloudSave();
}

function renderTradeInbox() {
  var wrap = document.getElementById('trade-inbox');
  if (!wrap) return;
  var pending = trades.filter(function(t) { return t.status === 'pending'; });
  var badge = document.getElementById('trade-inbox-badge');
  if (badge) { badge.style.display = pending.length ? '' : 'none'; badge.textContent = pending.length; }
  if (!trades.length) { wrap.innerHTML = '<div style="color:var(--text-dim);font-style:italic;padding:8px 0;">No trade offers yet.</div>'; return; }
  wrap.innerHTML = trades.slice().reverse().map(function(t) {
    var statusColor = t.status === 'accepted' ? '#8fd050' : t.status === 'declined' ? '#e05050' : t.status === 'countered' ? '#888' : t.status === 'awaiting-player' ? '#c8a8ff' : 'var(--gold)';
    var body;
    if (t.kind === 'p2p') {
      var aGives = (t.aItems || []).map(function(x) { return esc(x.name); }).concat(t.aGold ? ['🪙 ' + t.aGold] : []);
      var bGives = (t.bItems || []).map(function(x) { return esc(x.name); }).concat(t.bGold ? ['🪙 ' + t.bGold] : []);
      body = '<div style="font-size:12px;color:var(--text-dim);margin-bottom:4px;">🤝 Player swap</div>' +
        '<div style="font-size:13px;color:var(--gold-light);"><strong>' + esc(t.aName) + '</strong> gives: ' + (aGives.length ? aGives.join(', ') : 'nothing') + '</div>' +
        '<div style="font-size:13px;color:var(--gold-light);"><strong>' + esc(t.bName) + '</strong> gives: ' + (bGives.length ? bGives.join(', ') : 'nothing') + '</div>';
    } else {
      var goods = (t.get || []).map(function(g) { return esc(g.name) + (g.qty > 1 ? ' ×' + g.qty : ''); }).join(', ');
      var pay = [];
      if (t.payGold) pay.push('🪙 ' + t.payGold);
      (t.payItems || []).forEach(function(x) { pay.push(esc(x.name)); });
      body = '<div style="font-size:12px;color:var(--text-dim);margin-bottom:4px;"><strong style="color:var(--parchment);">' + esc(t.pcName) + '</strong> ' + (t.origin === 'dm' ? 'was offered' : 'wants to buy') + ' from ' + esc(t.shopName || 'a shop') + '</div>' +
        '<div style="font-size:13px;color:var(--gold-light);">Gets: ' + goods + '</div>' +
        '<div style="font-size:13px;color:#ffd700;">Pays: ' + (pay.length ? pay.join(' + ') : 'nothing') + '</div>';
    }
    return '<div style="border:1px solid var(--border);border-radius:6px;padding:8px 10px;margin-bottom:6px;background:rgba(0,0,0,0.2);">' +
      body +
      '<div style="display:flex;gap:6px;align-items:center;margin-top:6px;">' +
        (t.status === 'pending' ?
          '<button class="btn btn-gold btn-sm" onclick="acceptTrade(' + t.id + ')">✅ Accept</button>' +
          '<button class="btn btn-blood btn-sm" onclick="declineTrade(' + t.id + ')">❌ Decline</button>' +
          (t.kind !== 'p2p' ? '<button class="btn btn-ghost btn-sm" onclick="dmCounterTrade(' + t.id + ')">↔ Counter</button>' : '')
          : '<span style="font-family:Cinzel,serif;font-size:12px;color:' + statusColor + ';">' + t.status.replace('-', ' ') + '</span>') +
      '</div>' +
    '</div>';
  }).join('');
}

// ─── Player requests ─────────────────────────────────────────
function processTradeOffer(req) {
  var pc = party.find(function(p) { return p.id === req.pcId; });
  if (!pc) return;
  var shop = shops.find(function(s) { return s.id === req.shopId && s.open; });
  if (!shop) { rejectPlayer && rejectPlayer({ name: pc.name }, 'That shop just closed.'); return; }
  var get = (req.get || []).map(function(g) {
    var si = shop.items.find(function(x) { return x.id === g.id; });
    return si ? Object.assign({}, si, { qty: g.qty || 1 }) : null;
  }).filter(Boolean);
  if (!get.length) return;
  var payItems = (req.payItems || []).map(function(iid) {
    var it = (pc.inventory || []).find(function(i) { return i.id === iid; });
    return it ? { id: it.id, name: it.name } : null;
  }).filter(Boolean);
  trades.push({ id: uniqueId(), origin: 'player', status: 'pending', pcId: pc.id, pcName: pc.name,
    shopId: shop.id, shopName: shop.name, get: get, payGold: Math.max(0, parseInt(req.payGold) || 0), payItems: payItems, ts: Date.now() });
  showToast('🤝 ' + pc.name + ' sent a trade offer', 'info');
  renderTradeInbox();
  if (window.cloudSaveNow) window.cloudSaveNow();
}
// Player accepts a DM-pushed offer → auto-execute (DM set the terms)
function processTradeAccept(req) {
  var t = trades.find(function(x) { return x.id === req.tradeId && x.status === 'awaiting-player'; });
  if (!t || t.pcId !== req.pcId) return;
  var res = executeTrade(t);
  if (!res.ok) { t.status = 'pending'; showToast('🚫 ' + t.pcName + '\'s purchase failed — ' + res.reason, 'warn'); renderTradeInbox(); if (window.cloudSaveNow) window.cloudSaveNow(); return; }
  t.status = 'accepted';
  showToast('✅ ' + t.pcName + ' accepted the offer', 'success');
  renderTradeInbox();
  if (window.cloudSaveNow) window.cloudSaveNow();
}
function processTradeDecline(req) {
  var t = trades.find(function(x) { return x.id === req.tradeId; });
  if (!t || t.pcId !== req.pcId) return;
  t.status = 'declined';
  showToast('❌ ' + t.pcName + ' declined the offer', 'info');
  renderTradeInbox();
  if (window.cloudSaveNow) window.cloudSaveNow();
}
