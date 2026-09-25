/* UK Skilled Worker salary checker — rules in force since 22 July 2025 (GOV.UK).
   Simplified: salary/skill/English tests only. Not legal advice. Client-side only. */
const $ = (id) => document.getElementById(id);

const STD = 41700;        // standard salary threshold
const FLOOR = 33400;      // discounted floor
const FLOOR_PHDB = 37500; // non-STEM PhD floor
const HOURLY = 17.13;     // hourly floor

const gbp = (n) => '£' + Math.round(n).toLocaleString('en-GB');

function check() {
  const salary = Number($('sw_salary').value) || 0;
  const hours = Number($('sw_hours').value) || 37.5;
  const going = Number($('sw_going').value) || 0;
  const rqf6 = $('sw_rqf6').value === 'yes';
  const newEntrant = $('sw_newentrant').value === 'yes';
  const phd = $('sw_phd').value;
  const isl = $('sw_isl').value === 'yes';

  const rows = [];   // [label, passed, detail]
  let eligible = true;

  if (!salary || !going) {
    $('result').innerHTML = '<div class="card warn"><h3>Enter a salary and a going rate</h3><p>The checker needs the offered annual salary and the occupation\u2019s going rate from the official table at <a href="https://www.gov.uk/skilled-worker-visa/your-job" target="_blank" rel="noopener">gov.uk/skilled-worker-visa/your-job</a>.</p></div>';
    return;
  }

  // 1. Skill level
  rows.push(['Skill level — job must be RQF 6 (degree level) or above since 22 July 2025', rqf6,
    rqf6 ? 'Job meets the skill requirement.' : 'FAIL: jobs below RQF 6 cannot be sponsored under the Skilled Worker route since 22 July 2025.']);
  if (!rqf6) eligible = false;

  // 2. Hourly floor
  const hourly = salary / (hours * 52);
  const hourlyOk = hourly >= HOURLY;
  rows.push(['Hourly floor — at least £17.13/hr on guaranteed basic gross pay', hourlyOk,
    'Your offer works out to £' + hourly.toFixed(2) + '/hr over ' + hours + ' hrs/week. ' +
    (hourlyOk ? 'Meets the hourly floor.' : 'FAIL: below the £17.13/hr floor. Note: bonuses, equity and overtime do not count.')]);
  if (!hourlyOk) eligible = false;

  // 3. Salary routes
  const routes = [];
  const stdReq = Math.max(STD, going);
  const stdOk = salary >= stdReq;
  routes.push(['Standard route — ' + gbp(stdReq) + ' (' + gbp(STD) + ' or the going rate, whichever is higher)', stdOk]);

  const discounts = [];
  if (newEntrant) {
    const req = Math.max(0.70 * going, FLOOR);
    discounts.push(['New entrant — at least 70% of going rate (' + gbp(req) + ', floor ' + gbp(FLOOR) + '; max 4 years)', salary >= req]);
  }
  if (phd === 'stem') {
    const req = Math.max(0.80 * going, FLOOR);
    discounts.push(['STEM PhD relevant to the job — at least 80% of going rate (' + gbp(req) + ')', salary >= req]);
  }
  if (phd === 'nonstem') {
    const req = Math.max(0.90 * going, FLOOR_PHDB);
    discounts.push(['Non-STEM PhD relevant to the job — at least 90% of going rate (' + gbp(req) + ', floor ' + gbp(FLOOR_PHDB) + ')', salary >= req]);
  }
  if (isl) {
    const req = Math.max(going, FLOOR);
    discounts.push(['Immigration Salary List job — full going rate (' + gbp(req) + ', floor ' + gbp(FLOOR) + ')', salary >= req]);
  }
  const discountOk = discounts.some(d => d[1]);
  const salaryOk = stdOk || discountOk;
  const salaryDetail = stdOk
    ? 'Passes on the standard route — no discount needed.'
    : (discountOk ? 'Passes via a discount route (see below).' : 'Below every applicable threshold.');
  rows.push(['Salary test', salaryOk, salaryDetail]);
  if (!salaryOk) eligible = false;

  // Verdict
  let verdict, cls;
  if (eligible) {
    const via = [];
    if (stdOk) via.push('standard route');
    discounts.filter(d => d[1]).forEach(d => via.push(d[0].split(' — ')[0].toLowerCase()));
    verdict = 'Likely meets the salary and skill rules — via the ' + via.join(' + ') + '.';
    if (newEntrant && !stdOk) verdict += ' Remember the new-entrant discount lasts a maximum of 4 years; you must reach the standard threshold afterwards.';
    cls = 'ok';
  } else {
    verdict = 'Does NOT meet the Skilled Worker rules as entered. Shortfall on the standard route: ' +
      gbp(Math.max(0, stdReq - salary)) + '.';
    cls = 'warn';
  }

  let h = '<div class="card ' + cls + '"><h2>' + verdict + '</h2><table style="width:100%;margin-top:12px;border-collapse:collapse">';
  rows.forEach(r => {
    h += '<tr style="border-top:1px solid var(--line)"><td style="padding:8px 0"><strong>' +
      (r[1] ? '✓ ' : '✗ ') + r[0] + '</strong><br><span class="muted small">' + r[2] + '</span></td></tr>';
  });
  discounts.forEach(d => {
    h += '<tr style="border-top:1px solid var(--line)"><td style="padding:8px 0"><strong>' +
      (d[1] ? '✓ ' : '✗ ') + d[0] + '</strong></td></tr>';
  });
  h += '</table></div>';
  h += '<p class="muted small">Also required: English at B1 (some 2026 sources report B2 from 8 January 2026 — verify on gov.uk), a licensed Home Office sponsor, a genuine role, and maintenance funds unless your sponsor certifies them. IT SOC codes (2134, 2133, 2135) are not on the Immigration Salary List — most IT applicants use the standard route or the new-entrant discount. Simplified checker based on GOV.UK rules in force since 22 July 2025. <strong>Not legal advice</strong> — re-verify at <a href="https://www.gov.uk/skilled-worker-visa" target="_blank" rel="noopener">gov.uk/skilled-worker-visa</a> before acting.</p>';
  $('result').innerHTML = h;
  $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

$('calcBtn').addEventListener('click', check);
