/* Passeport Talent / EU Blue Card France checker — 2026 official thresholds. Client-side only. */
const $ = (id) => document.getElementById(id);
const PT = 39582;   // Passeport Talent salarié qualifié — fixed by arrêté 29/08/2025
const BC = 59373;   // EU Blue Card France = 1.5 × reference salary

function eur(n) { return '€' + Number(n).toLocaleString('en-IE'); }

function verdict(ok, title, detail) {
  const cls = ok ? 'ok' : 'warn';
  const icon = ok ? '✅' : '⚠️';
  return '<div class="card ' + cls + '" style="margin-bottom:12px"><h3>' + icon + ' ' + title + '</h3><p>' + detail + '</p></div>';
}

$('calcBtn').addEventListener('click', () => {
  const salary = Number($('p_salary').value) || 0;
  const diploma = $('p_diploma').value;
  const exp = Number($('p_exp').value) || 0;
  const contract = Number($('p_contract').value) || 0;
  const employer = $('p_employer').value;
  const shortage = $('p_shortage').checked;

  let h = '';
  // 1. Passeport Talent — salarié qualifié
  {
    const okSal = salary >= PT, okDip = diploma === 'fr_master', okCon = contract > 3;
    const ok = okSal && okDip && okCon;
    let d = 'Salary ' + eur(salary) + ' vs required ' + eur(PT) + ' — ' + (okSal ? 'met' : 'NOT met') + '. ';
    d += 'French master-level diploma — ' + (okDip ? 'yes' : 'no (required: diploma obtained in France at master level)') + '. ';
    d += 'Contract > 3 months — ' + (okCon ? 'yes' : 'no') + '.';
    h += verdict(ok, 'Passeport Talent — « salarié qualifié »', d);
  }
  // 2. Passeport Talent — entreprise innovante / salarié en mission
  {
    const okSal = salary >= PT, okCon = contract > 3;
    const okEmp = employer === 'innovative' || employer === 'intragroup';
    const ok = okSal && okCon && okEmp;
    const label = employer === 'innovative' ? '« entreprise innovante »' : employer === 'intragroup' ? '« salarié en mission »' : '« entreprise innovante / salarié en mission »';
    let d = 'Salary ' + eur(salary) + ' vs required ' + eur(PT) + ' — ' + (okSal ? 'met' : 'NOT met') + '. ';
    d += 'Employer path — ' + (okEmp ? (employer === 'innovative' ? 'innovative company: yes' : 'intra-group mobility: yes') : 'this route needs an innovative employer or intra-group transfer') + '. ';
    d += 'Contract > 3 months — ' + (okCon ? 'yes' : 'no') + '.';
    h += verdict(ok, 'Passeport Talent — ' + label, d);
  }
  // 3. EU Blue Card France
  {
    const okSal = salary >= BC, okCon = contract >= 6;
    const okDip = diploma === 'fr_master' || diploma === 'foreign_master' || diploma === 'bachelor';
    const okExp = exp >= 5 || (shortage && exp >= 3);
    const okQual = okDip || okExp;
    const ok = okSal && okCon && okQual;
    let d = 'Salary ' + eur(salary) + ' vs required ' + eur(BC) + ' — ' + (okSal ? 'met' : 'NOT met') + '. ';
    d += 'Qualification — ' + (okQual ? 'met (3+ year diploma' + (okDip ? '' : ' via ' + exp + ' yrs experience') + ')' : 'NOT met (needs 3+ year diploma or 5 yrs experience / 3 yrs for shortage roles)') + '. ';
    d += 'Contract ≥ 6 months — ' + (okCon ? 'yes' : 'no') + '.';
    h += verdict(ok, 'EU Blue Card — « carte bleue européenne »', d);
  }
  h += '<p class="muted small">General information only — not legal advice. Figures: service-public.gouv.fr fiche F16922 (verified June 2026). Always confirm with the French consulate or an immigration adviser before acting.</p>';
  $('result').innerHTML = h;
  $('result').scrollIntoView({behavior: 'smooth', block: 'start'});
});
