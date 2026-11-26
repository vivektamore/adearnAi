/**
 * AdEarn AI — OpenAI Ads API Client & Orchestration Adapter
 * 
 * Official documented base URL: https://api.ads.openai.com/v1
 * Hierarchy: OpenAI Ad Account -> Campaign -> Ad Group -> Ad
 * 
 * Invariants:
 * 1. Budget values for OpenAI are integer micros ($1 = 1,000,000 micros) in account currency.
 * 2. AdEarn money values remain strictly BigInt integer paise. Never mix these units.
 * 3. Daily or lifetime budget is mutually exclusive.
 * 4. Created in 'paused' state; explicit state-transition required for activation.
 * 5. Production gate: If OPENAI_ADS_API_KEY is not provisioned or account authorization is pending,
 *    operates in a strictly validated, non-destructive sandbox simulation mode.
 */

export const OPENAI_ADS_BASE_URL = process.env.OPENAI_ADS_BASE_URL || 'https://api.ads.openai.com/v1';
export const OPENAI_ADS_API_KEY = process.env.OPENAI_ADS_API_KEY || '';

export type OpenaiObjectiveType = 'impressions' | 'clicks' | 'conversions';
export type OpenaiBillingEventType = 'impression' | 'click';
export type OpenaiBudgetTypeEnum = 'DAILY' | 'LIFETIME';

export interface OpenaiAccountInfo {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  status: 'ACTIVE' | 'PENDING_REVIEW' | 'SUSPENDED';
  brandReviewStatus: 'APPROVED' | 'PENDING';
  capabilities: string[];
  isSandbox: boolean;
}

export interface CreateOpenaiCampaignParams {
  name: string;
  objective: OpenaiObjectiveType;
  budgetType: OpenaiBudgetTypeEnum;
  budgetMicros: bigint;
  currency?: string;
  startTime?: Date;
  endTime?: Date;
  countries: string[];
  platforms: string[];
  landingPageUrl: string;
  complianceInfo?: Record<string, any>;
}

export interface CreateOpenaiAdGroupParams {
  externalCampaignId: string;
  name: string;
  contextHints: string[];
  bidStrategy: string;
  maxBidMicros?: bigint;
  billingEvent: OpenaiBillingEventType;
}

export interface CreateOpenaiAdParams {
  externalAdGroupId: string;
  name: string;
  brandName: string;
  faviconUrl?: string;
  headline: string;
  description: string;
  imageUrl: string;
  landingPageUrl: string;
  utmParameters?: string;
}

export interface OpenaiInsightMetrics {
  impressions: number;
  clicks: number;
  spendMicros: bigint;
  ctrPercent: number;
  avgCpcMicros: bigint;
  avgCpmMicros: bigint;
  conversions: number;
  cpaMicros: bigint;
  attributedSalesMicros: bigint;
  roas: number;
  dataFreshness: string;
  isStale: boolean;
}

export class OpenaiAdsService {
  private static isConfigured(): boolean {
    return !!OPENAI_ADS_API_KEY && OPENAI_ADS_API_KEY.startsWith('sk-');
  }

  /**
   * Helper: Convert major currency units (e.g. $50 or ₹5,000) to integer micros.
   * 1 standard currency unit = 1,000,000 micros.
   */
  static unitsToMicros(amount: number): bigint {
    return BigInt(Math.round(amount * 1_000_000));
  }

  /**
   * Helper: Convert integer micros back to major currency units with 2 decimal places.
   */
  static microsToUnits(micros: bigint | string | number): number {
    const m = BigInt(micros);
    return Number(m) / 1_000_000;
  }

  /**
   * Section C: Correct billing mapping
   * Maps internal objective to OpenAI campaign objective and authoritative billing event.
   */
  static resolveBillingMapping(objective: OpenaiObjectiveType): {
    openaiCampaignObjective: OpenaiObjectiveType;
    billingEvent: OpenaiBillingEventType;
    description: string;
  } {
    switch (objective) {
      case 'impressions':
        return {
          openaiCampaignObjective: 'impressions',
          billingEvent: 'impression',
          description: 'Impression advertising billed on confirmed native impressions.',
        };
      case 'clicks':
        return {
          openaiCampaignObjective: 'clicks',
          billingEvent: 'click',
          description: 'Click advertising billed strictly per verified user click.',
        };
      case 'conversions':
        return {
          openaiCampaignObjective: 'conversions',
          billingEvent: 'click',
          description: 'Conversion optimization using standard conversion tracking, billed on verified click engagement.',
        };
      default:
        return {
          openaiCampaignObjective: 'clicks',
          billingEvent: 'click',
          description: 'Standard click advertising.',
        };
    }
  }

  /**
   * Step 1: Verify the connected advertiser account using GET /ad_account
   */
  static async getAdAccount(): Promise<OpenaiAccountInfo> {
    if (!this.isConfigured()) {
      return {
        id: 'act_sandbox_adearn_ai_001',
        name: 'AdEarn Institutional Ads Sandbox',
        currency: 'USD',
        timezone: 'Asia/Kolkata',
        status: 'ACTIVE',
        brandReviewStatus: 'APPROVED',
        capabilities: [
          'CAMPAIGN_MANAGEMENT',
          'INSIGHTS_REPORTING',
          'CONVERSIONS_API',
          'PIXEL_TRACKING',
          'CREATIVE_ENHANCEMENT',
          'CHATGPT_NATIVE_CARDS',
        ],
        isSandbox: true,
      };
    }

    const res = await fetch(`${OPENAI_ADS_BASE_URL}/ad_account`, {
      headers: {
        Authorization: `Bearer ${OPENAI_ADS_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`OPENAI_ACCOUNT_ERROR: ${err.message || res.statusText}`);
    }

    const data = await res.json();
    return {
      id: data.id,
      name: data.name,
      currency: data.currency || 'USD',
      timezone: data.timezone || 'UTC',
      status: data.status || 'ACTIVE',
      brandReviewStatus: data.brand_review_status || 'APPROVED',
      capabilities: data.capabilities || ['CAMPAIGN_MANAGEMENT', 'INSIGHTS'],
      isSandbox: false,
    };
  }

  /**
   * Step 7: Create Campaign in paused state
   */
  static async createCampaign(params: CreateOpenaiCampaignParams): Promise<{
    externalCampaignId: string;
    status: 'paused';
    raw: any;
  }> {
    const { name, objective, budgetType, budgetMicros, currency = 'USD', startTime, endTime, countries, platforms, landingPageUrl } = params;

    if (!name || name.trim().length === 0) {
      throw new Error('VALIDATION_ERROR: Campaign name is mandatory.');
    }
    if (budgetMicros <= 0n) {
      throw new Error('VALIDATION_ERROR: Budget must be strictly positive integer micros.');
    }

    // Mutual exclusivity enforcement
    const budgetPayload: Record<string, string> = {};
    if (budgetType === 'DAILY') {
      budgetPayload.daily_budget_micros = budgetMicros.toString();
    } else {
      budgetPayload.lifetime_budget_micros = budgetMicros.toString();
    }

    if (!this.isConfigured()) {
      const mockId = `camp_openai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return {
        externalCampaignId: mockId,
        status: 'paused',
        raw: {
          id: mockId,
          name,
          objective,
          status: 'paused',
          currency,
          ...budgetPayload,
          geo_targeting: { countries },
          platforms,
          landing_page_url: landingPageUrl,
          created_at: new Date().toISOString(),
          simulated: true,
        },
      };
    }

    const payload = {
      name,
      objective,
      status: 'paused',
      currency,
      ...budgetPayload,
      start_time: (startTime || new Date()).toISOString(),
      end_time: endTime ? endTime.toISOString() : undefined,
      geo_targeting: { countries },
      platforms,
      landing_page_url: landingPageUrl,
    };

    const res = await fetch(`${OPENAI_ADS_BASE_URL}/campaigns`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_ADS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`OPENAI_CAMPAIGN_CREATION_FAILED: ${err.message || res.statusText}`);
    }

    const data = await res.json();
    return {
      externalCampaignId: data.id,
      status: 'paused',
      raw: data,
    };
  }

  /**
   * Step 8: Create Ad Group in paused state
   */
  static async createAdGroup(params: CreateOpenaiAdGroupParams): Promise<{
    externalAdGroupId: string;
    status: 'paused';
    raw: any;
  }> {
    const { externalCampaignId, name, contextHints, bidStrategy, maxBidMicros, billingEvent } = params;

    if (!this.isConfigured()) {
      const mockId = `adg_openai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return {
        externalAdGroupId: mockId,
        status: 'paused',
        raw: {
          id: mockId,
          campaign_id: externalCampaignId,
          name,
          status: 'paused',
          context_hints: contextHints,
          bid_strategy: bidStrategy,
          max_bid_micros: maxBidMicros ? maxBidMicros.toString() : null,
          billing_event: billingEvent,
          created_at: new Date().toISOString(),
          simulated: true,
        },
      };
    }

    const payload = {
      campaign_id: externalCampaignId,
      name,
      status: 'paused',
      context_hints: contextHints,
      bid_strategy: bidStrategy,
      max_bid_micros: maxBidMicros ? maxBidMicros.toString() : undefined,
      billing_event: billingEvent,
    };

    const res = await fetch(`${OPENAI_ADS_BASE_URL}/ad_groups`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_ADS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`OPENAI_ADGROUP_CREATION_FAILED: ${err.message || res.statusText}`);
    }

    const data = await res.json();
    return {
      externalAdGroupId: data.id,
      status: 'paused',
      raw: data,
    };
  }

  /**
   * Step 9: Create Ad in paused state
   */
  static async createAd(params: CreateOpenaiAdParams): Promise<{
    externalAdId: string;
    status: 'paused';
    raw: any;
  }> {
    const { externalAdGroupId, name, brandName, faviconUrl, headline, description, imageUrl, landingPageUrl, utmParameters } = params;

    if (headline.length > 60) {
      throw new Error(`HEADLINE_TOO_LONG: Headline must be <= 60 characters (provided ${headline.length}).`);
    }
    if (description.length > 120) {
      throw new Error(`DESCRIPTION_TOO_LONG: Description must be <= 120 characters (provided ${description.length}).`);
    }

    if (!this.isConfigured()) {
      const mockId = `ad_openai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return {
        externalAdId: mockId,
        status: 'paused',
        raw: {
          id: mockId,
          ad_group_id: externalAdGroupId,
          name,
          brand_name: brandName,
          favicon_url: faviconUrl,
          headline,
          description,
          image_url: imageUrl,
          landing_page_url: landingPageUrl,
          utm_parameters: utmParameters,
          status: 'paused',
          review_status: 'PENDING_REVIEW',
          created_at: new Date().toISOString(),
          simulated: true,
        },
      };
    }

    const payload = {
      ad_group_id: externalAdGroupId,
      name,
      brand_name: brandName,
      favicon_url: faviconUrl,
      headline,
      description,
      image_url: imageUrl,
      landing_page_url: landingPageUrl,
      utm_parameters: utmParameters,
      status: 'paused',
    };

    const res = await fetch(`${OPENAI_ADS_BASE_URL}/ads`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_ADS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`OPENAI_AD_CREATION_FAILED: ${err.message || res.statusText}`);
    }

    const data = await res.json();
    return {
      externalAdId: data.id,
      status: 'paused',
      raw: data,
    };
  }

  /**
   * Helper: Map internal objective to official OpenAI billing event
   */
  static getBillingMapping(objective: OpenaiObjectiveType): {
    campaignObjective: OpenaiObjectiveType;
    billingEvent: OpenaiBillingEventType;
  } {
    switch (objective) {
      case 'impressions':
        return { campaignObjective: 'impressions', billingEvent: 'impression' };
      case 'clicks':
        return { campaignObjective: 'clicks', billingEvent: 'click' };
      case 'conversions':
        // C. Billing mapping: Conversion optimization bills on clicks, not fictitious CPO
        return { campaignObjective: 'conversions', billingEvent: 'click' };
      default:
        return { campaignObjective: 'clicks', billingEvent: 'click' };
    }
  }

  /**
   * Section F: Generate embeddable first-party JavaScript conversion snippet
   */
  static generateConversionSnippet(pixelId: string): string {
    return `<!-- AdEarn OpenAI ChatGPT Ads Conversion Pixel -->
<script>
!function(w,d,e,v,n,t,s){if(w.adearnOpenaiTracker)return;n=w.adearnOpenaiTracker=function(){
n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!w._adearnOpenaiTrack)
w._adearnOpenaiTrack=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=d.createElement(e);
t.async=!0;t.src=v;s=d.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
(window,document,'script','https://analytics.adearn.ai/sdk/openai-pixel.js');
adearnOpenaiTracker('init', '${pixelId}');
adearnOpenaiTracker('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://analytics.adearn.ai/tr?id=${pixelId}&ev=PageView&noscript=1"/></noscript>`;
  }

  /**
   * Section F: Build Conversions API (CAPI) server-to-server payload
   */
  static buildConversionsApiPayload(params: {
    eventName: string;
    eventTime: number;
    eventId: string;
    actionSource: 'website' | 'app';
    customData?: Record<string, any>;
  }): Record<string, any> {
    return {
      event_name: params.eventName,
      event_time: params.eventTime,
      event_id: params.eventId,
      action_source: params.actionSource,
      custom_data: params.customData || {},
    };
  }

  /**
   * Step 13: Activate resource using documented state-transition endpoints
   */
  static async updateCampaignStatus(
    externalCampaignId: string,
    status: 'active' | 'paused' | 'archived'
  ): Promise<'active' | 'paused' | 'archived'> {
    if (!this.isConfigured()) {
      return status;
    }

    const res = await fetch(`${OPENAI_ADS_BASE_URL}/campaigns/${externalCampaignId}/status`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_ADS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`OPENAI_STATUS_TRANSITION_FAILED: ${err.message || res.statusText}`);
    }

    return status;
  }

  /**
   * Section G: Retrieve Insights reporting data from OpenAI Insights endpoints
   */
  static async getCampaignInsights(externalCampaignId: string): Promise<OpenaiInsightMetrics> {
    if (!this.isConfigured()) {
      // Deterministic simulation based on campaign ID seed
      const hash = externalCampaignId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const impressions = 2450 + (hash % 1500);
      const clicks = Math.round(impressions * 0.042);
      const spendMicros = BigInt(clicks * 480_000); // ~$0.48 CPC
      const conversions = Math.round(clicks * 0.12);
      const cpaMicros = conversions > 0 ? spendMicros / BigInt(conversions) : 0n;

      return {
        impressions,
        clicks,
        spendMicros,
        ctrPercent: 4.2,
        avgCpcMicros: 480_000n,
        avgCpmMicros: 8_200_000n,
        conversions,
        cpaMicros,
        attributedSalesMicros: spendMicros * 3n,
        roas: 3.0,
        dataFreshness: 'Simulated Insights Sandbox (Hourly Sync)',
        isStale: false,
      };
    }

    const res = await fetch(`${OPENAI_ADS_BASE_URL}/campaigns/${externalCampaignId}/insights`, {
      headers: {
        Authorization: `Bearer ${OPENAI_ADS_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`OPENAI_INSIGHTS_ERROR: ${err.message || res.statusText}`);
    }

    const d = await res.json();
    const impressions = d.impressions || 0;
    const clicks = d.clicks || 0;
    const spendMicros = BigInt(d.spend_micros || 0);
    const conversions = d.conversions || 0;

    return {
      impressions,
      clicks,
      spendMicros,
      ctrPercent: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
      avgCpcMicros: clicks > 0 ? spendMicros / BigInt(clicks) : 0n,
      avgCpmMicros: impressions > 0 ? (spendMicros * 1000n) / BigInt(impressions) : 0n,
      conversions,
      cpaMicros: conversions > 0 ? spendMicros / BigInt(conversions) : 0n,
      attributedSalesMicros: BigInt(d.attributed_sales_micros || 0),
      roas: d.roas || 0.0,
      dataFreshness: d.data_freshness || 'Verified Provider Stream (Delay: ~15m)',
      isStale: !!d.is_stale,
    };
  }
}
