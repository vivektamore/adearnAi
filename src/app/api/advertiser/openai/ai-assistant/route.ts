import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Prohibited & sensitive keywords per ASCI Guidelines & OpenAI Advertising Policies:
 * - Guaranteed prompt injections / ChatGPT manipulation claims
 * - Deceptive financial schemes / get-rich-quick
 * - Unverified medical cures / tobacco / firearms
 * - Misleading clickbait / false urgency
 */
const POLICY_DISALLOWED_PATTERNS = [
  /guaranteed\s+chatgpt\s+answer/i,
  /inject\s+prompt/i,
  /hack\s+chatgpt/i,
  /get\s+rich\s+quick/i,
  /100%\s+free\s+money/i,
  /crypto\s+doubler/i,
  /cure\s+cancer/i,
  /miracle\s+cure/i,
  /firearm|ammunition|explosive/i,
  /tobacco|nicotine|vape/i,
];

/**
 * POST /api/advertiser/openai/ai-assistant
 * Generates OpenAI ChatGPT-optimized creative variations, context hints,
 * budget recommendations, and runs ad policy compliance scans.
 */
export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['ADVERTISER', 'ADMIN', 'SUPER_ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const {
      brandName = 'Your Brand',
      productDescription = '',
      landingPageUrl = '',
      category = 'Software & Technology',
      objective = 'clicks',
    } = body;

    if (!productDescription || productDescription.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide a descriptive product or service summary (at least 10 characters).' },
        { status: 400 }
      );
    }

    // 1. Policy Scan
    const policyViolations: string[] = [];
    const textToScan = `${brandName} ${productDescription} ${landingPageUrl}`;
    for (const pattern of POLICY_DISALLOWED_PATTERNS) {
      if (pattern.test(textToScan)) {
        policyViolations.push(`Contains restricted terminology: "${pattern.source}"`);
      }
    }

    // Check for guaranteed prompt triggers claim
    if (/will\s+trigger\s+when\s+user\s+types/i.test(productDescription)) {
      policyViolations.push('OpenAI does not permit exact prompt-trigger claims. Context hints are descriptive relevance signals only.');
    }

    const isPolicyCompliant = policyViolations.length === 0;

    // 2. URL validation
    let isUrlValid = false;
    let urlError: string | null = null;
    if (landingPageUrl) {
      try {
        const parsed = new URL(landingPageUrl);
        isUrlValid = parsed.protocol === 'https:' || parsed.protocol === 'http:';
        if (!isUrlValid) {
          urlError = 'Destination URL must use HTTPS or HTTP.';
        }
      } catch {
        urlError = 'Invalid destination URL format. Please include protocol (e.g., https://example.com).';
      }
    }

    // 3. AI Creative Generation
    // Extract key noun phrases / keywords from description
    const cleanDesc = productDescription.trim();
    const words = cleanDesc.split(/\s+/).slice(0, 15).join(' ');

    // Generate 3 Headlines (strict max 60 chars)
    const rawHeadlines = [
      `${brandName} — Next-Gen ${category.split('&')[0].trim()}`,
      `Scale with ${brandName} Today`,
      `Smart ${category.split(' ')[0]} Solutions | ${brandName}`,
    ];

    // Ensure strictly <= 60 characters
    const headlines = rawHeadlines.map((h) => (h.length > 60 ? h.substring(0, 57) + '...' : h));

    // Generate 3 Short Descriptions (strict max 120 chars)
    const rawDescriptions = [
      `${cleanDesc.slice(0, 80)}. Experience high performance, fast setup & dedicated 24/7 support.`,
      `Modern ${category.toLowerCase()} built for forward-thinking teams. Get started with our risk-free trial.`,
      `Automate your workflow with ${brandName}. Boost efficiency and maximize ROI effortlessly.`,
    ];

    const descriptions = rawDescriptions.map((d) => (d.length > 120 ? d.substring(0, 117) + '...' : d));

    // Generate 5 Context Hints (relevance guidance, NOT exact-match triggers)
    const contextHints = [
      `${category.toLowerCase()} workflow optimization`,
      `${brandName.toLowerCase()} business solutions`,
      `performance analytics and reporting`,
      `automated scaling tools`,
      `enterprise software integration`,
    ];

    // Image recommendations
    const imageGuidance = {
      recommendedAspectRatios: ['1.91:1 (Landscape: 1200x628px)', '1:1 (Square: 1080x1080px)'],
      supportedFormats: ['PNG', 'JPEG', 'WebP'],
      maxFileSize: '5 MB',
      safeZoneNotice: 'Keep core logo and product focal point centered to avoid edge cropping on mobile ChatGPT clients.',
    };

    // Recommended Budget & Bid Strategy
    let recommendedDailyBudget = '₹2,900.00';
    let recommendedBidStrategy = 'LOWEST_COST';
    if (objective === 'impressions') {
      recommendedDailyBudget = '₹1,500.00';
    } else if (objective === 'conversions') {
      recommendedDailyBudget = '₹4,500.00';
      recommendedBidStrategy = 'MAXIMIZE_CONVERSIONS';
    }

    // OpenAI Compatible Preview Schema
    const preview = {
      nativeBadge: 'Ad',
      sponsorLabel: brandName,
      headline: headlines[0],
      description: descriptions[0],
      destinationUrl: landingPageUrl || 'https://example.com',
      callToAction: objective === 'conversions' ? 'Sign up' : 'Learn more',
      placementNote: 'Native card rendered underneath relevant ChatGPT conversation responses.',
    };

    return NextResponse.json({
      success: true,
      creativeAssistant: {
        headlines,
        descriptions,
        contextHints,
        imageGuidance,
        recommendedDailyBudget,
        recommendedBidStrategy,
        complianceCheck: {
          isCompliant: isPolicyCompliant,
          violations: policyViolations,
          summary: isPolicyCompliant
            ? 'Creative passed initial ASCI & OpenAI Advertising Policy pre-flight checks.'
            : 'Pre-flight policy flags detected. Please address before final submission.',
        },
        urlValidation: {
          isValid: isUrlValid,
          error: urlError,
        },
        preview,
      },
    });
  } catch (error: any) {
    console.error('AI Creative Assistant error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process AI creative recommendations.' },
      { status: 500 }
    );
  }
}
