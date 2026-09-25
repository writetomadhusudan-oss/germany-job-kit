/* Chancenkarte (Opportunity Card) points calculator — 2026 rules.
   Pure functions at the bottom are unit-testable with node. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const GERMAN_PTS = { none: 0, A1: 0, A2: 1, B1: 2, B2: 3 };

  // d: {qual, german, english, funds, recog, shortage, exp, age, lived, partner}
  function evaluate(d) {
    const gates = [];
    if (d.qual === 'none') gates.push('You need a recognized qualification: a university degree, 2+ years of vocational training, or (for IT) 3+ years of professional experience.');
    const langOk = d.german !== 'none' || d.english === 'B2' || d.english === 'C1';
    if (!langOk) gates.push('Language minimum not met: you need German at A1 level or English at B2 level (with certificate).');
    if (d.funds !== 'yes') gates.push('You must prove self-sufficiency — about €13,092 for 12 months in a blocked account (Sperrkonto), or a sponsor declaration.');

    if (d.recog === 'full') {
      return { route: 'direct', gates, pts: null, parts: [],
        note: 'Your qualification is fully recognized in Germany — you qualify for the Chancenkarte directly via the skilled-worker route, no points needed.' };
    }
    let pts = 0;
    const parts = [];
    const add = (label, p) => { if (p > 0) { pts += p; parts.push({ label, p }); } };
    if (d.recog === 'partial') add('Partial recognition in Germany', 4);
    if (d.shortage === 'yes') add('Shortage occupation', 1);
    if (d.exp === '2to4') add('2–4 years experience (last 5 yrs)', 2);
    else if (d.exp === '5plus') add('5+ years experience (last 7 yrs)', 3);
    add('German ' + d.german, GERMAN_PTS[d.german] || 0);
    if (d.english === 'C1') add('English C1 or higher', 1);
    if (d.age === 'u35') add('Under 35', 2);
    else if (d.age === '35to40') add('Age 35–40', 1);
    if (d.lived === 'yes') add('Previous stay in Germany (6+ months)', 1);
    if (d.partner === 'yes') add('Eligible spouse/partner', 1);

    const eligible = pts >= 6;
    const suggestions = [];
    if (!eligible) {
      const gap = 6 - pts;
      const cands = [];
      if (d.recog === 'none') cands.push({ label: 'Get a Statement of Comparability (partial recognition via ZAB)', p: 4 });
      const gNow = GERMAN_PTS[d.german] || 0;
      if (gNow < 3) cands.push({ label: 'Improve German to B2' + (d.german === 'none' || d.german === 'A1' ? ' (A1 also meets the language minimum)' : ''), p: 3 - gNow });
      if (d.english !== 'C1') cands.push({ label: 'Get an English C1 certificate', p: 1 });
      if (d.exp === 'lt2') cands.push({ label: 'Reach 2 years of relevant experience', p: 2 });
      else if (d.exp === '2to4') cands.push({ label: 'Reach 5 years of relevant experience', p: 1 });
      cands.sort((a, b) => b.p - a.p);
      let acc = 0;
      for (const c of cands) {
        if (acc >= gap) break;
        suggestions.push(c); acc += c.p;
      }
    }
    return { route: 'points', gates, pts, parts, eligible, suggestions };
  }

  function render() {
    const d = {
      qual: $('q_qual').value, german: $('q_german').value, english: $('q_english').value,
      funds: $('q_funds').value, recog: $('p_recog').value, shortage: $('p_shortage').value,
      exp: $('p_exp').value, age: $('p_age').value, lived: $('p_lived').value,
      partner: $('p_partner').value
    };
    const r = evaluate(d);
    let h = '';
    if (r.gates.length) {
      h += '<div class="result bad"><span class="badge bad">Blocked</span><h3>Basic requirements not met</h3><ul>' +
        r.gates.map(g => '<li>' + g + '</li>').join('') + '</ul></div>';
    }
    if (r.route === 'direct') {
      h += '<div class="result good"><span class="badge good">Eligible</span><h3>Direct route — no points needed</h3><p>' + r.note + '</p></div>';
    } else {
      const cls = r.eligible ? 'good' : 'warn';
      const badge = r.eligible ? '<span class="badge good">Eligible</span>' : '<span class="badge warn">Not yet</span>';
      h += '<div class="result ' + cls + '">' + badge +
        '<h3>Your points: ' + r.pts + ' / 6 needed</h3>';
      if (r.parts.length) h += '<ul>' + r.parts.map(p => '<li>' + p.label + ' — <strong>+' + p.p + '</strong></li>').join('') + '</ul>';
      else h += '<p class="muted">No points from the current answers.</p>';
      if (r.eligible) {
        h += '<p>You meet the 6-point threshold. During the 12-month stay you may work up to 20 hours/week in any job while you search.</p>';
      } else if (r.suggestions.length) {
        h += '<h4>Fastest way to reach 6 points:</h4><ol>' +
          r.suggestions.map(s => '<li>' + s.label + ' <strong>(+' + s.p + ')</strong></li>').join('') + '</ol>';
      }
      h += '</div>';
    }
    $('result').innerHTML = h;
  }

  document.querySelectorAll('select').forEach(el => el.addEventListener('change', render));
  render();

  // node test hook
  if (typeof module !== 'undefined' && module.exports) module.exports = { evaluate };
})();
