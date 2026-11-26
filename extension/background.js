// AdEarn AI — Manifest V3 Background Service Worker
// Mediates authenticated API requests, session state, and impression beacons.

const DEFAULT_API_BASE = 'http://localhost:3000';

async function getApiBase() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['adearn_api_base'], (result) => {
      resolve(result.adearn_api_base || DEFAULT_API_BASE);
    });
  });
}

async function getStoredToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['adearn_auth_token'], (result) => {
      resolve(result.adearn_auth_token || null);
    });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handleAsync = async () => {
    const apiBase = await getApiBase();
    const token = await getStoredToken();

    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      switch (request.action) {
        case 'GET_CONFIG': {
          sendResponse({ success: true, apiBase, hasToken: !!token });
          break;
        }

        case 'SET_API_BASE': {
          if (request.apiBase) {
            chrome.storage.sync.set({ adearn_api_base: request.apiBase }, () => {
              sendResponse({ success: true, apiBase: request.apiBase });
            });
          }
          break;
        }

        case 'SET_AUTH_TOKEN': {
          chrome.storage.local.set({ adearn_auth_token: request.token }, () => {
            sendResponse({ success: true });
          });
          break;
        }

        case 'REGISTER': {
          const res = await fetch(`${apiBase}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: request.name,
              email: request.email,
              password: request.password,
            }),
          });
          const data = await res.json();
          if (res.ok && data.token) {
            chrome.storage.local.set({ adearn_auth_token: data.token }, () => {
              sendResponse({ success: true, user: data.user, token: data.token });
            });
          } else {
            sendResponse({ success: false, error: data.error || 'Registration failed' });
          }
          break;
        }

        case 'LOGIN': {
          const res = await fetch(`${apiBase}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: request.email, password: request.password }),
          });
          const data = await res.json();
          if (res.ok && data.token) {
            chrome.storage.local.set({ adearn_auth_token: data.token }, () => {
              sendResponse({ success: true, user: data.user, token: data.token });
            });
          } else {
            sendResponse({ success: false, error: data.error || 'Authentication failed' });
          }
          break;
        }

        case 'LOGOUT': {
          chrome.storage.local.remove(['adearn_auth_token'], () => {
            sendResponse({ success: true });
          });
          break;
        }

        case 'FETCH_SESSION': {
          const res = await fetch(`${apiBase}/api/extension/session`, {
            headers,
            credentials: 'include',
          });
          const data = await res.json();
          sendResponse({ success: res.ok, status: res.status, data });
          break;
        }

        case 'FETCH_ADS': {
          const res = await fetch(`${apiBase}/api/ads/serve`, {
            headers,
            credentials: 'include',
          });
          const data = await res.json();
          sendResponse({ success: res.ok, status: res.status, data });
          break;
        }

        case 'SUBMIT_IMPRESSION': {
          const res = await fetch(`${apiBase}/api/ads/impression`, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({
              sessionToken: request.sessionToken,
              eventId: request.eventId,
              dwellSeconds: request.dwellSeconds,
              viewabilityScore: request.viewabilityScore,
            }),
          });
          const data = await res.json();
          sendResponse({ success: res.ok, status: res.status, data });
          break;
        }

        case 'SUBMIT_CLICK': {
          const res = await fetch(`${apiBase}/api/ads/click`, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({
              clickToken: request.clickToken,
              eventId: request.eventId,
              optInRewards: request.optInRewards !== false,
            }),
          });
          const data = await res.json();
          sendResponse({ success: res.ok, status: res.status, data });
          break;
        }

        default:
          sendResponse({ success: false, error: `Unknown action: ${request.action}` });
      }
    } catch (err) {
      sendResponse({ success: false, error: err.message || 'Network error in background service worker' });
    }
  };

  handleAsync();
  return true; // Keep message channel open for async response
});

// Configure Side Panel behavior on Chrome 116+
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
}
