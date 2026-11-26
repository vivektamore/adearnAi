// AdEarn AI — Popup Logic & Viewability Tracker
// Communicates with background service worker for secure, compliant API handling.

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const balanceEl = document.getElementById('balance');
  const pendingHoldEl = document.getElementById('pending-hold');
  const lifetimeEarnedEl = document.getElementById('lifetime-earned');
  const payoutStatusEl = document.getElementById('payout-status');
  const userNameEl = document.getElementById('user-name');
  const userTierEl = document.getElementById('user-tier');
  const linkAuthEl = document.getElementById('link-auth');
  const nodeTextEl = document.getElementById('node-text');
  const adsCountEl = document.getElementById('ads-count');
  const adListEl = document.getElementById('ad-list');
  const linkDashboardEl = document.getElementById('link-dashboard');
  const linkWithdrawEl = document.getElementById('link-withdraw');
  const apiLabelEl = document.getElementById('api-label');
  const toggleConfigEl = document.getElementById('toggle-config');
  const toggleRewardsEl = document.getElementById('toggle-rewards');
  const linkSupportDeskEl = document.getElementById('link-support-desk');

  // Auth elements
  const loginBoxEl = document.getElementById('login-box');
  const authBoxTitleEl = document.getElementById('auth-box-title');
  const authSwitchModeEl = document.getElementById('auth-switch-mode');
  const regNameEl = document.getElementById('reg-name');
  const loginEmailEl = document.getElementById('login-email');
  const loginPassEl = document.getElementById('login-pass');
  const btnLoginSubmitEl = document.getElementById('btn-login-submit');
  const loginErrEl = document.getElementById('login-err');

  // Tab elements
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const historyListEl = document.getElementById('history-list');
  const btnClearHistoryEl = document.getElementById('btn-clear-history');
  const btnSavePrefsEl = document.getElementById('btn-save-prefs');

  let currentApiBase = 'http://localhost:3000';
  let isAuthenticated = false;
  let isRegisterMode = false;
  let optInRewards = true;
  const trackedImpressions = new Set();

  // 1. Tab Switching Logic
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabPanes.forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.getAttribute('data-tab'));
      if (target) target.classList.add('active');

      if (btn.getAttribute('data-tab') === 'tab-history') {
        renderHistory();
      }
    });
  });

  // 2. Load Preferences & Opt-in Rewards status
  chrome.storage.local.get(['adearn_opt_in_rewards', 'adearn_category_prefs'], (result) => {
    if (result.adearn_opt_in_rewards !== undefined) {
      optInRewards = result.adearn_opt_in_rewards;
      toggleRewardsEl.checked = optInRewards;
    }
    if (result.adearn_category_prefs && Array.isArray(result.adearn_category_prefs)) {
      document.querySelectorAll('.cat-pref').forEach((cb) => {
        cb.checked = result.adearn_category_prefs.includes(cb.getAttribute('data-cat'));
      });
    }
  });

  toggleRewardsEl.addEventListener('change', () => {
    optInRewards = toggleRewardsEl.checked;
    chrome.storage.local.set({ adearn_opt_in_rewards: optInRewards });
  });

  btnSavePrefsEl.addEventListener('click', () => {
    const selected = [];
    document.querySelectorAll('.cat-pref').forEach((cb) => {
      if (cb.checked) selected.push(cb.getAttribute('data-cat'));
    });
    chrome.storage.local.set({ adearn_category_prefs: selected }, () => {
      btnSavePrefsEl.textContent = '✓ Preferences Saved!';
      setTimeout(() => {
        btnSavePrefsEl.textContent = 'Save Preferences';
      }, 1500);
      loadAds();
    });
  });

  // 3. Activity History
  function logActivity(type, title, amountPaise) {
    chrome.storage.local.get(['adearn_activity_log'], (res) => {
      const log = res.adearn_activity_log || [];
      const inr = (Number(amountPaise || 0) / 100).toFixed(2);
      log.unshift({
        type,
        title: title || 'Ad Engagement',
        amount: inr,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      });
      if (log.length > 30) log.pop(); // keep last 30
      chrome.storage.local.set({ adearn_activity_log: log });
    });
  }

  function renderHistory() {
    chrome.storage.local.get(['adearn_activity_log'], (res) => {
      const log = res.adearn_activity_log || [];
      if (!log || log.length === 0) {
        historyListEl.innerHTML = `
          <div style="text-align: center; padding: 24px; color: #7c839b; font-size: 10px;">
            No recent activity logged yet. Verified impressions and clicks will record here.
          </div>
        `;
        return;
      }
      historyListEl.innerHTML = '';
      log.forEach((item) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
          <div>
            <strong style="color: #131b2e;">${item.type === 'CLICK' ? '👆 Click' : '👁️ View'}: ${escapeHtml(item.title)}</strong>
            <span style="color: #7c839b; display: block;">${item.time}</span>
          </div>
          <span style="font-weight: 700; color: #006a61;">+₹${item.amount}</span>
        `;
        historyListEl.appendChild(div);
      });
    });
  }

  btnClearHistoryEl.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.storage.local.set({ adearn_activity_log: [] }, () => {
      renderHistory();
    });
  });

  // 4. API Config
  chrome.runtime.sendMessage({ action: 'GET_CONFIG' }, (res) => {
    if (res && res.apiBase) {
      currentApiBase = res.apiBase;
      apiLabelEl.textContent = `API: ${currentApiBase}`;
      linkDashboardEl.href = currentApiBase;
      linkWithdrawEl.href = `${currentApiBase}/withdrawals`;
      if (linkSupportDeskEl) linkSupportDeskEl.href = `${currentApiBase}/help`;
    }
    loadSessionAndAds();
  });

  toggleConfigEl.addEventListener('click', (e) => {
    e.preventDefault();
    const newBase = prompt('Enter AdEarn AI API Base URL:', currentApiBase);
    if (newBase && newBase.trim()) {
      const clean = newBase.trim().replace(/\/$/, '');
      chrome.runtime.sendMessage({ action: 'SET_API_BASE', apiBase: clean }, () => {
        currentApiBase = clean;
        apiLabelEl.textContent = `API: ${currentApiBase}`;
        linkDashboardEl.href = currentApiBase;
        linkWithdrawEl.href = `${currentApiBase}/withdrawals`;
        if (linkSupportDeskEl) linkSupportDeskEl.href = `${currentApiBase}/help`;
        loadSessionAndAds();
      });
    }
  });

  // 5. Auth Mode Toggle (Login vs Register)
  authSwitchModeEl.addEventListener('click', (e) => {
    e.preventDefault();
    isRegisterMode = !isRegisterMode;
    if (isRegisterMode) {
      authBoxTitleEl.textContent = 'Create AdEarn Account';
      authSwitchModeEl.textContent = 'Sign In Instead';
      regNameEl.style.display = 'block';
      btnLoginSubmitEl.textContent = 'Create Account';
    } else {
      authBoxTitleEl.textContent = 'Sign In to AdEarn Account';
      authSwitchModeEl.textContent = 'Create Account';
      regNameEl.style.display = 'none';
      btnLoginSubmitEl.textContent = 'Sign In';
    }
    loginErrEl.style.display = 'none';
  });

  linkAuthEl.addEventListener('click', (e) => {
    e.preventDefault();
    if (isAuthenticated) {
      chrome.runtime.sendMessage({ action: 'LOGOUT' }, () => {
        isAuthenticated = false;
        loadSessionAndAds();
      });
    } else {
      loginBoxEl.style.display = loginBoxEl.style.display === 'flex' ? 'none' : 'flex';
      loginErrEl.style.display = 'none';
    }
  });

  // Auth Submit (Login / Register)
  btnLoginSubmitEl.addEventListener('click', () => {
    const email = loginEmailEl.value.trim();
    const password = loginPassEl.value;
    const name = regNameEl.value.trim();

    if (!email || !password || (isRegisterMode && !name)) {
      loginErrEl.textContent = 'Please fill out all fields.';
      loginErrEl.style.display = 'block';
      return;
    }

    btnLoginSubmitEl.textContent = isRegisterMode ? 'Creating Account...' : 'Authenticating...';
    loginErrEl.style.display = 'none';

    if (isRegisterMode) {
      chrome.runtime.sendMessage({ action: 'REGISTER', name, email, password }, (res) => {
        btnLoginSubmitEl.textContent = 'Create Account';
        if (res && res.success) {
          loginBoxEl.style.display = 'none';
          loginPassEl.value = '';
          loadSessionAndAds();
        } else {
          loginErrEl.textContent = res?.error || 'Registration failed.';
          loginErrEl.style.display = 'block';
        }
      });
    } else {
      chrome.runtime.sendMessage({ action: 'LOGIN', email, password }, (res) => {
        btnLoginSubmitEl.textContent = 'Sign In';
        if (res && res.success) {
          loginBoxEl.style.display = 'none';
          loginPassEl.value = '';
          loadSessionAndAds();
        } else {
          loginErrEl.textContent = res?.error || 'Sign in failed.';
          loginErrEl.style.display = 'block';
        }
      });
    }
  });

  // 6. Load Session
  async function loadSessionAndAds() {
    chrome.runtime.sendMessage({ action: 'FETCH_SESSION' }, (res) => {
      if (res && res.success && res.data && res.data.authenticated) {
        isAuthenticated = true;
        const { user, wallet } = res.data;
        userNameEl.textContent = user.name || 'Creator';
        userTierEl.textContent = `${user.kycTier || 'TIER_1'} Verified`;
        linkAuthEl.textContent = 'Sign Out';

        const avail = (Number(wallet.availablePaise || 0) / 100).toFixed(2);
        const pend = (Number(wallet.pendingPaise || 0) / 100).toFixed(2);
        const earned = (Number(wallet.lifetimeEarnedPaise || 0) / 100).toFixed(2);

        balanceEl.textContent = `₹${Number(avail).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        pendingHoldEl.textContent = `Pending: ₹${Number(pend).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        lifetimeEarnedEl.textContent = `Lifetime: ₹${Number(earned).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

        if (wallet.withdrawalInProgressPaise && BigInt(wallet.withdrawalInProgressPaise) > 0n) {
          const inProgress = (Number(wallet.withdrawalInProgressPaise) / 100).toFixed(2);
          payoutStatusEl.textContent = `₹${inProgress} processing (${wallet.activePayoutStatus || 'In Transit'})`;
          payoutStatusEl.style.color = '#89f5e7';
        } else {
          payoutStatusEl.textContent = 'No active withdrawals';
          payoutStatusEl.style.color = '#bec6e0';
        }

        nodeTextEl.textContent = 'Live Node';
        loadAds();
      } else {
        isAuthenticated = false;
        userNameEl.textContent = 'Guest Creator';
        userTierEl.textContent = 'Please sign in to earn rewards';
        linkAuthEl.textContent = 'Sign In';
        balanceEl.textContent = '₹0.00';
        pendingHoldEl.textContent = 'Pending: ₹0.00';
        lifetimeEarnedEl.textContent = 'Lifetime: ₹0.00';
        payoutStatusEl.textContent = 'Sign in required';
        nodeTextEl.textContent = 'Unauthenticated';

        adListEl.innerHTML = `
          <div style="text-align: center; padding: 20px; color: #595c64; font-size: 11px;">
            Sign in to your AdEarn creator account to view verified brand ads and claim rewards.
            <div style="margin-top: 10px;">
              <button type="button" class="btn-action-sm btn-action-primary" id="btn-show-login">Sign In / Register →</button>
            </div>
          </div>
        `;
        adsCountEl.textContent = '0 Available';

        const showLoginBtn = document.getElementById('btn-show-login');
        if (showLoginBtn) {
          showLoginBtn.addEventListener('click', () => {
            loginBoxEl.style.display = 'flex';
          });
        }
      }
    });
  }

  // 7. Load & Render Ads
  function loadAds() {
    chrome.runtime.sendMessage({ action: 'FETCH_ADS' }, (res) => {
      if (!res || !res.success || !res.data || !res.data.ads) {
        adListEl.innerHTML = `
          <div style="text-align: center; padding: 20px; color: #7c839b; font-size: 11px;">
            No active campaigns available right now. Check back shortly.
          </div>
        `;
        adsCountEl.textContent = '0 Available';
        return;
      }

      let ads = res.data.ads;

      // Filter by category preferences if set
      chrome.storage.local.get(['adearn_category_prefs'], (prefRes) => {
        const allowedCats = prefRes.adearn_category_prefs;
        if (allowedCats && Array.isArray(allowedCats) && allowedCats.length > 0) {
          ads = ads.filter((a) => allowedCats.includes(a.category));
        }

        adsCountEl.textContent = `${ads.length} Available`;

        if (ads.length === 0) {
          adListEl.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #7c839b; font-size: 11px;">
              No campaigns matching your preferences currently in flight.
            </div>
          `;
          return;
        }

        adListEl.innerHTML = '';
        ads.forEach((ad) => {
          const card = document.createElement('div');
          card.className = 'ad-card';
          card.id = `ad-${ad.id}`;

          const brandName = ad.brand?.name || 'Verified Brand';
          const taskRewardINR = (Number(ad.costPerOutcomePaise || 0) / 100).toFixed(0);
          const impressionRewardPaise = Number(ad.rewardPaise || 3);
          const impressionRewardINR = (impressionRewardPaise / 100).toFixed(2);
          const cpcRewardINR = (Number(ad.cpcRewardPaise || 25) / 100).toFixed(2);

          card.innerHTML = `
            <div class="ad-header">
              <span class="ad-badge">[AdEarn Verified] ${escapeHtml(brandName)}</span>
              <span class="ad-reward">+₹${impressionRewardINR} view</span>
            </div>
            <div class="ad-title">${escapeHtml(ad.title)}</div>
            <div class="ad-desc">${escapeHtml(ad.description)}</div>
            
            <div class="ad-actions">
              <button type="button" class="btn-action-sm btn-click-ad" data-target="${escapeHtml(ad.targetUrl)}" data-clicktoken="${ad.clickToken || ''}" data-adid="${ad.id}">
                <span>🌐 Visit (+₹${cpcRewardINR})</span>
              </button>
              <button type="button" class="btn-action-sm btn-copy-prompt" data-prompt="${escapeHtml(ad.sponsoredPrompt)}">
                <span>📋 Prompt</span>
              </button>
              <a href="${currentApiBase}${ad.taskUrl}" target="_blank" class="btn-action-sm btn-action-primary">
                <span>Task (₹${taskRewardINR})</span>
              </a>
            </div>
            <div class="impression-toast" id="toast-${ad.id}">
              ✓ Verified view · ₹${impressionRewardINR} credited
            </div>
          `;

          adListEl.appendChild(card);

          // Click Ad handler with CPC verification
          const clickBtn = card.querySelector('.btn-click-ad');
          clickBtn.addEventListener('click', () => {
            const clickToken = clickBtn.getAttribute('data-clicktoken');
            const targetUrl = clickBtn.getAttribute('data-target');
            const eventId = `clk_${ad.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

            if (clickToken) {
              chrome.runtime.sendMessage({
                action: 'SUBMIT_CLICK',
                clickToken,
                eventId,
                optInRewards,
              }, (clickRes) => {
                if (clickRes && clickRes.success) {
                  logActivity('CLICK', ad.title, ad.cpcRewardPaise || 25);
                }
              });
            }

            if (targetUrl) {
              window.open(targetUrl, '_blank');
            }
          });

          // Copy Prompt Button
          const copyBtn = card.querySelector('.btn-copy-prompt');
          copyBtn.addEventListener('click', () => {
            const promptText = copyBtn.getAttribute('data-prompt');
            navigator.clipboard.writeText(promptText).then(() => {
              copyBtn.innerHTML = '<span>✓ Copied!</span>';
              setTimeout(() => {
                copyBtn.innerHTML = '<span>📋 Prompt</span>';
              }, 1800);
            });
          });

          // Trigger view impression after 1.2s continuous view
          if (ad.impressionToken && !trackedImpressions.has(ad.id)) {
            setTimeout(() => {
              submitImpression(ad);
            }, 1200);
          }
        });
      });
    });
  }

  // 8. Submit View Impression
  function submitImpression(ad) {
    if (trackedImpressions.has(ad.id)) return;
    trackedImpressions.add(ad.id);

    const eventId = `evt_${ad.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    chrome.runtime.sendMessage({
      action: 'SUBMIT_IMPRESSION',
      sessionToken: ad.impressionToken,
      eventId,
      dwellSeconds: 1.5,
      viewabilityScore: 1.0,
    }, (res) => {
      const toast = document.getElementById(`toast-${ad.id}`);
      if (res && res.success) {
        if (toast) {
          toast.style.display = 'block';
          toast.style.color = '#006a61';
        }
        logActivity('VIEW', ad.title, ad.rewardPaise || 3);
        // Refresh session wallet balance
        chrome.runtime.sendMessage({ action: 'FETCH_SESSION' }, (sessionRes) => {
          if (sessionRes && sessionRes.success && sessionRes.data && sessionRes.data.wallet) {
            const avail = (Number(sessionRes.data.wallet.availablePaise || 0) / 100).toFixed(2);
            balanceEl.textContent = `₹${Number(avail).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
          }
        });
      } else if (toast) {
        if (res?.error?.includes('RATE_LIMIT') || res?.error?.includes('FREQUENCY_CAP')) {
          toast.textContent = 'ℹ Frequency cap reached for this campaign';
          toast.style.color = '#7c839b';
          toast.style.display = 'block';
        } else if (res?.error?.includes('BUDGET_EXHAUSTED')) {
          toast.textContent = 'ℹ Campaign budget completed';
          toast.style.color = '#7c839b';
          toast.style.display = 'block';
        }
      }
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[m]));
  }
});
