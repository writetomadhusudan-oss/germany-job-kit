/* Cover letter generator — German business letter preview. Client-side only. */
const $ = (id) => document.getElementById(id);
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}
function val(id) { return $(id).value.trim(); }

function render() {
  const name = val('c_name') || 'Your Name';
  const sender = [name, val('c_street') && val('c_city') ? val('c_street') + ', ' + val('c_city') : (val('c_street') || val('c_city')),
                  [val('c_phone'), val('c_email')].filter(Boolean).join(' · ')].filter(Boolean).join('<br>');
  const recip = [val('c_company'), val('c_contact'), val('c_cstreet') && val('c_ccity') ? val('c_cstreet') + ', ' + val('c_ccity') : (val('c_cstreet') || val('c_ccity'))].filter(Boolean);
  const role = val('c_role') || '[Position]';
  // normalize contact-based salutation
  let sal = 'Sehr geehrte Damen und Herren,';
  const c = val('c_contact');
  if (/^frau\s+/i.test(c)) sal = 'Sehr geehrte Frau ' + c.replace(/^frau\s+/i, '') + ',';
  else if (/^herr\s+/i.test(c)) sal = 'Sehr geehrter Herr ' + c.replace(/^herr\s+/i, '') + ',';

  const strengths = val('c_strengths').split('\n').map(s => s.trim()).filter(Boolean);
  const p = [];
  p.push('with great interest I read your job advertisement' + (val('c_source') ? ' on ' + esc(val('c_source')) : '') + ' for the position of <strong>' + esc(role) + '</strong>. I would like to apply for this role.');
  if (val('c_motivation')) p.push(esc(val('c_motivation')));
  if (strengths.length) {
    p.push('What I bring to the role:<br>– ' + strengths.map(esc).join('<br>– '));
  }
  const extras = [];
  if (val('c_salary')) extras.push('my salary expectation is <strong>€' + esc(val('c_salary')) + '</strong> gross per year');
  if (val('c_start')) extras.push('my earliest possible start date is <strong>' + esc(val('c_start')) + '</strong>');
  if (val('c_notice')) extras.push('my notice period is <strong>' + esc(val('c_notice')) + '</strong>');
  if (extras.length) p.push('For your planning: ' + extras.join('; ') + '.');
  p.push('I would welcome the opportunity to discuss my application with you in person or by video call.');

  const h =
    '<div class="sender">' + sender + '</div>' +
    '<div style="margin-top:18px">' + recip.map(esc).join('<br>') + '</div>' +
    '<div class="date">' + esc([val('c_place'), val('c_date')].filter(Boolean).join(', ')) + '</div>' +
    '<div class="subject">Application for the position of ' + esc(role) + '</div>' +
    '<p>' + sal + '</p>' +
    p.map(x => '<p>' + x + '</p>').join('') +
    '<div class="close"><p>Mit freundlichen Grüßen</p><br><p>' + esc(name) + '</p></div>';
  $('letterPreview').innerHTML = h;
}

document.querySelectorAll('input,textarea').forEach(el => el.addEventListener('input', render));

$('fillSample').addEventListener('click', () => {
  const s = {
    c_name: 'Priya Sharma', c_street: 'MG Road 42', c_city: '560001 Bengaluru, India',
    c_phone: '+91 98765 43210', c_email: 'priya.sharma@example.com',
    c_company: 'Muster GmbH', c_contact: 'Frau Schneider',
    c_cstreet: 'Berliner Straße 10', c_ccity: '10115 Berlin',
    c_role: 'SAP SuccessFactors Consultant (m/f/d)', c_source: 'StepStone on 20 September 2026',
    c_motivation: 'Your focus on cloud HR transformation for mid-size manufacturers matches exactly what I have done for the past eight years. I am excited by the chance to bring that experience to the German market.',
    c_strengths: '8 years SAP SuccessFactors Employee Central & Recruiting\nLed 5 full-cycle implementations (50–5,000 employees)\nFluent English (C1); German A2 and learning',
    c_salary: '62,000', c_start: '01.01.2027', c_notice: '3 months',
    c_place: 'Bengaluru', c_date: '25.09.2026'
  };
  Object.keys(s).forEach(k => $(k).value = s[k]);
  render();
});
render();
