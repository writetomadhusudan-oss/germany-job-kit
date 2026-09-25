/* EU Blue Card eligibility checker — 2026 thresholds.
   Pure function check() is unit-testable with node. */
(function () {
  'use strict';
  const STD = 50700;      // 2026 standard threshold (€/year gross)
  const REDUCED = 45934.20; // 2026 shortage / IT / recent-graduate threshold

  // d: {salary, degree, itexp, shortage, grad} — salary is a number (€/year)
  function check(d) {
    const salary = Number(d.salary) || 0;
    const qualified = d.degree === 'yes' || d.itexp === 'yes';
    if (!qualified) {
      return { eligible: false, reason: 'qualification',
        message: 'The Blue Card needs either a recognized university degree, or — for IT roles — 3+ years of professional IT experience in the last 7 years. Without either, look at the Chancenkarte or the skilled-worker permit instead.' };
    }
    const reduced = d.shortage === 'yes' || d.grad === 'yes' || d.itexp === 'yes';
    const threshold = reduced ? REDUCED : STD;
    if (salary >= threshold) {
      return { eligible: true, threshold, salary,
        message: 'Your offer meets the 2026 ' + (reduced ? 'reduced' : 'standard') +
          ' threshold of €' + threshold.toLocaleString('en-IE', { minimumFractionDigits: 2 }) +
          ' gross/year. You look eligible for the EU Blue Card (job offer of 6+ months still required).' };
    }
    return { eligible: false, reason: 'salary', threshold, salary,
      shortfall: Math.round((threshold - salary) * 100) / 100,
      message: 'Your offer is €' + (Math.round((threshold - salary) * 100) / 100).toLocaleString('en-IE') +
        ' below the 2026 ' + (reduced ? 'reduced' : 'standard') + ' threshold of €' +
        threshold.toLocaleString('en-IE', { minimumFractionDigits: 2 }) + ' gross/year.' };
  }

  function eur(n) {
    return '€' + Number(n).toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function render() {
    const d = {
      salary: document.getElementById('b_salary').value,
      degree: document.getElementById('b_degree').value,
      itexp: document.getElementById('b_itexp').value,
      shortage: document.getElementById('b_shortage').value,
      grad: document.getElementById('b_grad').value
    };
    const r = check(d);
    let h;
    if (r.eligible) {
      h = '<div class="result good"><span class="badge good">Likely eligible</span><p>' + r.message + '</p>' +
        '<p class="muted small">Threshold applied: ' + eur(r.threshold) + ' · Your offer: ' + eur(r.salary) + '</p></div>';
    } else if (r.reason === 'salary') {
      h = '<div class="result warn"><span class="badge warn">Below threshold</span><p>' + r.message + '</p>' +
        '<p>Options: negotiate the fixed salary up (only guaranteed gross counts — bonuses don\'t), or check the <a href="/app/chancenkarte">Chancenkarte</a> route.</p></div>';
    } else {
      h = '<div class="result bad"><span class="badge bad">Not eligible via Blue Card</span><p>' + r.message + '</p></div>';
    }
    document.getElementById('result').innerHTML = h;
  }

  document.getElementById('b_check').addEventListener('click', render);

  if (typeof module !== 'undefined' && module.exports) module.exports = { check, STD, REDUCED };
})();
