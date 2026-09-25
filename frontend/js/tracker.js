/* Application tracker — localStorage CRUD + CSV export. Client-side only. */
(function () {
  'use strict';
  const LS_KEY = 'gjk_tracker_v1';
  const $ = (id) => document.getElementById(id);
  let editing = null;

  function load() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
    catch (e) { return []; }
  }
  function save(rows) { localStorage.setItem(LS_KEY, JSON.stringify(rows)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  const STAGE_CLASS = { 'Offer': 'good', 'Rejected': 'bad', 'Withdrawn': 'bad' };

  function render() {
    const rows = load();
    $('empty').style.display = rows.length ? 'none' : 'block';
    $('rows').innerHTML = rows.map((r, i) => {
      const cls = STAGE_CLASS[r.stage] || 'warn';
      const link = r.link ? ' <a href="' + esc(r.link) + '" target="_blank" rel="noopener">↗</a>' : '';
      return '<tr><td><strong>' + esc(r.company) + '</strong>' + link + '</td><td>' + esc(r.role) + '</td>' +
        '<td>' + esc(r.date) + '</td><td><span class="badge ' + cls + '">' + esc(r.stage) + '</span></td>' +
        '<td>' + esc(r.notes) + '</td>' +
        '<td style="white-space:nowrap"><button class="linklike" data-edit="' + i + '">Edit</button>' +
        '<button class="linklike" data-del="' + i + '">Delete</button></td></tr>';
    }).join('');
    document.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openForm(Number(b.dataset.edit))));
    document.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      if (!confirm('Delete this application?')) return;
      const rows = load(); rows.splice(Number(b.dataset.del), 1); save(rows); render();
    }));
  }

  function openForm(i) {
    editing = (i == null ? null : i);
    $('formTitle').textContent = editing == null ? 'New application' : 'Edit application';
    const r = editing == null ? {} : load()[editing];
    $('t_company').value = r.company || ''; $('t_role').value = r.role || '';
    $('t_date').value = r.date || new Date().toISOString().slice(0, 10);
    $('t_stage').value = r.stage || 'Applied';
    $('t_link').value = r.link || ''; $('t_notes').value = r.notes || '';
    $('formCard').style.display = 'block';
    $('formCard').scrollIntoView({ behavior: 'smooth' });
  }

  $('addBtn').addEventListener('click', () => openForm(null));
  $('cancelBtn').addEventListener('click', () => { $('formCard').style.display = 'none'; });
  $('saveBtn').addEventListener('click', () => {
    const company = $('t_company').value.trim();
    if (!company) { alert('Company is required.'); return; }
    const rows = load();
    const rec = { company, role: $('t_role').value.trim(), date: $('t_date').value,
      stage: $('t_stage').value, link: $('t_link').value.trim(), notes: $('t_notes').value.trim() };
    if (editing == null) rows.unshift(rec); else rows[editing] = rec;
    save(rows); $('formCard').style.display = 'none'; render();
  });
  $('csvBtn').addEventListener('click', () => {
    const rows = load();
    if (!rows.length) { alert('Nothing to export yet.'); return; }
    const q = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
    const csv = 'Company,Role,Date,Stage,Link,Notes\n' +
      rows.map(r => [r.company, r.role, r.date, r.stage, r.link, r.notes].map(q).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'germany-job-applications.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  render();
})();
