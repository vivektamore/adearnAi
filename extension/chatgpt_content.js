// AdEarn AI — Native In-Chat Sponsored Card Content Script for ChatGPT (chatgpt.com)
// Injects authorized sponsored campaign cards matching native ChatGPT styling.

(function () {
  'use strict';

  let currentAd = null;
  let hasInjectedCurrentAd = false;
  let impressionReported = false;

  async function fetchActiveAd() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'FETCH_ADS' }, (response) => {
        if (response && response.success && response.data && response.data.ads && response.data.ads.length > 0) {
          resolve(response.data.ads[0]);
        } else {
          resolve(null);
        }
      });
    });
  }

  function createAdCardElement(ad) {
    const container = document.createElement('div');
    container.className = 'adearn-chatgpt-container';
    container.id = 'adearn-chatgpt-inchat-ad';

    const brandName = ad.brand?.name || ad.organization?.name || 'Verified Partner';
    const brandLetter = brandName.charAt(0).toUpperCase();
    const assetUrl = ad.creative?.assetUrl || ad.creativeAsset?.assetUrl || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=300&q=80';
    const title = ad.title || 'Sponsored Solution';
    const description = ad.description || 'Verified enterprise tool on AdEarn AI.';

    container.innerHTML = `
      <div class="adearn-chatgpt-label">This might also interest you.</div>
      <div class="adearn-chatgpt-card" role="button" tabindex="0">
        <div class="adearn-chatgpt-thumb-wrap">
          <img src="${escapeHtml(assetUrl)}" alt="${escapeHtml(title)}" class="adearn-chatgpt-thumb" />
        </div>
        <div class="adearn-chatgpt-content">
          <div class="adearn-chatgpt-brand-row">
            <div class="adearn-chatgpt-brand-icon">${escapeHtml(brandLetter)}</div>
            <span class="adearn-chatgpt-brand-name">${escapeHtml(brandName)}</span>
          </div>
          <h4 class="adearn-chatgpt-title">${escapeHtml(title)}</h4>
          <p class="adearn-chatgpt-desc">${escapeHtml(description)}</p>
          <span class="adearn-chatgpt-cta">Learn more ↗</span>
        </div>
        <div class="adearn-chatgpt-badge">Ad</div>
      </div>
    `;

    // Click handler for engagement & attribution
    const card = container.querySelector('.adearn-chatgpt-card');
    card.addEventListener('click', (e) => {
      e.preventDefault();
      handleAdClick(ad);
    });

    // IntersectionObserver for genuine viewport viewability attribution
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !impressionReported) {
            impressionReported = true;
            reportImpression(ad);
            observer.disconnect();
          }
        });
      }, { threshold: 0.5 });
      observer.observe(container);
    } else {
      setTimeout(() => reportImpression(ad), 1500);
    }

    return container;
  }

  function reportImpression(ad) {
    if (!ad.impressionToken) return;
    chrome.runtime.sendMessage({
      action: 'SUBMIT_IMPRESSION',
      sessionToken: ad.impressionToken,
      eventId: `imp_chatgpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      dwellSeconds: 2.0,
      viewabilityScore: 1.0,
    }, (res) => {
      console.debug('[AdEarn AI] In-chat impression recorded:', res);
    });
  }

  function handleAdClick(ad) {
    if (!ad.clickToken) {
      if (ad.targetUrl) window.open(ad.targetUrl, '_blank');
      return;
    }

    const eventId = `clk_chatgpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    chrome.runtime.sendMessage({
      action: 'SUBMIT_CLICK',
      clickToken: ad.clickToken,
      eventId,
      optInRewards: true,
    }, (res) => {
      console.debug('[AdEarn AI] In-chat click recorded & credited:', res);
      const destination = res?.data?.targetUrl || ad.targetUrl || 'http://localhost:3000';
      window.open(destination, '_blank');
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[m]));
  }

  // Scan ChatGPT conversation DOM to attach the in-chat sponsored card
  async function tryInjectAd() {
    if (document.getElementById('adearn-chatgpt-inchat-ad')) return;

    if (!currentAd) {
      currentAd = await fetchActiveAd();
    }
    if (!currentAd) return;

    // Find latest assistant turn in ChatGPT DOM
    // Matches article[data-testid*="conversation-turn"], [data-message-author-role="assistant"], or .agent-turn
    const assistantTurns = document.querySelectorAll(
      '[data-message-author-role="assistant"], article[data-testid*="conversation-turn"]'
    );

    if (assistantTurns.length > 0) {
      const latestTurn = assistantTurns[assistantTurns.length - 1];
      
      // Ensure we don't inject while ChatGPT is still streaming/typing
      const isGenerating = document.querySelector('button[data-testid="stop-button"], .result-streaming');
      if (isGenerating) return;

      const adElement = createAdCardElement(currentAd);
      latestTurn.parentNode.insertBefore(adElement, latestTurn.nextSibling);
      hasInjectedCurrentAd = true;
    }
  }

  // Observe conversation changes
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => {
      if (!document.getElementById('adearn-chatgpt-inchat-ad')) {
        tryInjectAd();
      }
    });

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  // Initial check
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInjectAd);
  } else {
    setTimeout(tryInjectAd, 2000);
  }
})();
