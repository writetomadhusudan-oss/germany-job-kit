/* Dutch motivatiebrief generator — formal-but-direct business letter, live preview. Client-side only. */
const $ = (id) => document.getElementById(id);
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}
function val(id) { return $(id).value.trim(); }

function render() {
  const name = val('c_name') || 'Uw naam';
  const sender = [name,
    val('c_street') && val('c_city') ? val('c_street') + ', ' + val('c_city') : (val('c_street') || val('c_city')),
    [val('c_phone'), val('c_email')].filter(Boolean).join(' · ')].filter(Boolean).join('<br>');
  const recip = [val('c_contact'), val('c_company')].filter(Boolean);
  const role = val('c_role') || '[functie]';

  let sal = 'Geachte heer, mevrouw,';
  let close = 'Met vriendelijke groet,';
  const c = val('c_contact');
  const mF = c.match(/^(mw\.|mevr\.|mevrouw)\s+(.+)/i);
  const mM = c.match(/^(dhr\.|de heer|meneer)\s+(.+)/i);
  if (mF) { sal = 'Geachte mevrouw ' + mF[2].trim() + ','; }
  else if (mM) { sal = 'Geachte heer ' + mM[2].trim() + ','; }

  const strengths = val('c_strengths').split('\n').map(s => s.trim()).filter(Boolean);
  const p = [];
  p.push('Naar aanleiding van' + (val('c_source') ? ' uw vacature op ' + esc(val('c_source')) : ' uw vacature') +
    ' voor de functie van <strong>' + esc(role) + '</strong> solliciteer ik graag.');
  if (val('c_why')) p.push(esc(val('c_why')));
  if (val('c_you')) p.push(esc(val('c_you')));
  if (strengths.length) p.push('Mijn belangrijkste kwalificaties voor deze functie:<br>– ' + strengths.map(esc).join('<br>– '));
  if (val('c_start')) p.push(esc(val('c_start')) + '. Ik licht mijn sollicitatie graag toe in een persoonlijk gesprek of via een videogesprek.');
  else p.push('Ik licht mijn sollicitatie graag toe in een persoonlijk gesprek of via een videogesprek.');

  const h =
    '<div class="sender">' + sender + '</div>' +
    (recip.length ? '<div style="text-align:right;margin-top:18px">' + recip.map(esc).join('<br>') + '</div>' : '') +
    '<div class="date" style="text-align:right">' + esc([val('c_place'), val('c_date')].filter(Boolean).join(', ')) + '</div>' +
    '<div class="subject"><strong>Betreft: sollicitatie naar de functie van ' + esc(role) + '</strong></div>' +
    '<p>' + sal + '</p>' +
    p.map(x => '<p>' + x + '</p>').join('') +
    '<div class="close"><p>' + close + '</p><br><p>' + esc(name) + '</p></div>';
  $('letterPreview').innerHTML = h;
}

document.querySelectorAll('input,textarea').forEach(el => el.addEventListener('input', render));

$('fillSample').addEventListener('click', () => {
  const s = {
    c_name: 'Priya Sharma', c_street: '42 MG Road', c_city: 'Bengaluru, India',
    c_phone: '+91 98765 43210', c_email: 'priya.sharma@example.com',
    c_company: 'Voorbeeld BV', c_contact: 'Mw. Jansen',
    c_role: 'SAP SuccessFactors Consultant',
    c_source: 'LinkedIn op 20 september 2026',
    c_why: 'Uw staat van dienst in digitale HR-transformatie voor middelgrote ondernemingen komt precies overeen met de omgeving waarin ik de afgelopen acht jaar heb gewerkt, en ik breng die ervaring graag naar de Nederlandse markt.',
    c_you: 'Als SAP SuccessFactors-consultant met 8 jaar ervaring heb ik 5 volledige implementaties geleid voor industriële en retailklanten van 50 tot 5.000 medewerkers, met klantworkshops in het Engels.',
    c_strengths: '8 jaar SAP SuccessFactors Employee Central & Recruiting\n5 volledige implementaties geleid (50–5.000 medewerkers)\nEngels vloeiend (C1); Nederlands A2, momenteel in opleiding',
    c_start: 'Beschikbaar vanaf januari 2027',
    c_place: 'Bengaluru', c_date: '25 september 2026'
  };
  Object.keys(s).forEach(k => $(k).value = s[k]);
  render();
});
render();
