document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('http://localhost:3000/api/extension/session');
    if (res.ok) {
      const data = await res.json();
      if (data.authenticated) {
        const available = (Number(data.wallet.availablePaise) / 100).toFixed(2);
        const pending = (Number(data.wallet.pendingPaise) / 100).toFixed(2);
        document.getElementById('balance').textContent = `₹${available}`;
        document.getElementById('pending').textContent = `Pending Hold: ₹${pending}`;
        document.getElementById('user-info').textContent = `${data.user.name} · ${data.user.kycTier}`;
      }
    }
  } catch (err) {
    console.log('Running in standalone preview mode.');
  }
});
