/* Landing buy flow — region-aware pricing. One bundle, local currency per region. */
const PRICES = {
  EUR: { label: '€5.99', name: 'Europe', value: 5.99 },
  GBP: { label: '£4.99', name: 'United Kingdom', value: 4.99 },
  CAD: { label: 'CAD 7.99', name: 'Canada', value: 7.99 },
  AUD: { label: 'AUD 8.99', name: 'Australia', value: 8.99 },
  INR: { label: '₹499', name: 'India', value: 499 }
};
/* Default region: INR — virtually all traffic (ads + organic) is India.
   Visitors can switch region with the buttons; the choice is remembered. */
let currency = 'INR';
try {
  const saved = localStorage.getItem('gjk_currency');
  if (saved && PRICES[saved]) currency = saved;
} catch (e) {}

function refreshPrice() {
  const p = PRICES[currency];
  document.querySelectorAll('.price-tag').forEach(el => {
    el.innerHTML = p.label + ' one-time · lifetime access';
  });
  const big = document.querySelector('.price-big');
  if (big) big.innerHTML = p.label + ' <small>one-time</small>';
  // Honest tax note: Dodo adds 18% GST for India at checkout (₹499 + ₹89.82).
  // Other regions' tax handling is unverified, so only INR gets the note.
  const taxNote = document.getElementById('taxNote');
  if (taxNote) taxNote.textContent = currency === 'INR' ? '+ GST' : '';
  const btn = document.getElementById('buyBtn');
  if (btn && !btn.disabled) btn.textContent = 'Buy now — ' + p.label;
  document.querySelectorAll('.region-btn').forEach(b => b.classList.toggle('active', b.dataset.cur === currency));
  try { localStorage.setItem('gjk_currency', currency); } catch (e) {}
}

async function buy() {
  const btn = document.getElementById('buyBtn');
  const err = document.getElementById('buyError');
  const emailInput = document.getElementById('buyEmail');
  err.textContent = '';
  const email = (emailInput.value || '').trim().toLowerCase();
  // Email is optional: it only pre-fills the Dodo checkout. If the visitor
  // typed something, it must be a valid address; if blank, we proceed
  // without it rather than blocking the purchase.
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    err.textContent = 'That email doesn\u2019t look right \u2014 fix it, or leave it blank to continue.';
    emailInput.focus();
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Opening secure checkout…';
  // Meta Pixel: every Buy click = InitiateCheckout. Lets us retarget people
  // who reached the payment step but didn't finish. Guarded: no-op until a
  // real Pixel ID is set in index.html.
  try { if (window.fbq) fbq('track', 'InitiateCheckout', { value: (PRICES[currency] || {}).value || 0, currency: currency }); } catch (e) {}
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currency, email })
    });
    const data = await res.json();
    if (!res.ok || !data.url) {
      throw new Error(data.error || 'Checkout could not be started.');
    }
    window.location.href = data.url;
  } catch (e) {
    err.textContent = e.message;
    btn.disabled = false;
    refreshPrice();
  }
}

document.getElementById('buyBtn').addEventListener('click', buy);
document.querySelectorAll('.region-btn').forEach(b => b.addEventListener('click', () => {
  currency = b.dataset.cur;
  refreshPrice();
}));
refreshPrice();
