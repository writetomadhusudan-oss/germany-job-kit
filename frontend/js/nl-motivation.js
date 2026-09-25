/* Dutch motivatiebrief generator — formal-but-direct business letter, live preview. Client-side only. */
const $ = (id) => document.getElementById(id);
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}
function val(id) { return $(id).value.trim(); }

function render() {
  const name = val('c_name') || 'Your name';
  const sender = [name,
    val('c_street') && val('c_city') ? val('c_street') + ', ' + val('c_city') : (val('c_street') || val('c_city')),
    [val('c_phone'), val('c_email')].filter(Boolean).join(' · ')].filter(Boolean).join('<br>');
  const recip = [val('c_contact'), val('c_company')].filter(Boolean);
  const role = val('c_role') || '[position]';

  let sal = 'Dear Sir or Madam,';
  let close = 'Kind regards,';
  const c = val('c_contact');
  const mF = c.match(/^(mw\.|mevr\.|madame)\s+(.+)/i);
  const mM = c.match(/^(dhr\.|meneer|monsieur)\s+(.+)/i);
  if (mF) { sal = 'Dear ' + mF[2].trim() + ','; }
  else if (mM) { sal = 'Dear ' + mM[2].trim() + ','; }

  const strengths = val('c_strengths').split('\n').map(s => s.trim()).filter(Boolean);
  const p = [];
  p.push('In response to' + (val('c_source') ? ' your advertisement on ' + esc(val('c_source')) : ' your advertisement') +
    ' for the position of <strong>' + esc(role) + '</strong>, I would like to apply.');
  if (val('c_why')) p.push(esc(val('c_why')));
  if (val('c_you')) p.push(esc(val('c_you')));
  if (strengths.length) p.push('My key qualifications for this role:<br>– ' + strengths.map(esc).join('<br>– '));
  if (val('c_start')) p.push(esc(val('c_start')) + ' and I would welcome the opportunity to discuss my application with you in person or by video call.');
  else p.push('I would welcome the opportunity to discuss my application with you in person or by video call.');

  const h =
    '<div class="sender">' + sender + '</div>' +
    (recip.length ? '<div style="text-align:right;margin-top:18px">' + recip.map(esc).join('<br>') + '</div>' : '') +
    '<div class="date" style="text-align:right">' + esc([val('c_place'), val('c_date')].filter(Boolean).join(', ')) + '</div>' +
    '<div class="subject"><strong>Subject: Application for the position of ' + esc(role) + '</strong></div>' +
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
    c_source: 'LinkedIn on 20 September 2026',
    c_why: 'Your track record in digital HR transformation for mid-size enterprises matches exactly the environment I have worked in for eight years, and I am enthusiastic about bringing that experience to the Dutch market.',
    c_you: 'As an SAP SuccessFactors consultant for 8 years, I have led 5 full-cycle implementations for industrial and retail clients of 50 to 5,000 employees, running client workshops in English.',
    c_strengths: '8 years SAP SuccessFactors Employee Central & Recruiting\n5 full-cycle implementations led (50–5,000 employees)\nEnglish fluent (C1); Dutch A2 and currently learning',
    c_start: 'Available from January 2027',
    c_place: 'Bengaluru', c_date: '25 September 2026'
  };
  Object.keys(s).forEach(k => $(k).value = s[k]);
  render();
});
render();
