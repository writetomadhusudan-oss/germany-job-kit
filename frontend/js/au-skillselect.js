/* SkillSelect points calculator — simplified. Based on the Department of Home Affairs
   points test (subclass 189/190/491). A 2026 reform was proposed but not enacted as
   of Sept 2026 — this uses the current table. Client-side only. */
const $ = (id) => document.getElementById(id);

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function agePts(age) {
  if (age < 18 || age >= 45) return 0;
  if (age <= 24) return 25;
  if (age <= 32) return 30;
  if (age <= 39) return 25;
  return 15; // 40–44
}

function calc() {
  const age = Number($('ss_age').value) || 30;
  const parts = [];

  const aAge = agePts(age); parts.push(['Age', aAge]);
  const aEng = Number($('ss_english').value); parts.push(['English language', aEng]);

  const ov = Number($('ss_overseas').value);
  const au = Number($('ss_ausexp').value);
  const emp = Math.min(20, ov + au);
  parts.push(['Skilled employment (capped at 20)', emp]);

  const aQual = Number($('ss_qual').value); parts.push(['Qualifications', aQual]);

  const extras = [
    ['ss_ausstudy', 'Australian study requirement'],
    ['ss_regional', 'Regional study'],
    ['ss_proyear', 'Professional Year'],
    ['ss_naati', 'Credentialled community language (NAATI)']
  ];
  extras.forEach(x => {
    if ($(x[0]).checked) parts.push([x[1], 5]);
  });
  if ($('ss_spec').checked) parts.push(['Specialist education (STEM/ICT research degree)', 10]);

  const aPartner = Number($('ss_partner').value); parts.push(['Partner', aPartner]);
  const aNom = Number($('ss_nom').value);
  if (aNom) parts.push(['State/territory nomination', aNom]);

  const total = parts.reduce((s, p) => s + p[1], 0);

  let verdict, cls;
  if (age >= 45) {
    verdict = 'You are not eligible for the points test at 45 or over — the General Skilled Migration program requires you to be under 45 at invitation. Look instead at employer-sponsored routes (e.g. Skills in Demand visa) or the subclass 186 employer nomination scheme.';
    cls = 'warn';
  } else if (total >= 65) {
    verdict = 'You meet the 65-point minimum and can lodge an Expression of Interest. But invitations are competitive: for ICT and engineering occupations recent rounds invited at ~85–95+ points (4 June 2026 round). Boosting your score before or after lodging — better English (superior = 20), a NAATI credential, partner points, or state nomination (190/491) — is the highest-leverage move.';
    cls = 'ok';
  } else {
    verdict = 'Below the 65-point threshold — you cannot lodge an EOI yet. Highest-leverage moves: lift English to proficient or superior (+10/+20), get a NAATI credential (+5), complete a Professional Year if you studied in Australia (+5), or consider state nomination (190: +5, 491: +15).';
    cls = 'warn';
  }

  let h = '<div class="card ' + cls + '"><h2>Your estimated points: ' + total + '</h2><p>' + verdict + '</p>';
  h += '<table style="width:100%;margin-top:12px;border-collapse:collapse">';
  parts.forEach(p => { h += '<tr style="border-top:1px solid var(--line)"><td style="padding:6px 0">' + esc(p[0]) + '</td><td style="text-align:right;font-weight:700">' + p[1] + '</td></tr>'; });
  h += '</table></div>';
  h += '<p class="muted small">Simplified estimate based on the Home Affairs points test — the official calculator at immi.homeaffairs.gov.au is authoritative. Assumes a positive skills assessment and a valid English test. A 2026 points-test reform has been proposed but not enacted as of September 2026. Not legal advice.</p>';
  $('result').innerHTML = h;
  $('result').scrollIntoView({behavior: 'smooth', block: 'start'});
}

$('calcBtn').addEventListener('click', calc);
