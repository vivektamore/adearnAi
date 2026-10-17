document.addEventListener('DOMContentLoaded', async () => {
  const balanceEl = document.getElementById('balance');
  const pendingEl = document.getElementById('pending');
  const userInfoEl = document.getElementById('user-info');

  try {
    const res = await fetch('http://localhost:3000/api/extension/session', {
      credentials: 'include',
    });

    if (res.ok) {
      const data = await res.json();
      if (data.authenticated && data.wallet) {
        const available = (Number(data.wallet.availablePaise) / 100).toFixed(2);
        const pending = (Number(data.wallet.pendingPaise) / 100).toFixed(2);
        balanceEl.textContent = `₹${Number(available).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        pendingEl.textContent = `Pending Hold: ₹${Number(pending).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        userInfoEl.textContent = `${data.user.name} · ${data.user.kycTier}`;
      } else {
        balanceEl.textContent = '₹0.00';
        pendingEl.textContent = 'Please log in to your account';
        userInfoEl.textContent = 'Unauthenticated (Click below to sign in)';
      }
    } else {
      balanceEl.textContent = '₹0.00';
      pendingEl.textContent = 'Session unauthenticated';
      userInfoEl.textContent = 'Please sign in to AdEarn AI';
    }
  } catch (err) {
    balanceEl.textContent = 'Offline';
    pendingEl.textContent = 'Could not connect to AdEarn API';
    userInfoEl.textContent = 'Local service unreachable';
  }
});
