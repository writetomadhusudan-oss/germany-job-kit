/* Australia cover letter generator — Australian business letter. Client-side only. */
const $ = (id) => document.getElementById(id);
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}
function val(id) { return $(id).value.trim(); }

function render() {
  const name = val('c_name') || 'Your Name';
  const header = [name, [val('c_city'), val('c_phone')].filter(Boolean).join(' | '),
                  [val('c_email'), val('c_linkedin')].filter(Boolean).join(' | ')].filter(Boolean).join('<br>');
  const role = val('c_role') || '[Position]';
  const sal = val('c_contact') ? 'Dear ' + esc(val('c_contact')) + ',' : 'Dear Hiring Manager,';

  const strengths = val('c_strengths').split('\n').map(s => s.trim()).filter(Boolean);
  const p = [];
  p.push('I am writing to apply for the position of <strong>' + esc(role) + '</strong>' +
    (val('c_company') ? ' at <strong>' + esc(val('c_company')) + '</strong>' : '') +
    (val('c_source') ? ', as advertised on ' + esc(val('c_source')) : '') + '.');
  if (val('c_open')) p.push(esc(val('c_open')));
  if (strengths.length) p.push('What I would bring to your team:<br>• ' + strengths.map(esc).join('<br>• '));
  if (val('c_auth')) p.push(esc(val('c_auth')) + ' and available to start immediately.');
  p.push('I would welcome the opportunity to discuss how my experience can contribute to your team. Thank you for your time and consideration.');

  const h =
    '<div style="text-align:center;margin-bottom:24px">' + header + '</div>' +
    '<p>' + esc(val('c_date')) + '</p>' +
    (val('c_contact') || val('c_company') || val('c_ccity')
      ? '<p>' + [val('c_contact'), val('c_company'), val('c_ccity')].filter(Boolean).map(esc).join('<br>') + '</p>' : '') +
    '<p><strong>Re: Application for ' + esc(role) + '</strong></p>' +
    '<p>' + sal + '</p>' +
    p.map(x => '<p>' + x + '</p>').join('') +
    '<div class="close"><p>Kind regards,</p><br><p>' + esc(name) + '</p></div>';
  $('letterPreview').innerHTML = h;
}

document.querySelectorAll('input,textarea').forEach(el => el.addEventListener('input', render));

$('fillSample').addEventListener('click', () => {
  const s = {
    c_name: 'Priya Sharma', c_city: 'Sydney, NSW', c_phone: '+61 412 345 678',
    c_email: 'priya.sharma@example.com', c_linkedin: 'linkedin.com/in/priyasharma',
    c_contact: 'Ms. Lee', c_company: 'Example Pty Ltd', c_ccity: 'Sydney, NSW',
    c_role: 'SAP SuccessFactors Consultant', c_source: 'Seek on 20 September 2026',
    c_open: 'Your team\u2019s focus on cloud HR transformation for mid-size manufacturers matches exactly what I have done for the past eight years, and I am excited by the chance to bring that experience to the Australian market.',
    c_strengths: '8 years SAP SuccessFactors Employee Central & Recruiting\nLed 5 full-cycle implementations (50\u20135,000 employees)\nStrong client-facing workshop facilitation in English',
    c_auth: 'Full Australian work rights',
    c_date: '25 September 2026'
  };
  Object.keys(s).forEach(k => $(k).value = s[k]);
  render();
});
render();
