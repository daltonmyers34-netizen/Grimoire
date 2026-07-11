// ============================================================
// QUEST TRACKER
// ============================================================

// Local escape helper (avoid relying on other scripts' globals)
function qEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function questCard(q) {
  var accent = q.status === 'active' ? 'var(--gold)'
             : q.status === 'resolved' ? '#2ecc71'
             : 'var(--text-dim)';
  var opacity = q.status === 'abandoned' ? '0.55' : q.status === 'resolved' ? '0.8' : '1';
  var dateStr = '';
  try { dateStr = q.createdAt ? new Date(q.createdAt).toLocaleDateString() : ''; } catch(e) {}

  var buttons = '';
  if (q.status === 'active') {
    buttons += '<button class="btn btn-gold btn-sm" onclick="setQuestStatus(' + q.id + ', \'resolved\')">✓ Resolve</button>';
    buttons += '<button class="btn btn-ghost btn-sm" onclick="setQuestStatus(' + q.id + ', \'abandoned\')">✗ Abandon</button>';
  } else {
    buttons += '<button class="btn btn-gold btn-sm" onclick="setQuestStatus(' + q.id + ', \'active\')">↺ Reactivate</button>';
  }
  buttons += '<button class="btn btn-ghost btn-sm" onclick="editQuestNotes(' + q.id + ')">✎ Notes</button>';
  buttons += '<button class="btn btn-blood btn-sm" onclick="deleteQuest(' + q.id + ')">🗑</button>';

  return '<div style="background:rgba(0,0,0,0.3);border:1px solid var(--border);border-left:3px solid ' + accent + ';border-radius:6px;padding:12px;margin-bottom:10px;opacity:' + opacity + ';">' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">' +
      '<div style="min-width:0;">' +
        '<div style="font-family:Cinzel,serif;font-size:14px;color:' + accent + ';">' + qEsc(q.title) + '</div>' +
        (q.giver ? '<div style="font-size:11px;color:var(--text-dim);margin-top:2px;">from ' + qEsc(q.giver) + '</div>' : '') +
      '</div>' +
      (dateStr ? '<div style="font-size:10px;color:var(--text-dim);white-space:nowrap;">' + qEsc(dateStr) + '</div>' : '') +
    '</div>' +
    '<div id="quest-notes-' + q.id + '">' +
      (q.notes ? '<div style="font-size:12px;color:var(--parchment);margin-top:8px;white-space:pre-wrap;line-height:1.5;">' + qEsc(q.notes) + '</div>' : '') +
    '</div>' +
    '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">' + buttons + '</div>' +
  '</div>';
}

function renderQuests() {
  var list = document.getElementById('quests-list');
  if (!list) return;
  if (typeof quests === 'undefined' || !quests.length) {
    list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-dim);font-style:italic;">No quests yet. The realm awaits your first errand.</div>';
    return;
  }
  var groups = [
    { key: 'active',    label: '⚔ Active',    color: 'var(--gold)' },
    { key: 'resolved',  label: '✓ Resolved',  color: '#2ecc71' },
    { key: 'abandoned', label: '✗ Abandoned', color: 'var(--text-dim)' }
  ];
  var html = '';
  groups.forEach(function(g) {
    var items = quests.filter(function(q) { return q.status === g.key; });
    if (!items.length) return;
    html += '<div style="font-family:Cinzel,serif;font-size:12px;letter-spacing:0.12em;color:' + g.color + ';border-bottom:1px solid var(--border);padding-bottom:4px;margin:14px 0 10px;">' +
      g.label + ' (' + items.length + ')</div>';
    html += items.map(questCard).join('');
  });
  list.innerHTML = html;
}

function addQuest() {
  var titleEl = document.getElementById('quest-title-input');
  var giverEl = document.getElementById('quest-giver-input');
  var notesEl = document.getElementById('quest-notes-input');
  var title = titleEl ? titleEl.value.trim() : '';
  if (!title) { showToast('Quest needs a title', 'danger'); return; }
  quests.push({
    id: uniqueId(),
    title: title,
    giver: giverEl ? giverEl.value.trim() : '',
    status: 'active',
    notes: notesEl ? notesEl.value.trim() : '',
    createdAt: new Date().toISOString()
  });
  if (titleEl) titleEl.value = '';
  if (giverEl) giverEl.value = '';
  if (notesEl) notesEl.value = '';
  renderQuests();
  if (window.cloudSave) window.cloudSave();
  showToast('Quest added: "' + title + '"', 'success');
}

function setQuestStatus(id, status) {
  var q = quests.find(function(x) { return x.id === id; });
  if (!q) return;
  q.status = status;
  renderQuests();
  if (window.cloudSave) window.cloudSave();
  var msg = status === 'resolved' ? 'Quest resolved!' : status === 'abandoned' ? 'Quest abandoned' : 'Quest reactivated';
  showToast(msg, status === 'resolved' ? 'success' : 'info');
}

function deleteQuest(id) {
  var q = quests.find(function(x) { return x.id === id; });
  if (!q) return;
  if (!confirm('Delete quest "' + q.title + '"? This cannot be undone.')) return;
  quests = quests.filter(function(x) { return x.id !== id; });
  renderQuests();
  if (window.cloudSave) window.cloudSave();
  showToast('Quest deleted', 'info');
}

function editQuestNotes(id) {
  var q = quests.find(function(x) { return x.id === id; });
  if (!q) return;
  var holder = document.getElementById('quest-notes-' + id);
  if (!holder) return;
  // Already editing? Do nothing.
  if (holder.querySelector('textarea')) return;
  holder.innerHTML =
    '<textarea id="quest-notes-edit-' + id + '" rows="3" style="width:100%;box-sizing:border-box;margin-top:8px;background:rgba(0,0,0,0.4);border:1px solid var(--border);border-radius:4px;color:var(--parchment);font-size:12px;padding:6px;"></textarea>' +
    '<div style="display:flex;gap:6px;margin-top:6px;">' +
      '<button class="btn btn-gold btn-sm" onclick="saveQuestNotes(' + id + ')">Save</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="renderQuests()">Cancel</button>' +
    '</div>';
  var ta = document.getElementById('quest-notes-edit-' + id);
  if (ta) { ta.value = q.notes || ''; ta.focus(); }
}

function saveQuestNotes(id) {
  var q = quests.find(function(x) { return x.id === id; });
  var ta = document.getElementById('quest-notes-edit-' + id);
  if (!q || !ta) return;
  q.notes = ta.value.trim();
  renderQuests();
  if (window.cloudSave) window.cloudSave();
  showToast('Quest notes updated', 'success');
}
