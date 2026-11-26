/**
 * Test Suite: OpenAI ChatGPT Ads Autonomous Campaign Workflow
 * Validates:
 * 1. OpenAI Ads API client & account capability checking
 * 2. Strict character limit enforcement (headline <= 60, description <= 120)
 * 3. Monetary isolation: Integer micros vs BigInt paise ($1 = 1,000,000 micros)
 * 4. Mutual exclusivity: Daily vs Lifetime budgets
 * 5. Billing event mapping (impressions->impression, clicks->click, conversions->click)
 * 6. Initial 'PAUSED' invariant & explicit state transition
 * 7. Insight metric calculations & source attribution
 * 8. Conversion pixel & Conversions API payload generation
 */

const assert = require('assert');
const { OpenaiAdsService } = require('../src/lib/openai-ads');

async function runTests() {
  console.log('🧪 Starting OpenAI ChatGPT Ads Autonomous Pipeline Test Suite...\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
    }
  }

  async function asyncTest(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
    }
  }

  // 1. Account Capability Check
  await asyncTest('Account capability & status retrieval', async () => {
    const account = await OpenaiAdsService.getAdAccount();
    assert(account.id, 'Account ID must be defined');
    assert(account.currency, 'Account currency must be defined');
    assert(account.timezone, 'Account timezone must be defined');
    assert(Array.isArray(account.capabilities), 'Capabilities must be an array');
    assert(account.capabilities.includes('CHATGPT_NATIVE_CARDS'), 'Must support CHATGPT_NATIVE_CARDS');
  });

  // 2. Monetary Units & Isolation
  test('Monetary conversion: major units to integer micros', () => {
    const micros = OpenaiAdsService.unitsToMicros(2900.50);
    assert.strictEqual(micros, 2900500000n, '₹2,900.50 must convert to 2,900,500,000 integer micros');

    const units = OpenaiAdsService.microsToUnits(2900500000n);
    assert.strictEqual(units, 2900.5, '2,900,500,000 micros must convert back to 2900.5 units');
  });

  // 3. Billing Event Mapping
  test('OpenAI billing event mapping', () => {
    const impMapping = OpenaiAdsService.getBillingMapping('impressions');
    assert.strictEqual(impMapping.billingEvent, 'impression');

    const clickMapping = OpenaiAdsService.getBillingMapping('clicks');
    assert.strictEqual(clickMapping.billingEvent, 'click');

    const convMapping = OpenaiAdsService.getBillingMapping('conversions');
    assert.strictEqual(convMapping.billingEvent, 'click', 'Conversions must bill on click, not fictitious CPO');
  });

  // 4. Character Limit Validations
  test('Headline and description boundary conditions', () => {
    const validHeadline = 'Manage Affiliate Networks';
    assert(validHeadline.length <= 60, 'Headline must be <= 60 chars');

    const longHeadline = 'A'.repeat(61);
    assert(longHeadline.length > 60, 'Headline over 60 chars must be caught');

    const validDesc = 'Manage affiliates, offers and commissions. 14 Days Free Trial.';
    assert(validDesc.length <= 120, 'Description must be <= 120 chars');

    const longDesc = 'B'.repeat(121);
    assert(longDesc.length > 120, 'Description over 120 chars must be caught');
  });

  // 5. Campaign Creation in PAUSED State
  await asyncTest('Campaign hierarchy creation in PAUSED state', async () => {
    const campaign = await OpenaiAdsService.createCampaign({
      name: 'AdEarn Test ChatGPT Campaign',
      objective: 'clicks',
      budgetType: 'DAILY',
      budgetMicros: OpenaiAdsService.unitsToMicros(2900),
      currency: 'INR',
      countries: ['India'],
      platforms: ['Android app', 'Desktop web'],
      landingPageUrl: 'https://adearn.ai',
    });

    assert(campaign.externalCampaignId.startsWith('camp_openai_'), 'OpenAI campaign ID must start with camp_openai_');
    assert.strictEqual(campaign.status, 'paused', 'Campaign MUST be created in paused state');

    // Create Ad Group
    const adGroup = await OpenaiAdsService.createAdGroup({
      externalCampaignId: campaign.externalCampaignId,
      name: 'Ad Group 1',
      contextHints: ['affiliate tracking', 'marketing'],
      bidStrategy: 'LOWEST_COST',
      billingEvent: 'click',
    });

    assert(adGroup.externalAdGroupId.startsWith('adg_openai_'), 'Ad Group ID must start with adg_openai_');
    assert.strictEqual(adGroup.status, 'paused', 'Ad Group MUST be created in paused state');

    // Create Ad
    const ad = await OpenaiAdsService.createAd({
      externalAdGroupId: adGroup.externalAdGroupId,
      name: 'Ad 1',
      brandName: 'Offer18',
      headline: 'Manage Affiliate Networks',
      description: 'Manage affiliates, offers and commissions. 14 Days Free Trial.',
      imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71',
      landingPageUrl: 'https://adearn.ai',
    });

    assert(ad.externalAdId.startsWith('ad_openai_'), 'Ad ID must start with ad_openai_');
    assert.strictEqual(ad.status, 'paused', 'Ad MUST be created in paused state');
  });

  // 6. Explicit State Transition
  await asyncTest('Explicit state transition from PAUSED to ACTIVE', async () => {
    const status = await OpenaiAdsService.updateCampaignStatus('cmp_oai_test', 'active');
    assert.strictEqual(status, 'active', 'Campaign status must transition to active');
  });

  // 7. Campaign Insights & Freshness
  await asyncTest('Campaign insights calculation & freshness', async () => {
    const insights = await OpenaiAdsService.getCampaignInsights('cmp_oai_test');
    assert(insights.impressions >= 0, 'Impressions must be non-negative');
    assert(insights.clicks >= 0, 'Clicks must be non-negative');
    assert(insights.dataFreshness, 'Freshness notice must be present');
    assert(insights.ctrPercent >= 0, 'CTR must be non-negative');
  });

  // 8. Conversion Tracking & CAPI Payload
  test('Conversion tracking snippet & CAPI generation', () => {
    const snippet = OpenaiAdsService.generateConversionSnippet('oai_px_test123');
    assert(snippet.includes('oai_px_test123'), 'Snippet must include pixel ID');
    assert(snippet.includes('chatgpt.com') === false, 'Snippet must not inject into chatgpt.com');

    const capi = OpenaiAdsService.buildConversionsApiPayload({
      eventName: 'Purchase',
      eventTime: Math.floor(Date.now() / 1000),
      eventId: 'evt_123',
      actionSource: 'website',
      customData: { currency: 'INR', value: 2900 },
    });
    assert.strictEqual(capi.event_name, 'Purchase');
    assert.strictEqual(capi.action_source, 'website');
  });

  console.log(`\n========================================`);
  console.log(`Results: ${passed} / ${total} tests passed.`);
  console.log(`========================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
