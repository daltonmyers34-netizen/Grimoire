// ============================================================
// LOOT GENERATOR
// ============================================================
// Depends on globals: MAGIC_ITEMS, MUNDANE_LOOT, lootSessionLog,
//   pendingLootEntries, partyInventory, esc(), showToast()
// ============================================================

// lootSessionLog, pendingLootEntries, partyInventory declared in app.js

// Fisher-Yates shuffle (unbiased)
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateLoot() {
  const tier = parseInt(document.getElementById('loot-cr').value);
  const type = document.getElementById('loot-type').value;

  // Coin tables by tier
  const coins = [
    { cp:[0,100], sp:[0,50],  gp:[0,10],   ep:0, pp:0 },
    { cp:[0,200], sp:[0,100], gp:[0,50],   ep:0, pp:0 },
    { cp:0,       sp:[0,500], gp:[0,300],  ep:0, pp:[0,10] },
    { cp:0,       sp:0,       gp:[0,1000], ep:0, pp:[0,100] },
    { cp:0,       sp:0,       gp:[0,5000], ep:0, pp:[0,1000] },
  ][tier];

  function rng(min, max) { return Math.floor(Math.random()*(max-min+1))+min; }
  function rollRange(r) { return Array.isArray(r) ? rng(r[0],r[1]) : r; }

  const cp = rollRange(coins.cp), sp = rollRange(coins.sp);
  const gp = type==='hoard' ? rollRange(coins.gp)*5 : rollRange(coins.gp);
  const pp = rollRange(coins.pp);

  let totalGP = Math.round(cp/100 + sp/10 + gp + pp*10);
  let items = [];

  // Magic items -- proper per-tier rarity weights
  // Rows = tier 0-4, Cols = [common, uncommon, rare, very_rare, legendary]
  const MAGIC_WEIGHTS = {
    individual: [[0.40,0.05,0.00,0.00,0.00],[0.50,0.15,0.02,0.00,0.00],[0.40,0.30,0.08,0.01,0.00],[0.30,0.30,0.15,0.04,0.00],[0.20,0.25,0.20,0.08,0.01]],
    hoard:      [[0.60,0.20,0.03,0.00,0.00],[0.60,0.35,0.10,0.01,0.00],[0.50,0.40,0.20,0.04,0.00],[0.35,0.40,0.30,0.10,0.02],[0.25,0.35,0.35,0.20,0.06]],
    magic:      [[0.80,0.40,0.08,0.01,0.00],[0.80,0.55,0.20,0.03,0.00],[0.65,0.55,0.30,0.07,0.01],[0.50,0.50,0.40,0.15,0.03],[0.35,0.45,0.45,0.28,0.08]],
  };
  const weights = (MAGIC_WEIGHTS[type]||MAGIC_WEIGHTS.individual)[Math.min(tier,4)];
  const rarityGoldValue = {common:50, uncommon:500, rare:5000, very_rare:50000, legendary:0};
  const rarities = ['common','uncommon','rare','very_rare','legendary'];
  rarities.forEach((r,i) => {
    if (Math.random() < weights[i]) {
      const pool = MAGIC_ITEMS[r];
      if (pool&&pool.length) items.push({ ...pool[Math.floor(Math.random()*pool.length)], rarity: r });
    }
  });

  // Gems/art by tier
  const gemTables = [
    [
      {name:"Copper pieces (handful)",value:1,icon:"\ud83e\ude99"},
      {name:"Tarnished silver coin",value:2,icon:"\ud83e\ude99"},
      {name:"Polished river stone",value:3,icon:"\ud83e\udea8"},
    ],
    [
      {name:"Malachite (green banding)",value:10,icon:"\ud83d\udc9a"},
      {name:"Blue quartz",value:10,icon:"\ud83d\udd35"},
      {name:"Obsidian shard",value:10,icon:"\u26ab"},
      {name:"Lapis lazuli",value:10,icon:"\ud83d\udd35"},
      {name:"Azurite (deep blue-green)",value:10,icon:"\ud83d\udc99"},
      {name:"Tiger eye (golden bands)",value:10,icon:"\ud83d\udfe1"},
      {name:"Turquoise (sky blue)",value:10,icon:"\ud83e\udee5"},
      {name:"Silver earring (plain)",value:20,icon:"\ud83d\udc8d"},
    ],
    [
      {name:"Bloodstone (dark with red flecks)",value:50,icon:"\ud83d\udd34"},
      {name:"Carnelian (orange-red)",value:50,icon:"\ud83d\udfe0"},
      {name:"Moonstone (pale blue sheen)",value:50,icon:"\ud83c\udf19"},
      {name:"Onyx (pure black bands)",value:50,icon:"\u26ab"},
      {name:"Jasper (striated reds)",value:50,icon:"\ud83d\udd34"},
      {name:"Star rose quartz",value:50,icon:"\ud83c\udf38"},
      {name:"Carved ivory statuette",value:25,icon:"\ud83d\uddff"},
      {name:"Gold ring (plain band)",value:75,icon:"\ud83d\udc8d"},
    ],
    [
      {name:"Amber (insect trapped inside)",value:100,icon:"\ud83d\udfe1"},
      {name:"Amethyst (deep purple)",value:100,icon:"\ud83d\udc9c"},
      {name:"Chrysoberyl (green-yellow)",value:100,icon:"\ud83d\udc9b"},
      {name:"Coral (deep red)",value:100,icon:"\ud83e\udeb8"},
      {name:"Garnet (red-brown)",value:100,icon:"\ud83d\udd34"},
      {name:"Jade (green or white)",value:100,icon:"\ud83d\udfe2"},
      {name:"Jet (pure black stone)",value:100,icon:"\u26ab"},
      {name:"Pearl (freshwater)",value:100,icon:"\u26aa"},
      {name:"Tourmaline (various colors)",value:100,icon:"\ud83c\udf08"},
      {name:"Gold art object (small)",value:250,icon:"\ud83c\udffe"},
    ],
    [
      {name:"Alexandrite (changes color in light)",value:500,icon:"\u2728"},
      {name:"Aquamarine (pale blue-green)",value:500,icon:"\ud83e\udee5"},
      {name:"Black pearl (deep lustre)",value:500,icon:"\u26ab"},
      {name:"Peridot (olive green)",value:500,icon:"\ud83d\udfe2"},
      {name:"Topaz (golden yellow)",value:500,icon:"\ud83d\udc9b"},
      {name:"Platinum ring (engraved sigil)",value:400,icon:"\ud83d\udc8d"},
      {name:"Painted silk tapestry",value:250,icon:"\ud83d\uddbc"},
    ],
    [
      {name:"Black opal (dark with color play)",value:1000,icon:"\ud83c\udf0c"},
      {name:"Blue sapphire (deep blue)",value:1000,icon:"\ud83d\udc99"},
      {name:"Emerald (pure brilliant green)",value:1000,icon:"\ud83d\udc9a"},
      {name:"Fire opal (bright orange)",value:1000,icon:"\ud83d\udd25"},
      {name:"Star ruby (six-rayed asterism)",value:1000,icon:"\u2b50"},
      {name:"Yellow sapphire (canary)",value:1000,icon:"\ud83d\udc9b"},
      {name:"Noble gold signet ring",value:800,icon:"\ud83d\udc8d"},
    ],
    [
      {name:"Black sapphire (near flawless)",value:5000,icon:"\ud83d\udda4"},
      {name:"Diamond (clear, 1 carat)",value:5000,icon:"\ud83d\udc8e"},
      {name:"Jacinth (deep fiery orange)",value:5000,icon:"\ud83d\udd34"},
      {name:"Ruby (deep red)",value:5000,icon:"\u2764"},
      {name:"Bejeweled crown (minor)",value:6000,icon:"\ud83d\udc51"},
    ],
    [
      {name:"Diamond (flawless, 5+ carat)",value:50000,icon:"\ud83d\udc8e"},
      {name:"Ruby (exceptional, pigeon blood)",value:25000,icon:"\u2764"},
      {name:"Legendary artifact (sealed chest)",value:0,icon:"\u2728"},
    ],
  ];
  const gemCount = rng(tier === 0 ? 0 : 1, tier + 1);
  const gemPool = gemTables[tier];
  for (let i=0; i<gemCount; i++) {
    const g = gemPool[Math.floor(Math.random()*gemPool.length)];
    items.push({ name:g.name, desc:`Worth approx. ${g.value.toLocaleString()} gp`, icon:g.icon, rarity:'gem', value: g.value > 0 ? g.value.toLocaleString()+' gp' : 'Invaluable' });
    if (g.value) totalGP += g.value;
  }

  // Add mundane goods (using Fisher-Yates shuffle instead of biased sort)
  if (typeof MUNDANE_LOOT !== "undefined" && MUNDANE_LOOT.length) {
    const mCount = type === "hoard" ? Math.floor(Math.random()*3)+2 : (Math.random() < 0.65 ? 1 : 0);
    const mShuf = shuffleArray([...MUNDANE_LOOT]);
    for (let mi = 0; mi < mCount && mi < mShuf.length; mi++) items.push({...mShuf[mi], rarity:"mundane"});
  }
    // Build loot entries list for checkboxes
  const rarityClass = { common:'loot-rarity-common', uncommon:'loot-rarity-uncommon', rare:'loot-rarity-rare', very_rare:'loot-rarity-very-rare', legendary:'loot-rarity-legendary', gem:"", mundane:"" };
  // Add magic item market values to total
  items.forEach(it => {
    if (it.value && it.value !== 'Priceless') {
      const gv = parseInt((it.value+'').replace(/[^0-9]/g,''));
      if (!isNaN(gv)) totalGP += gv;
    }
  });
  const epicFind = items.find(it=>['very_rare','legendary'].includes(it.rarity));

  // Build all loot entries (coin + items)
  pendingLootEntries = [];
  if (cp>0||sp>0||gp>0||pp>0) {
    const coinStr = [cp?cp+' cp':'',sp?sp+' sp':'',gp?gp.toLocaleString()+' gp':'',pp?pp+' pp':''].filter(Boolean).join(' \u00b7 ');
    pendingLootEntries.push({ icon:'\ud83e\ude99', name:'Coin', desc:coinStr, rarity:'', value:gp+' gp' });
  }
  items.forEach(item => {
    const mktVal = item.rarity !== 'gem' ? rarityGoldValue[item.rarity] : null;
    pendingLootEntries.push({ ...item, mktVal });
  });

  // Render with checkboxes
  let html2 = '';
  pendingLootEntries.forEach((entry, i) => {
    const mktStr = entry.mktVal ? ` \u00b7 <span style="color:var(--gold);font-size:10px;">~${entry.mktVal.toLocaleString()} gp</span>` : '';
    const rarLabel = entry.rarity && entry.rarity !== 'gem' ? `<span style="font-size:10px;opacity:0.7;"> (${entry.rarity.replace('_',' ')})</span>` : '';
    html2 += `<label class="loot-check-row" style="display:flex;align-items:flex-start;gap:8px;padding:8px 4px;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;">
      <input type="checkbox" data-loot-idx="${i}" onchange="updateGiveBtn()" style="margin-top:2px;accent-color:var(--gold);cursor:pointer;flex-shrink:0;width:16px;height:16px;">
      <div style="display:flex;align-items:flex-start;gap:8px;min-width:0;flex:1;">
        <span style="font-size:18px;flex-shrink:0;line-height:1.2;">${entry.icon||'\ud83d\udce6'}</span>
        <div style="min-width:0;flex:1;">
          <div class="loot-item-name ${rarityClass[entry.rarity]||''}" style="word-break:break-word;line-height:1.3;">${entry.name}${rarLabel}</div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:2px;word-break:break-word;line-height:1.4;">${entry.desc||''}${mktStr}</div>
        </div>
      </div>
    </label>`;
  });
  html2 += `<div class="loot-total" style="margin-top:8px;">\u2248 ${totalGP.toLocaleString()} gp total${epicFind?' <span style="color:#ffe066;font-size:11px;">\u2728 Exceptional find!</span>':''}</div>`;

  document.getElementById('loot-result').innerHTML = html2;
  const saBtn = document.getElementById('select-all-loot-btn');
  if (saBtn) saBtn.style.display = pendingLootEntries.length ? 'block' : 'none';
  updateGiveBtn();

  // Add to session log
  lootSessionLog.unshift({ time: new Date().toLocaleTimeString(), summary: `${gp}gp, ${items.length} item(s) \u00b7 ~${totalGP.toLocaleString()}gp`, items });
  renderLootLog();
}

function toggleSelectAllLoot(btn) {
  const checks = document.querySelectorAll('#loot-result input[type=checkbox]');
  const allChecked = Array.from(checks).every(c => c.checked);
  checks.forEach(c => c.checked = !allChecked);
  btn.textContent = allChecked ? '\u2610 All' : '\u2611 All';
  updateGiveBtn();
}

function updateGiveBtn() {
  const btn = document.getElementById('give-party-btn');
  if (!btn) return;
  const anyChecked = document.querySelectorAll('#loot-result input[type=checkbox]:checked').length > 0;
  btn.style.display = anyChecked ? 'block' : 'none';
}

function giveLootToParty() {
  const checks = document.querySelectorAll('#loot-result input[type=checkbox]:checked');
  if (!checks.length) return;
  const date = new Date().toLocaleDateString();
  checks.forEach(cb => {
    const idx = parseInt(cb.getAttribute('data-loot-idx'));
    const entry = pendingLootEntries[idx];
    if (!entry) return;
    const label = entry.rarity && entry.rarity !== 'gem'
      ? `${entry.name} (${entry.rarity.replace('_',' ')})`
      : entry.name;
    partyInventory.push({ id: Date.now(), icon: entry.icon||'\ud83d\udce6', name: label, desc: entry.desc||'', value: entry.value||'', date });
    cb.closest('label').style.opacity = '0.35';
    cb.disabled = true;
  });
  savePartyInventory();
  renderPartyInventory();
  showToast(`\u2705 ${checks.length} item(s) added to party inventory`, 'success');
  updateGiveBtn();
}

function addManualLoot() {
  const input = document.getElementById('loot-manual-input');
  const val = input ? input.value.trim() : '';
  if (!val) { showToast('Enter an item name first', 'warn'); return; }
  const date = new Date().toLocaleDateString();
  partyInventory.push({ id: Date.now(), icon: '\ud83d\udce6', name: val, desc: '', value: '', date });
  savePartyInventory();
  renderPartyInventory();
  input.value = '';
  showToast('\u2705 Added to party inventory', 'success');
}

function savePartyInventory() {
  localStorage.setItem('dm-party-inventory', JSON.stringify(partyInventory));
  if (window.cloudSave) window.cloudSave();
}

function clearPartyInventory() {
  if (!confirm('Clear entire party inventory?')) return;
  partyInventory = [];
  savePartyInventory();
  renderPartyInventory();
}

function removeInventoryItem(id) {
  partyInventory = partyInventory.filter(i => i.id !== id);
  savePartyInventory();
  renderPartyInventory();
}

function renderPartyInventory() {
  const list = document.getElementById('party-inventory-list');
  if (!list) return;
  if (!partyInventory.length) {
    list.innerHTML = '<div style="color:var(--text-dim);font-size:13px;padding:8px 0;text-align:center;">Nothing given to party yet.</div>';
    return;
  }
  list.innerHTML = partyInventory.slice().reverse().map(item => `
    <div style="display:flex;align-items:flex-start;gap:8px;padding:8px 4px;border-bottom:1px solid rgba(255,255,255,0.06);">
      <span style="font-size:18px;flex-shrink:0;line-height:1.2;">${item.icon}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;color:var(--parchment);font-weight:500;word-break:break-word;">${item.name}</div>
        ${item.desc ? `<div style="font-size:11px;color:var(--text-dim);margin-top:2px;word-break:break-word;">${item.desc}</div>` : ''}
        <div style="font-size:10px;color:var(--text-dim);margin-top:3px;">Given ${item.date}</div>
      </div>
      <button data-inv-id="${item.id}" onclick="removeInventoryItem(this.getAttribute('data-inv-id')*1)" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:16px;padding:0 4px;flex-shrink:0;line-height:1;" title="Remove">\u2715</button>
    </div>`).join('');
}

function renderLootLog() {
  const el = document.getElementById('loot-log');
  if (!el) return;
  if (!lootSessionLog.length) { el.innerHTML = '<div style="color:var(--text-dim);font-size:13px;padding:8px;">No loot rolled yet...</div>'; return; }
  el.innerHTML = lootSessionLog.map(e => `
    <div class="loot-log-entry" style="padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:12px;">
      <span style="color:var(--text-dim);">${e.time}</span> \u2014 ${e.summary}
    </div>`).join('');
}

function clearLootLog() { lootSessionLog = []; renderLootLog(); }
