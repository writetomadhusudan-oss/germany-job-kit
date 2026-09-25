/* CV Builder — state, live preview, sample data. Pure client-side: nothing leaves the browser. */
const $ = (id) => document.getElementById(id);

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

let expCounter = 0, eduCounter = 0, langCounter = 0;

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
    '<label>City <input type="text" data-k="city" value="' + esc(data.city || '') + '"></label></div>' +
    '<div class="row"><label>Start (MM/YYYY) <input type="text" data-k="start" value="' + esc(data.start || '') + '"></label>' +
    '<label>End (MM/YYYY or "present") <input type="text" data-k="end" value="' + esc(data.end || '') + '"></label></div>' +
    '<label>Achievements <span class="hint">(one per line — quantify! e.g. "Cut month-end close from 5 days to 2")</span>' +
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
    '<label>Degree <input type="text" data-k="degree" value="' + esc(data.degree || '') + '"></label>' +
    '<div class="row"><label>Institution <input type="text" data-k="inst" value="' + esc(data.inst || '') + '"></label>' +
    '<label>City, Year <input type="text" data-k="meta" value="' + esc(data.meta || '') + '"></label></div>' +
    '<button type="button" class="linklike" data-del>Remove</button>';
  div.querySelectorAll('input').forEach(el => el.addEventListener('input', render));
  div.querySelector('[data-del]').addEventListener('click', () => { div.remove(); render(); });
  $('eduList').appendChild(div);
  render();
}

const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Native'];
function addLang(data) {
  data = data || {};
  const div = document.createElement('div');
  div.className = 'lang-entry';
  div.style.cssText = 'display:flex;gap:8px;margin-bottom:8px';
  const opts = CEFR.map(l => '<option' + (l === (data.level || 'B2') ? ' selected' : '') + '>' + l + '</option>').join('');
  div.innerHTML =
    '<input type="text" data-k="lang" placeholder="English" value="' + esc(data.lang || '') + '" style="flex:2">' +
    '<select data-k="level" style="flex:1">' + opts + '</select>' +
    '<button type="button" class="linklike" data-del>✕</button>';
  div.querySelectorAll('input,select').forEach(el => el.addEventListener('input', render));
  div.querySelector('[data-del]').addEventListener('click', () => { div.remove(); render(); });
  $('langList').appendChild(div);
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
  const contact = [v('f_street') && v('f_city') ? v('f_street') + ', ' + v('f_city') : (v('f_street') || v('f_city')),
                   v('f_phone'), v('f_email'), v('f_linkedin')].filter(Boolean).join(' &nbsp;|&nbsp; ');
  const exps = collect('.exp-entry', ['title', 'company', 'city', 'start', 'end', 'bullets']);
  const edus = collect('.edu-entry', ['degree', 'inst', 'meta']);
  const langs = collect('.lang-entry', ['lang', 'level']);
  const skills = v('f_skills').split(',').map(s => s.trim()).filter(Boolean);
  const certs = v('f_certs').split('\n').map(s => s.trim()).filter(Boolean);
  const summary = v('f_summary');

  let h = '<h1>' + esc(name) + '</h1>';
  if (v('f_title')) h += '<p><strong>' + esc(v('f_title')) + '</strong></p>';
  if (contact) h += '<div class="contact">' + contact + '</div>';
  if (summary) h += '<h2>Profile</h2><p>' + esc(summary) + '</p>';
  if (exps.length) {
    h += '<h2>Professional Experience</h2>';
    exps.forEach(e => {
      const where = [e.company, e.city].filter(Boolean).join(', ');
      const when = [e.start, e.end].filter(Boolean).join(' – ');
      h += '<div class="job-head"><span>' + esc(e.title) + (where ? ' — ' + esc(where) : '') + '</span><span>' + esc(when) + '</span></div>';
      const bullets = e.bullets.split('\n').map(s => s.trim()).filter(Boolean);
      if (bullets.length) h += '<ul>' + bullets.map(b => '<li>' + esc(b) + '</li>').join('') + '</ul>';
    });
  }
  if (edus.length) {
    h += '<h2>Education</h2>';
    edus.forEach(e => {
      h += '<div class="job-head"><span>' + esc(e.degree) + '</span><span>' + esc(e.meta) + '</span></div>';
      if (e.inst) h += '<p>' + esc(e.inst) + '</p>';
    });
  }
  if (skills.length) h += '<h2>Skills</h2><p>' + esc(skills.join(', ')) + '</p>';
  if (langs.length) h += '<h2>Languages</h2><p>' + langs.map(l => esc(l.lang) + ' — ' + esc(l.level)).join('<br>') + '</p>';
  if (certs.length) h += '<h2>Certifications</h2><ul>' + certs.map(c => '<li>' + esc(c) + '</li>').join('') + '</ul>';
  $('cvPreview').innerHTML = h;
}

['f_name','f_title','f_street','f_city','f_phone','f_email','f_linkedin','f_summary','f_skills','f_certs']
  .forEach(id => $(id).addEventListener('input', render));
$('addExp').addEventListener('click', () => addExp());
$('addEdu').addEventListener('click', () => addEdu());
$('addLang').addEventListener('click', () => addLang());

$('fillSample').addEventListener('click', () => {
  $('f_name').value = 'Priya Sharma';
  $('f_title').value = 'SAP SuccessFactors Consultant';
  $('f_street').value = 'MG Road 42';
  $('f_city').value = '560001 Bengaluru, India';
  $('f_phone').value = '+91 98765 43210';
  $('f_email').value = 'priya.sharma@example.com';
  $('f_linkedin').value = 'linkedin.com/in/priyasharma';
  $('f_summary').value = 'SAP SuccessFactors consultant with 8 years of experience across Employee Central and Recruiting. Led 5 full-cycle implementations for manufacturing and retail clients (50–5,000 employees). Seeking a consultant role in Germany.';
  $('expList').innerHTML = ''; $('eduList').innerHTML = ''; $('langList').innerHTML = '';
  addExp({title:'Senior SAP SuccessFactors Consultant', company:'TechMahindra Consulting', city:'Bengaluru',
    start:'06/2021', end:'present',
    bullets:'Led Employee Central implementation for a 5,000-employee retail client; go-live 2 weeks early\nCut onboarding ticket volume by 35% by redesigning recruiting workflows\nMentored 4 junior consultants; ran client workshops in English'});
  addExp({title:'SAP HCM Consultant', company:'Infosys BPM', city:'Bengaluru',
    start:'07/2017', end:'05/2021',
    bullets:'Supported payroll and time management for 12,000 employees across 3 countries\nAutomated monthly HR reports with SQL, saving ~20 hours/month'});
  addEdu({degree:'B.E. Computer Science', inst:'Visvesvaraya Technological University', meta:'Bengaluru, 2017'});
  addLang({lang:'English', level:'C1'}); addLang({lang:'German', level:'A2'}); addLang({lang:'Hindi', level:'Native'});
  $('f_skills').value = 'SAP SuccessFactors EC, Recruiting, SAP HCM, SQL, Agile/Scrum, Client workshops';
  $('f_certs').value = 'SAP Certified Application Associate — SuccessFactors Employee Central (2023)';
  render();
});

$('clearAll').addEventListener('click', () => {
  document.querySelectorAll('input[type=text],input[type=email],textarea').forEach(el => el.value = '');
  $('expList').innerHTML = ''; $('eduList').innerHTML = ''; $('langList').innerHTML = '';
  render();
});

// start with one empty row of each
addExp(); addEdu(); addLang({lang:'English', level:'C1'});
render();
