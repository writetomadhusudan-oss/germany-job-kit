/* Cover letter generator — German Anschreiben, DIN 5008 business letter format. Client-side only. */
const $ = (id) => document.getElementById(id);
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}
function val(id) { return $(id).value.trim(); }

// Parse a German date. Accepts "DD.MM.YYYY", "D.M.YYYY" and 8 plain digits
// ("01012027" -> "01.01.2027"). Returns the normalized "DD.MM.YYYY" string,
// or null when the input is empty or not a real calendar date.
function parseDEDate(raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return null;
  let d, m, y;
  if (/^\d{8}$/.test(s)) {
    d = +s.slice(0, 2); m = +s.slice(2, 4); y = +s.slice(4, 8);
  } else {
    const mt = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!mt) return null;
    d = +mt[1]; m = +mt[2]; y = +mt[3];
  }
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1) return null;
  if (d > new Date(y, m, 0).getDate()) return null; // e.g. 30.02. or 31.04.
  const p2 = n => String(n).padStart(2, '0');
  return p2(d) + '.' + p2(m) + '.' + y;
}

function setDateError(fieldId, raw, norm) {
  const err = $(fieldId + '_err');
  const bad = raw !== '' && norm === null;
  if (err) {
    err.style.display = bad ? 'block' : 'none';
    if (bad) err.textContent = 'Please enter a valid date as DD.MM.YYYY.';
  }
  const field = $(fieldId);
  if (field) field.style.borderColor = bad ? '#c0392b' : '';
}

function render() {
  const name = val('c_name') || 'Ihr Name';
  const sender = [name, val('c_street') && val('c_city') ? val('c_street') + ', ' + val('c_city') : (val('c_street') || val('c_city')),
                  [val('c_phone'), val('c_email')].filter(Boolean).join(' · ')].filter(Boolean).join('<br>');
  const recip = [val('c_company'), val('c_contact'), val('c_cstreet') && val('c_ccity') ? val('c_cstreet') + ', ' + val('c_ccity') : (val('c_cstreet') || val('c_ccity'))].filter(Boolean);
  const role = val('c_role') || '[Stellenbezeichnung]';
  // normalize contact-based salutation
  let sal = 'Sehr geehrte Damen und Herren,';
  const c = val('c_contact');
  if (/^frau\s+/i.test(c)) sal = 'Sehr geehrte Frau ' + c.replace(/^frau\s+/i, '') + ',';
  else if (/^herr\s+/i.test(c)) sal = 'Sehr geehrter Herr ' + c.replace(/^herr\s+/i, '') + ',';

  const strengths = val('c_strengths').split('\n').map(s => s.trim()).filter(Boolean);
  const p = [];
  p.push('mit großem Interesse habe ich Ihre Stellenanzeige' + (val('c_source') ? ' auf ' + esc(val('c_source')) : '') + ' für die Position als <strong>' + esc(role) + '</strong> gelesen. Hiermit bewerbe ich mich um diese Stelle.');
  if (val('c_motivation')) p.push(esc(val('c_motivation')));
  if (strengths.length) {
    p.push('Was ich für diese Position mitbringe:<br>– ' + strengths.map(esc).join('<br>– '));
  }
  const extras = [];
  if (val('c_salary')) extras.push('meine Gehaltsvorstellung beträgt <strong>' + esc(val('c_salary')) + ' €</strong> brutto pro Jahr');
  const startRaw = val('c_start');
  const startDate = parseDEDate(startRaw);
  setDateError('c_start', startRaw, startDate);
  if (startDate) extras.push('mein frühestmöglicher Eintrittstermin ist der <strong>' + esc(startDate) + '</strong>');
  if (val('c_notice')) extras.push('meine Kündigungsfrist beträgt <strong>' + esc(val('c_notice')) + '</strong>');
  if (extras.length) p.push('Für Ihre Planung: ' + extras.join('; ') + '.');
  p.push('Ich würde mich freuen, meine Bewerbung in einem persönlichen Gespräch oder per Videoanruf mit Ihnen zu besprechen.');

  const dateRaw = val('c_date');
  const dateNorm = parseDEDate(dateRaw);
  setDateError('c_date', dateRaw, dateNorm);

  const h =
    '<div class="sender">' + sender + '</div>' +
    '<div style="margin-top:18px">' + recip.map(esc).join('<br>') + '</div>' +
    '<div class="date">' + esc([val('c_place'), dateNorm].filter(Boolean).join(', ')) + '</div>' +
    '<div class="subject">Bewerbung für die Stelle als ' + esc(role) + '</div>' +
    '<p>' + sal + '</p>' +
    p.map(x => '<p>' + x + '</p>').join('') +
    '<div class="close"><p>Mit freundlichen Grüßen</p><br><p>' + esc(name) + '</p></div>';
  $('letterPreview').innerHTML = h;
}

document.querySelectorAll('input,textarea').forEach(el => el.addEventListener('input', render));

// Auto-format date fields as the user types: 8 digits become DD.MM.YYYY.
['c_date', 'c_start'].forEach(id => {
  $(id).addEventListener('input', () => {
    const el = $(id);
    if (/^\d{8}$/.test(el.value)) {
      el.value = el.value.slice(0, 2) + '.' + el.value.slice(2, 4) + '.' + el.value.slice(4);
      render();
    }
  });
});

$('fillSample').addEventListener('click', () => {
  const s = {
    c_name: 'Priya Sharma', c_street: 'MG Road 42', c_city: '560001 Bengaluru, Indien',
    c_phone: '+91 98765 43210', c_email: 'priya.sharma@example.com',
    c_company: 'Muster GmbH', c_contact: 'Frau Schneider',
    c_cstreet: 'Berliner Straße 10', c_ccity: '10115 Berlin',
    c_role: 'SAP SuccessFactors Consultant (m/w/d)', c_source: 'StepStone am 20. September 2026',
    c_motivation: 'Ihr Fokus auf die Cloud-HR-Transformation mittelständischer Fertigungsunternehmen entspricht genau dem, was ich in den letzten acht Jahren getan habe. Ich freue mich darauf, diese Erfahrung auf den deutschen Markt zu übertragen.',
    c_strengths: '8 Jahre SAP SuccessFactors Employee Central & Recruiting\n5 vollständige Implementierungen geleitet (50–5.000 Mitarbeiter)\nFließend Englisch (C1); Deutsch A2, derzeit in Weiterbildung',
    c_salary: '62.000', c_start: '01.01.2027', c_notice: '3 Monate',
    c_place: 'Bengaluru', c_date: '25.09.2026'
  };
  Object.keys(s).forEach(k => $(k).value = s[k]);
  render();
});
render();
