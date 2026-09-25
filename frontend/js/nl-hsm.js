/* Netherlands HSM + EU Blue Card eligibility checker — 2026 IND figures.
   Gross per month, EXCLUDING the 8% holiday allowance. Client-side only.
   General information — not legal advice. */
const $ = (id) => document.getElementById(id);

function eur(n) {
  return '\u20AC' + n.toLocaleString('en-IE').replace(/,/g, '.');
}

function badge(ok) {
  return ok ? '<span class="badge good">PASS</span>' : '<span class="badge bad">NOT MET</span>';
}

function calc() {
  const ageBand = $('hsm_age').value;          // '30plus' | 'under30'
  const recent = $('hsm_recent').value === 'yes';
  const salary = Number($('hsm_salary').value) || 0;
  const contract = $('hsm_contract').value;   // 'long' | 'mid' | 'short'
  const sponsor = $('hsm_sponsor').value === 'yes';
  const degree = $('hsm_degree').value === 'yes';

  // --- HSM threshold selection ---
  let hsmThr, hsmThrLabel;
  if (recent) { hsmThr = 3122; hsmThrLabel = 'reduced criterion — recent graduate (within 3 years)'; }
  else if (ageBand === 'under30') { hsmThr = 4357; hsmThrLabel = 'under 30'; }
  else { hsmThr = 5942; hsmThrLabel = '30 or older'; }

  // --- EU Blue Card threshold selection ---
  let bcThr, bcThrLabel;
  if (recent) { bcThr = 4754; bcThrLabel = 'reduced — degree within last 3 years'; }
  else { bcThr = 5942; bcThrLabel = 'standard'; }

  const hsmSalaryOk = salary >= hsmThr;
  const bcSalaryOk = salary >= bcThr;
  const contractOk = contract !== 'short';

  let h = '<div class="card"><h2>Your results — 2026 IND thresholds</h2>';

  // HSM verdict
  h += '<h3>' + badge(hsmSalaryOk && sponsor) + ' Highly Skilled Migrant</h3>';
  h += '<p>Applicable threshold: <strong>' + eur(hsmThr) + '/month</strong> gross (excl. 8% holiday allowance) — ' + hsmThrLabel + '.</p>';
  if (salary) h += '<p>Offered salary: <strong>' + eur(salary) + '/month</strong> — ' +
    (hsmSalaryOk ? 'at or above the threshold.' : '<strong>below</strong> the threshold by ' + eur(hsmThr - salary) + '/month.') + '</p>';
  else h += '<p class="muted">Enter your salary to see the gap to the threshold.</p>';
  if (!sponsor) h += '<p>⚠️ The HSM route requires an <strong>IND-recognised sponsor (erkend referent)</strong> — the employer must be registered and files the application for you (fee €423 in 2026, ~2-week IND target). <a href="https://ind.nl/en/required-amounts-income-requirements" target="_blank" rel="noopener">Check the IND public register</a> or ask the employer directly.</p>';
  else h += '<p>✓ Employer is a recognised sponsor. The employer files the HSM application for you (fee €423 in 2026, ~2-week IND decision target).</p>';
  if (hsmSalaryOk && sponsor) h += '<p><strong>Outcome:</strong> you meet the HSM salary criterion — the employer can file your application.</p>';

  // Blue Card verdict
  const bcPass = bcSalaryOk && contractOk && degree;
  h += '<h3 style="margin-top:20px">' + badge(bcPass) + ' EU Blue Card</h3>';
  h += '<p>Applicable threshold: <strong>' + eur(bcThr) + '/month</strong> gross (excl. 8% holiday allowance) — ' + bcThrLabel + '.</p>';
  if (salary) h += '<p>Offered salary: <strong>' + eur(salary) + '/month</strong> — ' +
    (bcSalaryOk ? 'at or above the threshold.' : '<strong>below</strong> the threshold by ' + eur(bcThr - salary) + '/month.') + '</p>';
  if (!contractOk) h += '<p>⚠️ The Blue Card requires a contract of <strong>at least 6 months</strong>.</p>';
  if (!degree) h += '<p>⚠️ The Blue Card requires a <strong>recognised higher-education degree</strong> (or qualifying professional experience).</p>';
  if (bcPass) h += '<p><strong>Outcome:</strong> you meet the Blue Card criteria. No recognised sponsor needed — and after <strong>12 months</strong> on a Dutch Blue Card you gain intra-EU mobility to move to another EU country more easily.</p>';

  h += '<p class="muted small" style="margin-top:16px">The threshold in force is the one on your <strong>application date</strong> — thresholds update every January. These figures are effective 1 January 2026. General information only — not legal advice; re-verify at <a href="https://ind.nl/en/required-amounts-income-requirements" target="_blank" rel="noopener">ind.nl</a>.</p>';
  h += '</div>';

  $('result').innerHTML = h;
  $('result').scrollIntoView({behavior: 'smooth', block: 'start'});
}

$('calcBtn').addEventListener('click', calc);
