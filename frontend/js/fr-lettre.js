/* Lettre de motivation — French business letter preview. Client-side only. */
const $ = (id) => document.getElementById(id);
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}
function val(id) { return $(id).value.trim(); }

function render() {
  const name = val('c_name') || 'Votre nom';
  const sender = [name,
    val('c_street') && val('c_city') ? val('c_street') + ', ' + val('c_city') : (val('c_street') || val('c_city')),
    [val('c_phone'), val('c_email')].filter(Boolean).join(' · ')].filter(Boolean).join('<br>');
  const recip = [val('c_contact'), val('c_company'),
    val('c_cstreet') && val('c_ccity') ? val('c_cstreet') + ', ' + val('c_ccity') : (val('c_cstreet') || val('c_ccity'))].filter(Boolean);
  const role = val('c_role') || '[Poste]';

  let sal = 'Madame, Monsieur,';
  let politesse = 'Je vous prie d\u2019agréer, Madame, Monsieur, l\u2019expression de mes salutations distinguées.';
  const c = val('c_contact');
  const mF = c.match(/^madame\s+(.+)/i);
  const mM = c.match(/^monsieur\s+(.+)/i);
  if (mF) { sal = 'Madame ' + mF[1].trim() + ','; politesse = 'Je vous prie d\u2019agréer, Madame, l\u2019expression de mes salutations distinguées.'; }
  else if (mM) { sal = 'Monsieur ' + mM[1].trim() + ','; politesse = 'Je vous prie d\u2019agréer, Monsieur, l\u2019expression de mes salutations distinguées.'; }

  const strengths = val('c_strengths').split('\n').map(s => s.trim()).filter(Boolean);
  const p = [];
  p.push('Ayant pris connaissance' + (val('c_source') ? ' de votre annonce parue sur ' + esc(val('c_source')) : ' de votre annonce') +
    ' pour le poste de <strong>' + esc(role) + '</strong>, je me permets de vous adresser ma candidature.');
  if (val('c_vous')) p.push('<strong>Vous</strong> — ' + esc(val('c_vous')));
  if (val('c_je')) p.push('<strong>Je</strong> — ' + esc(val('c_je')));
  if (strengths.length) p.push('Mes atouts pour ce poste :<br>– ' + strengths.map(esc).join('<br>– '));
  if (val('c_start')) p.push(esc(val('c_start')) + ', je serais ravie de pouvoir échanger avec vous sur ma candidature, en personne ou en visioconférence.');
  else p.push('Je serais ravie de pouvoir échanger avec vous sur ma candidature, en personne ou en visioconférence.');

  const h =
    '<div class="sender">' + sender + '</div>' +
    '<div style="text-align:right;margin-top:18px">' + recip.map(esc).join('<br>') + '</div>' +
    '<div class="date" style="text-align:right">' + esc([val('c_place'), val('c_date')].filter(Boolean).join(', ')) + '</div>' +
    '<div class="subject"><strong>Objet : Candidature au poste de ' + esc(role) + '</strong></div>' +
    '<p>' + sal + '</p>' +
    p.map(x => '<p>' + x + '</p>').join('') +
    '<div class="close"><p>' + politesse + '</p><br><p>' + esc(name) + '</p></div>';
  $('letterPreview').innerHTML = h;
}

document.querySelectorAll('input,textarea').forEach(el => el.addEventListener('input', render));

$('fillSample').addEventListener('click', () => {
  const s = {
    c_name: 'Priya Sharma', c_street: '42 MG Road', c_city: 'Bengaluru, Inde',
    c_phone: '+91 98765 43210', c_email: 'priya.sharma@example.com',
    c_company: 'Société Exemple SAS', c_contact: 'Madame Dupont',
    c_cstreet: '10 rue de la Paix', c_ccity: '75002 Paris',
    c_role: 'Consultante SAP SuccessFactors',
    c_source: 'Welcome to the Jungle le 20 septembre 2026',
    c_vous: 'votre engagement pour la transformation RH des ETI correspond exactement au terrain sur lequel j\u2019évolue depuis huit ans, et je suis enthousiaste à l\u2019idée d\u2019apporter cette expérience au marché français.',
    c_je: 'consultante SAP SuccessFactors depuis 8 ans, j\u2019ai piloté 5 implémentations complètes pour des clients industriels et retail de 50 à 5 000 salariés, en animant les ateliers clients en anglais.',
    c_strengths: '8 ans SAP SuccessFactors Employee Central & Recrutement\n5 implémentations complètes pilotées (50 à 5 000 salariés)\nAnglais courant (C1) ; français A2 en cours d\u2019apprentissage',
    c_start: 'Disponible à partir de janvier 2027',
    c_place: 'Bengaluru', c_date: '25 septembre 2026'
  };
  Object.keys(s).forEach(k => $(k).value = s[k]);
  render();
});
render();
