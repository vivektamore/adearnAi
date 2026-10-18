import { NextRequest, NextResponse } from 'next/server';

interface GeneratedCampaign {
  title: string;
  description: string;
  category: 'FinTech' | 'Enterprise SaaS' | 'Digital Commerce' | 'Sustainability';
  actionType: 'SURVEY' | 'SANDBOX_TRIAL' | 'APP_INSTALL' | 'SENTIMENT_POLL';
  targetUrl: string;
  recommendedCostPerOutcome: number;
  suggestedBudget: number;
  targetOutcomes: number;
  sampleQuestion: string;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, category: requestedCategory } = await req.json();

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Please enter a product idea, brand name, or website prompt.' }, { status: 400 });
    }

    const cleanPrompt = prompt.trim();
    const apiKey = process.env.OPENAI_API_KEY;

    // 1. If OpenAI API Key is configured in environment, call ChatGPT API
    if (apiKey) {
      try {
        const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: `You are an expert advertising strategist for AdEarn AI, India's high-trust sponsored content and voluntary creator rewards platform.
Create a structured campaign based on the user's brand/idea.
The response must be valid JSON with this exact schema:
{
  "title": "Clear, engaging, ASCI-compliant title (max 70 chars)",
  "description": "Clear instructions for digital creators detailing what voluntary task is required (max 200 chars)",
  "category": "FinTech" | "Enterprise SaaS" | "Digital Commerce" | "Sustainability",
  "actionType": "SURVEY" | "SANDBOX_TRIAL" | "APP_INSTALL" | "SENTIMENT_POLL",
  "targetUrl": "https://... (valid https url)",
  "recommendedCostPerOutcome": number (in INR, e.g. 25, 30, 40),
  "suggestedBudget": number (in INR, e.g. 25000, 50000),
  "targetOutcomes": number (e.g. 500, 1000),
  "sampleQuestion": "Diagnostic questionnaire or evaluation prompt for creators"
}`,
              },
              {
                role: 'user',
                content: `Generate an AdEarn AI campaign for this product/prompt: "${cleanPrompt}"`,
              },
            ],
            temperature: 0.7,
          }),
        });

        if (openAiRes.ok) {
          const aiData = await openAiRes.json();
          const parsed: GeneratedCampaign = JSON.parse(aiData.choices[0].message.content);
          return NextResponse.json({
            success: true,
            source: 'openai_chatgpt',
            campaign: parsed,
          });
        }
      } catch (err) {
        console.warn('OpenAI API call failed, falling back to built-in AI template generator:', err);
      }
    }

    // 2. Built-in Intelligent Campaign Generator Engine (Instant, zero-latency, production-safe)
    const lower = cleanPrompt.toLowerCase();

    let category: GeneratedCampaign['category'] = requestedCategory || 'Enterprise SaaS';
    let actionType: GeneratedCampaign['actionType'] = 'SURVEY';
    let costPerOutcome = 30;
    let suggestedBudget = 30000;
    let targetOutcomes = 1000;
    let sampleQuestion = 'How likely are you to recommend this product based on its primary features?';

    let domainName = cleanPrompt.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'brand';
    if (domainName.length > 15) domainName = domainName.slice(0, 15);
    let targetUrl = `https://${domainName}.com/explore`;

    if (lower.includes('fintech') || lower.includes('gold') || lower.includes('stock') || lower.includes('invest') || lower.includes('trading') || lower.includes('upi') || lower.includes('bank')) {
      category = 'FinTech';
      actionType = 'SURVEY';
      costPerOutcome = 35;
      suggestedBudget = 35000;
      targetOutcomes = 1000;
      sampleQuestion = 'Which factor is most critical when choosing a digital investment platform: zero brokerage, sovereign security, or intuitive UI?';
    } else if (lower.includes('ai') || lower.includes('chatgpt') || lower.includes('saas') || lower.includes('software') || lower.includes('tool') || lower.includes('app')) {
      category = 'Enterprise SaaS';
      actionType = 'SANDBOX_TRIAL';
      costPerOutcome = 40;
      suggestedBudget = 40000;
      targetOutcomes = 1000;
      sampleQuestion = 'Did the AI prompt output meet your expectations for speed, relevance, and accuracy?';
    } else if (lower.includes('shop') || lower.includes('fashion') || lower.includes('ecommerce') || lower.includes('store') || lower.includes('brand') || lower.includes('delivery')) {
      category = 'Digital Commerce';
      actionType = 'SENTIMENT_POLL';
      costPerOutcome = 25;
      suggestedBudget = 25000;
      targetOutcomes = 1000;
      sampleQuestion = 'Would you purchase from this brand if same-day delivery and instant refunds are provided?';
    } else if (lower.includes('green') || lower.includes('solar') || lower.includes('eco') || lower.includes('sustainable') || lower.includes('ev')) {
      category = 'Sustainability';
      actionType = 'SURVEY';
      costPerOutcome = 30;
      suggestedBudget = 30000;
      targetOutcomes = 1000;
      sampleQuestion = 'Are you willing to pay a 5% premium for products certified zero-carbon footprint?';
    }

    const campaign: GeneratedCampaign = {
      title: `${cleanPrompt.slice(0, 50).trim()} — Discovery & Voluntary Evaluation`,
      description: `Explore the ${cleanPrompt.trim()} platform. Complete the interactive diagnostic questionnaire to test core capabilities and claim your verified reward.`,
      category,
      actionType,
      targetUrl,
      recommendedCostPerOutcome: costPerOutcome,
      suggestedBudget,
      targetOutcomes,
      sampleQuestion,
    };

    return NextResponse.json({
      success: true,
      source: 'adearn_ai_engine',
      campaign,
    });
  } catch (error: any) {
    console.error('Error generating AI campaign:', error);
    return NextResponse.json({ error: 'Failed to generate campaign with AI.' }, { status: 500 });
  }
}
