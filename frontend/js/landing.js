/* Landing buy flow — region-aware pricing. One bundle, local currency per region. */
const PRICES = {
  EUR: { label: '€5.99', name: 'Europe' },
  GBP: { label: '£4.99', name: 'United Kingdom' },
  CAD: { label: 'CAD 7.99', name: 'Canada' },
  AUD: { label: 'AUD 8.99', name: 'Australia' },
  INR: { label: '₹499', name: 'India' }
};
let currency = 'EUR';
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
  const btn = document.getElementById('buyBtn');
  if (btn && !btn.disabled) btn.textContent = 'Buy now — ' + p.label;
  document.querySelectorAll('.region-btn').forEach(b => b.classList.toggle('active', b.dataset.cur === currency));
  try { localStorage.setItem('gjk_currency', currency); } catch (e) {}
}

async function buy() {
  const btn = document.getElementById('buyBtn');
  const err = document.getElementById('buyError');
  err.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Opening secure checkout…';
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currency })
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
