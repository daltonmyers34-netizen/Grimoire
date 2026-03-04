// ============================================================
// MONSTER AUTOCOMPLETE
// ============================================================
// acSelectedIdx declared in app.js

function monsterAutocomplete(val) {
  const dd = document.getElementById('ac-dropdown');
  acSelectedIdx = -1;
  if (!val || val.length < 2) { dd.classList.remove('open'); return; }
  const q = val.toLowerCase();
  const matches = MONSTER_DB.filter(m => m.name.toLowerCase().includes(q)).slice(0, 10);
  if (!matches.length) { dd.classList.remove('open'); return; }
  dd.innerHTML = matches.map((m,i) => {
    const sign = m.init >= 0 ? '+' : '';
    return `<div class="autocomplete-item" data-idx="${i}" onmousedown="selectMonster(${JSON.stringify(m).replace(/"/g,'&quot;')})">
      <span class="autocomplete-item-name">${m.name}</span>
      <span class="autocomplete-item-meta">HP ${m.hp} · AC ${m.ac} · Init ${sign}${m.init} · CR ${m.cr}</span>
    </div>`;
  }).join('');
  dd.classList.add('open');
}

function selectMonster(m) {
  document.getElementById('new-name').value = m.name;
  document.getElementById('new-hp').value = m.hp;
  document.getElementById('new-ac').value = m.ac;
  document.getElementById('new-init').value = Math.floor(Math.random()*20)+1+(m.init||0);
  document.getElementById('new-type').value = 'enemy';
  document.getElementById('ac-dropdown').classList.remove('open');
}

// BUG FIX: Added Enter key support to select highlighted item
function acKeyNav(e) {
  const dd = document.getElementById('ac-dropdown');
  const items = dd.querySelectorAll('.autocomplete-item');
  if (!items.length) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    acSelectedIdx = Math.min(acSelectedIdx+1, items.length-1);
    items.forEach((el,i) => el.style.background = i===acSelectedIdx ? 'rgba(212,175,55,0.15)':'');
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    acSelectedIdx = Math.max(acSelectedIdx-1, 0);
    items.forEach((el,i) => el.style.background = i===acSelectedIdx ? 'rgba(212,175,55,0.15)':'');
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (acSelectedIdx >= 0 && items[acSelectedIdx]) {
      items[acSelectedIdx].dispatchEvent(new Event('mousedown'));
    }
  } else if (e.key === 'Escape') {
    dd.classList.remove('open');
  }
}

document.addEventListener('click', e => {
  const dd = document.getElementById('ac-dropdown');
  if (dd && !dd.closest('.autocomplete-wrap').contains(e.target)) dd.classList.remove('open');
});

// DOMContentLoaded init moved to app.js
