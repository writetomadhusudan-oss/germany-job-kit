/* Australia Resume Builder — Australian-format resume, live preview, sample data. Client-side only. */
const $ = (id) => document.getElementById(id);

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

let expCounter = 0;

function addExp(data) {
  data = data || {};
  const i = expCounter++;
  const div = document.createElement('div');
  div.className = 'exp-entry';
  div.dataset.i = i;
  div.style.cssText = 'border:1px solid var(--line);border-radius:8px;padding:12px;margin-bottom:10px';
  div.innerHTML =
    '<label>Job title <input type="text" data-k="title" value="' + esc(data.title || '') + '"></label>' +
    '<div class="row"><label>Company <input type="text" data-k="company" value="' + esc(data.company || '') + '"></label>' +
    '<label>Location <input type="text" data-k="city" value="' + esc(data.city || '') + '"></label></div>' +
    '<div class="row"><label>Start (MM/YYYY) <input type="text" data-k="start" value="' + esc(data.start || '') + '"></label>' +
    '<label>End (MM/YYYY or "Present") <input type="text" data-k="end" value="' + esc(data.end || '') + '"></label></div>' +
    '<label>Achievements <span class="hint">(one per line — start with action verbs, quantify results)</span>' +
    '<textarea data-k="bullets">' + esc(data.bullets || '') + '</textarea></label>' +
    '<button type="button" class="linklike" data-del>Remove</button>';
  div.querySelectorAll('input,textarea').forEach(el => el.addEventListener('input', render));
  div.querySelector('[data-del]').addEventListener('click', () => { div.remove(); render(); });
  $('expList').appendChild(div);
  render();
}

function addEdu(data) {
  data = data || {};
  const div = document.createElement('div');
  div.className = 'edu-entry';
  div.style.cssText = 'border:1px solid var(--line);border-radius:8px;padding:12px;margin-bottom:10px';
  div.innerHTML =
    '<label>Qualification <input type="text" data-k="degree" value="' + esc(data.degree || '') + '"></label>' +
    '<div class="row"><label>Institution <input type="text" data-k="inst" value="' + esc(data.inst || '') + '"></label>' +
    '<label>Location, Year <input type="text" data-k="meta" value="' + esc(data.meta || '') + '"></label></div>' +
    '<button type="button" class="linklike" data-del>Remove</button>';
  div.querySelectorAll('input').forEach(el => el.addEventListener('input', render));
  div.querySelector('[data-del]').addEventListener('click', () => { div.remove(); render(); });
  $('eduList').appendChild(div);
  render();
}

function collect(sel, keys) {
  return Array.from(document.querySelectorAll(sel)).map(div => {
    const o = {};
    keys.forEach(k => { const el = div.querySelector('[data-k="' + k + '"]'); o[k] = el ? el.value.trim() : ''; });
    return o;
  }).filter(o => Object.values(o).some(v => v));
}

function render() {
  const v = (id) => $(id).value.trim();
  const name = v('f_name') || 'Your Name';
  const contact = [v('f_city'), v('f_phone'), v('f_email'), v('f_linkedin')].filter(Boolean).join(' &nbsp;|&nbsp; ');
  const exps = collect('.exp-entry', ['title', 'company', 'city', 'start', 'end', 'bullets']);
  const edus = collect('.edu-entry', ['degree', 'inst', 'meta']);
  const keyskills = v('f_keyskills').split('\n').map(s => s.trim()).filter(Boolean);
  const certs = v('f_certs').split('\n').map(s => s.trim()).filter(Boolean);
  const summary = v('f_summary');

  let h = '<h1>' + esc(name) + '</h1>';
  if (v('f_title')) h += '<p><strong>' + esc(v('f_title')) + '</strong></p>';
  if (contact) h += '<div class="contact">' + contact + '</div>';
  if (summary) h += '<h2>Professional Summary</h2><p>' + esc(summary) + '</p>';
  if (keyskills.length) h += '<h2>Key Skills</h2><ul>' + keyskills.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';
  if (exps.length) {
    h += '<h2>Professional Experience</h2>';
    exps.forEach(e => {
      const where = [e.company, e.city].filter(Boolean).join(', ');
      const when = [e.start, e.end].filter(Boolean).join(' – ');
      h += '<div class="job-head"><span><strong>' + esc(e.title) + '</strong>' + (where ? ' — ' + esc(where) : '') + '</span><span>' + esc(when) + '</span></div>';
      const bullets = e.bullets.split('\n').map(s => s.trim()).filter(Boolean);
      if (bullets.length) h += '<ul>' + bullets.map(b => '<li>' + esc(b) + '</li>').join('') + '</ul>';
    });
  }
  if (edus.length) {
    h += '<h2>Education</h2>';
    edus.forEach(e => {
      h += '<div class="job-head"><span><strong>' + esc(e.degree) + '</strong></span><span>' + esc(e.meta) + '</span></div>';
      if (e.inst) h += '<p>' + esc(e.inst) + '</p>';
    });
  }
  if (certs.length) h += '<h2>Certifications</h2><ul>' + certs.map(c => '<li>' + esc(c) + '</li>').join('') + '</ul>';
  $('cvPreview').innerHTML = h;
}

['f_name','f_title','f_city','f_phone','f_email','f_linkedin','f_summary','f_keyskills','f_certs']
  .forEach(id => $(id).addEventListener('input', render));
$('addExp').addEventListener('click', () => addExp());
$('addEdu').addEventListener('click', () => addEdu());

$('fillSample').addEventListener('click', () => {
  $('f_name').value = 'Priya Sharma';
  $('f_title').value = 'SAP SuccessFactors Consultant';
  $('f_city').value = 'Sydney, NSW';
  $('f_phone').value = '+61 412 345 678';
  $('f_email').value = 'priya.sharma@example.com';
  $('f_linkedin').value = 'linkedin.com/in/priyasharma';
  $('f_summary').value = 'SAP SuccessFactors consultant with 8 years of experience across Employee Central and Recruiting. Led 5 full-cycle implementations for manufacturing and retail clients (50–5,000 employees). Full Australian work rights; available immediately.';
  $('f_keyskills').value = 'SAP SuccessFactors Employee Central & Recruiting\nFull-cycle implementation leadership (5 go-lives)\nClient-facing workshop facilitation in English\nAgile delivery (Scrum) and stakeholder management';
  $('expList').innerHTML = ''; $('eduList').innerHTML = '';
  addExp({title:'Senior SAP SuccessFactors Consultant', company:'TechMahindra Consulting', city:'Bengaluru, India',
    start:'06/2021', end:'Present',
    bullets:'Led Employee Central implementation for a 5,000-employee retail client; go-live 2 weeks early\nCut onboarding ticket volume by 35% by redesigning recruiting workflows\nMentored 4 junior consultants; ran client workshops in English'});
  addExp({title:'SAP HCM Consultant', company:'Infosys BPM', city:'Bengaluru, India',
    start:'07/2017', end:'05/2021',
    bullets:'Supported payroll and time management for 12,000 employees across 3 countries\nAutomated monthly HR reports with SQL, saving ~20 hours/month'});
  addEdu({degree:'Bachelor of Engineering — Computer Science', inst:'Visvesvaraya Technological University', meta:'Bengaluru, India, 2017'});
  $('f_certs').value = 'SAP Certified Application Associate — SuccessFactors Employee Central (2023)';
  render();
});

$('clearAll').addEventListener('click', () => {
  document.querySelectorAll('input[type=text],input[type=email],textarea').forEach(el => el.value = '');
  $('expList').innerHTML = ''; $('eduList').innerHTML = '';
  render();
});

addExp(); addEdu();
render();
