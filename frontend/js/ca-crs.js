/* Express Entry CRS calculator — simplified. Based on IRCC CRS criteria (canada.ca).
   Job-offer points removed March 2025 — not counted. Client-side only. */
const $ = (id) => document.getElementById(id);

const AGE_S = {18:99,19:105,30:105,31:99,32:94,33:88,34:83,35:77,36:72,37:66,38:61,39:55,40:50,41:39,42:28,43:17,44:6};
const AGE_M = {18:90,19:95,30:95,31:90,32:85,33:80,34:75,35:70,36:65,37:60,38:55,39:50,40:45,41:35,42:25,43:15,44:5};
function agePts(age, spouse) {
  if (age >= 20 && age <= 29) return spouse ? 100 : 110;
  if (age >= 45 || age < 17) return 0;
  const t = spouse ? AGE_M : AGE_S;
  return t[age] || 0;
}
const EDU_S = {secondary:30, yr1:90, yr2:98, bachelor:120, twoplus:128, master:135, phd:150};
const EDU_M = {secondary:28, yr1:84, yr2:91, bachelor:112, twoplus:119, master:126, phd:140};
const LANG_S = {4:0,5:0,6:9,7:17,8:23,9:31,10:34};
const LANG_M = {4:0,5:0,6:8,7:16,8:22,9:29,10:32};
const CAN_S = {'0':0,'1':40,'2':53,'3':64,'4':72,'5':80};
const CAN_M = {'0':0,'1':35,'2':46,'3':56,'4':63,'5':70};

function calc() {
  const spouse = $('crs_marital').value === 'spouse';
  const age = Number($('crs_age').value) || 30;
  const edu = $('crs_edu').value;
  const clbs = Array.from(document.querySelectorAll('.crs_clb')).map(s => Number(s.value));
  const minClb = Math.min.apply(null, clbs);
  const all9 = clbs.every(c => c >= 9);
  const canExp = $('crs_canexp').value;
  const forExp = $('crs_forexp').value;

  const parts = [];
  // A. Core
  const aAge = agePts(age, spouse); parts.push(['Age', aAge]);
  const aEdu = (spouse ? EDU_M : EDU_S)[edu]; parts.push(['Education', aEdu]);
  const lt = spouse ? LANG_M : LANG_S;
  const aLang = clbs.reduce((s, c) => s + lt[c], 0); parts.push(['First language', aLang]);
  const aCan = (spouse ? CAN_M : CAN_S)[canExp]; parts.push(['Canadian work experience', aCan]);
  if ($('crs_lang2').checked) parts.push(['Second official language', spouse ? 22 : 24]);

  // B. Spouse factors
  if (spouse) {
    const sp = Number($('crs_spedu').value) + Number($('crs_splang').value) + Number($('crs_spexp').value);
    parts.push(['Spouse factors', Math.min(40, sp)]);
  }

  // C. Skill transferability (simplified, cap 100)
  let trans = 0;
  const hiEdu = ['twoplus','master','phd'].includes(edu);
  // education + language
  if (all9 && (hiEdu || edu === 'bachelor')) trans += 50;
  else if (minClb >= 7 && (hiEdu || edu === 'bachelor')) trans += 25;
  // foreign work experience + language
  let fw = 0;
  if (forExp === '3') fw = all9 ? 50 : (minClb >= 7 ? 25 : 0);
  else if (forExp === '1') fw = all9 ? 25 : (minClb >= 7 ? 13 : 0);
  // foreign work + Canadian experience
  let fwc = 0;
  if (forExp === '3') fwc = Number(canExp) >= 2 ? 50 : (Number(canExp) >= 1 ? 25 : 0);
  else if (forExp === '1') fwc = Number(canExp) >= 2 ? 25 : (Number(canExp) >= 1 ? 13 : 0);
  trans += Math.max(fw, fwc);
  trans = Math.min(100, trans);
  if (trans) parts.push(['Skill transferability (simplified)', trans]);

  // D. Additional
  let add = 0; const addParts = [];
  if ($('crs_pnp').checked) { add += 600; addParts.push('PNP +600'); }
  if ($('crs_french').checked) {
    const enOk = clbs.every(c => c >= 5);
    const f = enOk ? 50 : 25; add += f; addParts.push('French +' + f);
  }
  if ($('crs_sibling').checked) { add += 15; addParts.push('Sibling +15'); }
  const ce = Number($('crs_canedu').value); if (ce) { add += ce; addParts.push('Canadian credential +' + ce); }
  if (add) parts.push(['Additional (' + addParts.join(', ') + ')', add]);

  const total = parts.reduce((s, p) => s + p[1], 0);

  let verdict, cls;
  if (total >= 520) { verdict = 'Strong — around recent Canadian Experience Class cutoffs. Keep your profile in the pool and watch for category-based draws too.'; cls = 'ok'; }
  else if (total >= 400) { verdict = 'Competitive for French-proficiency or occupation draws (~380–400) — and close to CEC range. Improving language to CLB 9+ is the highest-leverage move.'; cls = 'ok'; }
  else if ($('crs_pnp').checked) { verdict = 'With a provincial nomination (600 pts) you are virtually guaranteed an invitation in a PNP draw.'; cls = 'ok'; }
  else { verdict = 'Below recent cutoffs. Highest-leverage moves: language to CLB 9+, a provincial nomination, or French at NCLC 7+.'; cls = 'warn'; }

  let h = '<div class="card ' + cls + '"><h2>Your estimated CRS score: ' + total + ' / 1200</h2><p>' + verdict + '</p>';
  h += '<table style="width:100%;margin-top:12px;border-collapse:collapse">';
  parts.forEach(p => { h += '<tr style="border-top:1px solid var(--line)"><td style="padding:6px 0">' + p[0] + '</td><td style="text-align:right;font-weight:700">' + p[1] + '</td></tr>'; });
  h += '</table></div>';
  h += '<p class="muted small">Simplified estimate based on IRCC CRS criteria — the official tool at canada.ca is authoritative. Assumes foreign credentials have a valid ECA. Not legal advice.</p>';
  $('result').innerHTML = h;
  $('result').scrollIntoView({behavior: 'smooth', block: 'start'});
}

$('crs_marital').addEventListener('change', () => {
  $('spouseCard').style.display = $('crs_marital').value === 'spouse' ? 'block' : 'none';
});
$('calcBtn').addEventListener('click', calc);
