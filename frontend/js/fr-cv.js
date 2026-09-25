/* France CV Builder — French-format CV, live preview, sample data. Client-side only. */
const $ = (id) => document.getElementById(id);

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

let expCounter = 0;
let photoData = '';

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
    '<label>Achievements <span class="hint">(one per line — quantify!)</span>' +
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
    '<label>Diploma <input type="text" data-k="degree" value="' + esc(data.degree || '') + '"></label>' +
    '<div class="row"><label>Institution <input type="text" data-k="inst" value="' + esc(data.inst || '') + '"></label>' +
    '<label>City, Year <input type="text" data-k="meta" value="' + esc(data.meta || '') + '"></label></div>' +
    '<button type="button" class="linklike" data-del>Remove</button>';
  div.querySelectorAll('input').forEach(el => el.addEventListener('input', render));
  div.querySelector('[data-del]').addEventListener('click', () => { div.remove(); render(); });
  $('eduList').appendChild(div);
  render();
}

const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Langue maternelle'];
function addLang(data) {
  data = data || {};
  const div = document.createElement('div');
  div.className = 'lang-entry';
  div.style.cssText = 'display:flex;gap:8px;margin-bottom:8px';
  const opts = CEFR.map(l => '<option' + (l === (data.level || 'B2') ? ' selected' : '') + '>' + l + '</option>').join('');
  div.innerHTML =
    '<input type="text" data-k="lang" placeholder="Anglais" value="' + esc(data.lang || '') + '" style="flex:2">' +
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
  const name = v('f_name') || 'Votre nom';
  const extras = [v('f_age'), v('f_nat')].filter(Boolean).join(' · ');
  const contact = [v('f_street') && v('f_city') ? v('f_street') + ', ' + v('f_city') : (v('f_street') || v('f_city')),
                   v('f_phone'), v('f_email'), v('f_linkedin')].filter(Boolean).join(' &nbsp;|&nbsp; ');
  const exps = collect('.exp-entry', ['title', 'company', 'city', 'start', 'end', 'bullets']);
  const edus = collect('.edu-entry', ['degree', 'inst', 'meta']);
  const langs = collect('.lang-entry', ['lang', 'level']);
  const skills = v('f_skills').split(',').map(s => s.trim()).filter(Boolean);
  const interests = v('f_interests').split('\n').map(s => s.trim()).filter(Boolean);
  const summary = v('f_summary');

  let h = '';
  if (photoData) h += '<img src="' + photoData + '" alt="" style="float:right;width:110px;height:140px;object-fit:cover;border-radius:4px;margin:0 0 12px 16px">';
  h += '<h1>' + esc(name) + '</h1>';
  if (v('f_title')) h += '<p><strong>' + esc(v('f_title')) + '</strong></p>';
  if (extras) h += '<p class="muted">' + esc(extras) + '</p>';
  if (contact) h += '<div class="contact">' + contact + '</div>';
  if (summary) h += '<h2>Profil</h2><p>' + esc(summary) + '</p>';
  if (exps.length) {
    h += '<h2>Expérience professionnelle</h2>';
    exps.forEach(e => {
      const where = [e.company, e.city].filter(Boolean).join(', ');
      const when = [e.start, e.end].filter(Boolean).join(' – ');
      h += '<div class="job-head"><span><strong>' + esc(e.title) + '</strong>' + (where ? ' — ' + esc(where) : '') + '</span><span>' + esc(when) + '</span></div>';
      const bullets = e.bullets.split('\n').map(s => s.trim()).filter(Boolean);
      if (bullets.length) h += '<ul>' + bullets.map(b => '<li>' + esc(b) + '</li>').join('') + '</ul>';
    });
  }
  if (edus.length) {
    h += '<h2>Formation</h2>';
    edus.forEach(e => {
      h += '<div class="job-head"><span><strong>' + esc(e.degree) + '</strong></span><span>' + esc(e.meta) + '</span></div>';
      if (e.inst) h += '<p>' + esc(e.inst) + '</p>';
    });
  }
  if (skills.length) h += '<h2>Compétences</h2><p>' + esc(skills.join(', ')) + '</p>';
  if (langs.length) h += '<h2>Langues</h2><p>' + langs.map(l => esc(l.lang) + ' — ' + esc(l.level)).join('<br>') + '</p>';
  if (interests.length) h += '<h2>Centres d\u2019intérêt</h2><p>' + esc(interests.join(', ')) + '</p>';
  h += '<div style="clear:both"></div>';
  $('cvPreview').innerHTML = h;
}

['f_name','f_title','f_street','f_city','f_phone','f_email','f_linkedin','f_age','f_nat','f_summary','f_skills','f_interests']
  .forEach(id => $(id).addEventListener('input', render));

$('f_photo').addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) { photoData = ''; render(); return; }
  const r = new FileReader();
  r.onload = () => { photoData = r.result; render(); };
  r.readAsDataURL(f);
});

$('addExp').addEventListener('click', () => addExp());
$('addEdu').addEventListener('click', () => addEdu());
$('addLang').addEventListener('click', () => addLang());

$('fillSample').addEventListener('click', () => {
  $('f_name').value = 'Priya Sharma';
  $('f_title').value = 'Consultante SAP SuccessFactors';
  $('f_street').value = '42 MG Road';
  $('f_city').value = 'Bengaluru, Inde';
  $('f_phone').value = '+91 98765 43210';
  $('f_email').value = 'priya.sharma@example.com';
  $('f_linkedin').value = 'linkedin.com/in/priyasharma';
  $('f_age').value = '32 ans';
  $('f_nat').value = 'Indienne';
  $('f_summary').value = 'Consultante SAP SuccessFactors avec 8 ans d\u2019expérience sur Employee Central et le recrutement. 5 implémentations complètes pour des clients industriels (50 à 5 000 salariés). Je souhaite mettre cette expertise au service du marché français.';
  $('expList').innerHTML = ''; $('eduList').innerHTML = ''; $('langList').innerHTML = '';
  addExp({title:'Consultante senior SAP SuccessFactors', company:'TechMahindra Consulting', city:'Bengaluru',
    start:'06/2021', end:'présent',
    bullets:'Pilotage de l\u2019implémentation Employee Central pour un client retail de 5 000 salariés ; mise en production 2 semaines en avance\nRéduction de 35 % du volume de tickets d\u2019onboarding grâce à la refonte des processus de recrutement\nEncadrement de 4 consultants juniors ; animation d\u2019ateliers clients en anglais'});
  addExp({title:'Consultante SAP HCM', company:'Infosys BPM', city:'Bengaluru',
    start:'07/2017', end:'05/2021',
    bullets:'Support paie et gestion des temps pour 12 000 salariés dans 3 pays\nAutomatisation des rapports RH mensuels en SQL : ~20 heures économisées par mois'});
  addEdu({degree:'Bachelor of Engineering — Informatique', inst:'Visvesvaraya Technological University', meta:'Bengaluru, 2017'});
  addLang({lang:'Anglais', level:'C1'}); addLang({lang:'Français', level:'A2'}); addLang({lang:'Hindi', level:'Langue maternelle'});
  $('f_skills').value = 'SAP SuccessFactors EC, Recrutement, SAP HCM, SQL, Agile/Scrum, Animation d\u2019ateliers clients';
  $('f_interests').value = 'Voyages\nPhotographie';
  render();
});

$('clearAll').addEventListener('click', () => {
  document.querySelectorAll('input[type=text],input[type=email],textarea').forEach(el => el.value = '');
  $('f_photo').value = ''; photoData = '';
  $('expList').innerHTML = ''; $('eduList').innerHTML = ''; $('langList').innerHTML = '';
  render();
});

addExp(); addEdu(); addLang({lang:'Anglais', level:'C1'});
render();
