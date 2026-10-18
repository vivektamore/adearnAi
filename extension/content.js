// AdEarn AI — Content Script for ChatGPT (chatgpt.com)
// Injects authorized sponsored campaign banners & prompt rewards for creators.

(function () {
  // Prevent duplicate injection
  if (document.getElementById('adearn-chatgpt-banner')) return;

  const API_BASE = 'http://localhost:3000';

  async function initAdEarnChatGPTCompanion() {
    // Check if user temporarily dismissed banner in this session
    if (sessionStorage.getItem('adearn_chatgpt_banner_dismissed') === '1') {
      return;
    }

    try {
      // 1. Fetch live active campaigns from AdEarn AI backend
      const res = await fetch(`${API_BASE}/api/campaigns`, {
        credentials: 'include',
      });

      if (!res.ok) return;

      const data = await res.json();
      const campaigns = data.campaigns || [];

      if (campaigns.length === 0) return;

      // Pick the highest-reward active campaign
      const activeCampaign = campaigns[0];
      const rewardINR = (Number(activeCampaign.costPerOutcomePaise || 3000) / 100).toFixed(0);
      const brandName = activeCampaign.organization?.name || 'Verified Brand';
      const promptText = `Tell me about ${activeCampaign.title} and why it is useful.`;

      renderBanner(activeCampaign, rewardINR, brandName, promptText);
    } catch (err) {
      // Offline or local node not reachable
      console.debug('AdEarn AI: Local server not reachable on localhost:3000');
    }
  }

  function renderBanner(campaign, rewardINR, brandName, promptText) {
    const banner = document.createElement('div');
    banner.id = 'adearn-chatgpt-banner';

    banner.innerHTML = `
      <div class="adearn-header">
        <div class="adearn-badge">
          <div class="adearn-badge-icon">A</div>
          <span>Sponsored by ${escapeHtml(brandName)}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="adearn-reward-pill">Earn ₹${rewardINR}</span>
          <button class="adearn-close-btn" id="adearn-close" title="Dismiss banner">×</button>
        </div>
      </div>

      <div class="adearn-body">
        <h4 class="adearn-campaign-title">${escapeHtml(campaign.title)}</h4>
        <p class="adearn-campaign-desc">${escapeHtml(campaign.description || 'Complete this verified activity on AdEarn AI to receive guaranteed reward credit.')}</p>
      </div>

      <div class="adearn-actions">
        <a href="${API_BASE}/task/${campaign.id}" target="_blank" class="adearn-btn-primary" id="adearn-task-link">
          <span>Start Task · Earn ₹${rewardINR}</span>
          <span style="font-size: 14px;">↗</span>
        </a>
        <button type="button" class="adearn-btn-secondary" id="adearn-insert-prompt">
          💬 Try Prompt in ChatGPT
        </button>
      </div>
    `;

    document.body.appendChild(banner);

    // Event listener for close button
    const closeBtn = banner.querySelector('#adearn-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        banner.style.opacity = '0';
        banner.style.transform = 'translateY(-16px)';
        setTimeout(() => {
          banner.remove();
          sessionStorage.setItem('adearn_chatgpt_banner_dismissed', '1');
        }, 300);
      });
    }

    // Event listener to inject prompt into ChatGPT input box
    const promptBtn = banner.querySelector('#adearn-insert-prompt');
    if (promptBtn) {
      promptBtn.addEventListener('click', () => {
        // Find ChatGPT prompt input textarea or contenteditable div
        const textarea = document.querySelector('#prompt-textarea') || document.querySelector('textarea');
        if (textarea) {
          textarea.focus();
          textarea.value = promptText;
          // Trigger input event for React state
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          promptBtn.textContent = '✓ Prompt Inserted!';
          setTimeout(() => {
            promptBtn.textContent = '💬 Try Prompt in ChatGPT';
          }, 2000);
        } else {
          // Fallback: Copy to clipboard
          navigator.clipboard.writeText(promptText).then(() => {
            promptBtn.textContent = '✓ Copied to Clipboard!';
            setTimeout(() => {
              promptBtn.textContent = '💬 Try Prompt in ChatGPT';
            }, 2000);
          });
        }
      });
    }
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

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdEarnChatGPTCompanion);
  } else {
    // Wait 1.5 seconds for ChatGPT DOM to hydrate
    setTimeout(initAdEarnChatGPTCompanion, 1500);
  }
})();
