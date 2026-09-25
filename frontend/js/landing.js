async function buy() {
  const btn = document.getElementById('buyBtn');
  const err = document.getElementById('buyError');
  err.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Opening secure checkout…';
  try {
    const res = await fetch('/api/checkout', { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.url) {
      throw new Error(data.error || 'Checkout could not be started.');
    }
    window.location.href = data.url;
  } catch (e) {
    err.textContent = e.message;
    btn.disabled = false;
    btn.textContent = 'Buy now — €5.99';
  }
}
document.getElementById('buyBtn').addEventListener('click', buy);
