/* UK cover letter generator — UK business letter format. Client-side only. */
const $ = (id) => document.getElementById(id);
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}
function val(id) { return $(id).value.trim(); }

function render() {
  const name = val('c_name') || 'Your Name';
  const named = !!val('c_contact');
  const header = [name, val('c_addr'), val('c_phone'), [val('c_email'), val('c_linkedin')].filter(Boolean).join(' | ')]
    .filter(Boolean).join('<br>');
  const role = val('c_role') || '[Position]';
  const sal = named ? 'Dear ' + esc(val('c_contact')) + ',' : 'Dear Sir or Madam,';
  const close = named ? 'Yours sincerely,' : 'Yours faithfully,';

  const strengths = val('c_strengths').split('\n').map(s => s.trim()).filter(Boolean);
  const p = [];
  p.push('I am writing to apply for the position of <strong>' + esc(role) + '</strong>' +
    (val('c_company') ? ' at <strong>' + esc(val('c_company')) + '</strong>' : '') +
    (val('c_source') ? ', as advertised on ' + esc(val('c_source')) : '') + '.');
  if (val('c_open')) p.push(esc(val('c_open')));
  if (strengths.length) p.push('What I would bring to your team:<br>• ' + strengths.map(esc).join('<br>• '));
  if (val('c_auth')) p.push(esc(val('c_auth')) + ' and available to start at short notice.');
  p.push('I would welcome the opportunity to discuss how my experience could contribute to your team. Thank you for your time and consideration.');

  const h =
    '<div style="text-align:right;margin-bottom:24px">' + header + '</div>' +
    '<p>' + esc(val('c_date')) + '</p>' +
    (named || val('c_company') || val('c_caddr')
      ? '<p>' + [val('c_contact'), val('c_company'), val('c_caddr')].filter(Boolean).map(esc).join('<br>') + '</p>' : '') +
    '<p>' + sal + '</p>' +
    p.map(x => '<p>' + x + '</p>').join('') +
    '<div class="close"><p>' + close + '</p><br><p>' + esc(name) + '</p></div>';
  $('letterPreview').innerHTML = h;
}

document.querySelectorAll('input,textarea').forEach(el => el.addEventListener('input', render));

$('fillSample').addEventListener('click', () => {
  const s = {
    c_name: 'Priya Sharma', c_addr: '12 Baker Street, London NW1 6XE', c_phone: '+44 7700 900123',
    c_email: 'priya.sharma@example.com', c_linkedin: 'linkedin.com/in/priyasharma',
    c_contact: 'Ms Lee', c_company: 'Example Corp', c_caddr: '1 Poultry, London EC2R 8EJ',
    c_role: 'SAP SuccessFactors Consultant', c_source: 'LinkedIn on 20 September 2026',
    c_open: 'Your team\u2019s focus on cloud HR transformation for mid-sized manufacturers matches exactly what I have done for the past eight years, and I am excited by the chance to bring that experience to the UK market.',
    c_strengths: '8 years SAP SuccessFactors Employee Central & Recruiting\nLed 5 full-cycle implementations (50\u20135,000 employees)\nStrong client-facing workshop facilitation',
    c_auth: 'Eligible for UK Skilled Worker sponsorship',
    c_date: '25 September 2026'
  };
  Object.keys(s).forEach(k => $(k).value = s[k]);
  render();
});
render();
