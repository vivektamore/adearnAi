'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NewChatGptCampaignWizardPage() {
  const router = useRouter();

  // Wizard Step: 1 = Create Campaign, 2 = Create Ad Group & Ads, 3 = Review
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<any | null>(null);

  // STEP 1 STATE: Campaign Settings
  const [campaignName, setCampaignName] = useState('adearnAi campaign');
  const [objective, setObjective] = useState<'clicks' | 'impressions' | 'conversions'>('clicks');
  const [description, setDescription] = useState('Autonomous campaign targeted to OpenAI ChatGPT conversational inventory.');
  const [category, setCategory] = useState('Software & Technology');
  const [currency, setCurrency] = useState('INR');
  const [budgetType, setBudgetType] = useState<'DAILY' | 'LIFETIME'>('DAILY');
  const [budgetAmount, setBudgetAmount] = useState('2900.00');
  const [startTime, setStartTime] = useState(new Date().toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [locations, setLocations] = useState<string>('India');
  const [platforms, setPlatforms] = useState<string[]>([
    'Android app',
    'Android web',
    'Desktop web',
    'iOS app',
    'iOS web',
  ]);
  const [landingPageUrl, setLandingPageUrl] = useState('https://adearn.ai');
  const [complianceAcknowledged, setComplianceAcknowledged] = useState(true);

  // STEP 2 STATE: Ad Group & Creative Settings
  const [adGroupName, setAdGroupName] = useState('Ad group 1');
  const [contextHintsInput, setContextHintsInput] = useState(
    'affiliate network tracking, performance marketing, ROI reporting'
  );
  const [bidStrategy, setBidStrategy] = useState('LOWEST_COST');
  const [maxBidAmount, setMaxBidAmount] = useState('');

  // Creative Ad 1
  const [brandName, setBrandName] = useState('Offer18');
  const [faviconUrl, setFaviconUrl] = useState('https://api.dicebear.com/7.x/identicon/svg?seed=offer18');
  const [headline, setHeadline] = useState('Manage Affiliate Networks');
  const [adDescription, setAdDescription] = useState(
    'Manage affiliates, offers and commissions. 14 Days Free Trial.'
  );
  const [imageUrl, setImageUrl] = useState(
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80'
  );
  const [utmParams, setUtmParams] = useState('utm_source=chatgpt&utm_medium=sponsored_card&utm_campaign=adearn_ai');

  // AI Creative Assistant State
  const [aiProductDesc, setAiProductDesc] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any | null>(null);

  // Active sub-selection in step 2 (e.g. viewing ad vs ad group)
  const [activeStep2Tab, setActiveStep2Tab] = useState<'adgroup' | 'ad1' | 'assistant'>('ad1');

  // Validation checks
  const isAdValid =
    headline.trim().length > 0 &&
    headline.trim().length <= 60 &&
    adDescription.trim().length > 0 &&
    adDescription.trim().length <= 120 &&
    landingPageUrl.trim().length > 0 &&
    imageUrl.trim().length > 0;

  // Run AI Creative Assistant
  const handleRunAiAssistant = async () => {
    if (!aiProductDesc || aiProductDesc.trim().length < 8) {
      alert('Please enter at least a few words describing your product or offer.');
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch('/api/advertiser/openai/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName,
          productDescription: aiProductDesc,
          landingPageUrl,
          category,
          objective,
        }),
      });
      const data = await res.json();
      if (data.creativeAssistant) {
        setAiSuggestions(data.creativeAssistant);
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err: any) {
      alert('Failed to call AI Creative Assistant: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // Submit to OpenAI Pipeline
  const handlePublish = async () => {
    if (!complianceAcknowledged) {
      alert('You must acknowledge the OpenAI Advertising Policy terms to continue.');
      return;
    }
    if (!isAdValid) {
      alert('Please correct validation issues in Ad 1 before submitting.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    const contextHints = contextHintsInput
      .split(',')
      .map((h) => h.trim())
      .filter((h) => h.length > 0);

    const payload = {
      name: campaignName,
      objective,
      budgetType,
      budgetAmount: parseFloat(budgetAmount),
      currency,
      startTime,
      endTime,
      countries: locations.split(',').map((l) => l.trim()),
      platforms,
      landingPageUrl,
      complianceAcknowledged,

      adGroupName,
      contextHints,
      bidStrategy,
      maxBidAmount: maxBidAmount ? parseFloat(maxBidAmount) : undefined,

      brandName,
      faviconUrl,
      headline,
      description: adDescription,
      imageUrl,
      utmParameters: utmParams,
    };

    try {
      const res = await fetch('/api/advertiser/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create campaign via OpenAI API.');
      }

      setCreatedResult(data);
    } catch (err: any) {
      setSubmissionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Activate created campaign
  const handleActivateCampaign = async (campaignId: string) => {
    try {
      const res = await fetch(`/api/advertiser/openai/${campaignId}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Campaign successfully activated in OpenAI ChatGPT Ads Manager!');
        router.push('/advertiser/chatgpt-ads');
      } else {
        alert('Failed to activate: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Activation error: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfd] text-[#1c1c1e] flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-gray-200 px-6 flex items-center justify-between bg-white sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <Link
            href="/advertiser/chatgpt-ads"
            className="text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </Link>
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-purple-600 text-lg">edit_square</span>
            <span className="font-semibold text-sm">New campaign</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/advertiser/chatgpt-ads')}
            className="text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors"
          >
            Save as draft
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left 3-Step Hierarchy Sidebar */}
        <aside className="w-80 border-r border-gray-200 bg-white p-5 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-6">
            {/* Step 1: Create Campaign */}
            <div
              onClick={() => setCurrentStep(1)}
              className={`cursor-pointer rounded-lg p-2.5 transition-colors ${
                currentStep === 1 ? 'bg-purple-50 text-purple-900' : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    currentStep > 1
                      ? 'bg-gray-800 text-white'
                      : currentStep === 1
                      ? 'bg-purple-600 text-white'
                      : 'border border-gray-300 text-gray-500'
                  }`}
                >
                  {currentStep > 1 ? (
                    <span className="material-symbols-outlined text-sm">check</span>
                  ) : (
                    '1'
                  )}
                </div>
                <div className="text-sm font-semibold">Create Campaign</div>
              </div>
              <div className="ml-9 mt-1 flex items-center space-x-2 text-xs text-gray-500 truncate">
                <span className="material-symbols-outlined text-sm">campaign</span>
                <span className="truncate">{campaignName || 'Untitled campaign'}</span>
              </div>
            </div>

            {/* Connecting Line */}
            <div className="w-0.5 h-4 bg-gray-200 ml-5 -my-4" />

            {/* Step 2: Create Ad Group & Ads */}
            <div
              onClick={() => setCurrentStep(2)}
              className={`cursor-pointer rounded-lg p-2.5 transition-colors ${
                currentStep === 2 ? 'bg-purple-50 text-purple-900' : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    currentStep > 2
                      ? 'bg-gray-800 text-white'
                      : currentStep === 2
                      ? 'bg-purple-600 text-white'
                      : 'border border-gray-300 text-gray-500'
                  }`}
                >
                  {currentStep > 2 ? (
                    <span className="material-symbols-outlined text-sm">check</span>
                  ) : (
                    '2'
                  )}
                </div>
                <div className="text-sm font-semibold">Create Ad Group & Ads</div>
              </div>

              {/* Nested Ad Group Hierarchy */}
              <div className="ml-9 mt-2 space-y-2">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentStep(2);
                    setActiveStep2Tab('adgroup');
                  }}
                  className={`flex items-center justify-between text-xs p-1.5 rounded ${
                    activeStep2Tab === 'adgroup' && currentStep === 2
                      ? 'bg-purple-100/70 font-semibold text-purple-950'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 truncate">
                    <span className="material-symbols-outlined text-sm">folder</span>
                    <span className="truncate">{adGroupName}</span>
                  </div>
                  <span className="material-symbols-outlined text-xs">more_vert</span>
                </div>

                {/* Ads list */}
                <div className="ml-3 pl-2 border-l border-gray-200 space-y-1">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentStep(2);
                      setActiveStep2Tab('ad1');
                    }}
                    className={`flex items-center justify-between text-xs p-1.5 rounded ${
                      activeStep2Tab === 'ad1' && currentStep === 2
                        ? 'bg-purple-100/70 font-semibold text-purple-950'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 truncate">
                      <span className="material-symbols-outlined text-sm">ad</span>
                      <span className="truncate">Ad 1</span>
                    </div>
                    {!isAdValid && (
                      <span className="material-symbols-outlined text-amber-600 text-sm" title="Incomplete creative">
                        warning
                      </span>
                    )}
                  </div>

                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentStep(2);
                      setActiveStep2Tab('assistant');
                    }}
                    className={`flex items-center space-x-1.5 text-xs p-1.5 rounded ${
                      activeStep2Tab === 'assistant' && currentStep === 2
                        ? 'bg-purple-100 font-semibold text-purple-900'
                        : 'text-purple-600 hover:bg-purple-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                    <span>AI Creative Assistant</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Connecting Line */}
            <div className="w-0.5 h-4 bg-gray-200 ml-5 -my-4" />

            {/* Step 3: Review */}
            <div
              onClick={() => setCurrentStep(3)}
              className={`cursor-pointer rounded-lg p-2.5 transition-colors ${
                currentStep === 3 ? 'bg-purple-50 text-purple-900' : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    currentStep === 3
                      ? 'bg-purple-600 text-white'
                      : 'border border-gray-300 text-gray-500'
                  }`}
                >
                  3
                </div>
                <div className="text-sm font-semibold">Review</div>
              </div>
              <div className="ml-9 mt-1 flex items-center space-x-2 text-xs text-gray-500">
                <span className="material-symbols-outlined text-sm">summarize</span>
                <span>Campaign summary</span>
              </div>
            </div>
          </div>

          {/* Connected Ad Account Badge */}
          <div className="border-t border-gray-200 pt-4 text-xs text-gray-500 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700">OpenAI Ads Manager</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                Connected
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              Account: <span className="font-mono text-gray-600">act_openai_sandbox</span>
            </p>
            <p className="text-[11px] text-gray-400">Timezone: Asia/Kolkata (IST)</p>
          </div>
        </aside>

        {/* Center/Right Dynamic Step Content Area */}
        <main className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto">
          {/* STEP 1: CREATE CAMPAIGN */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Campaign details</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Configure high-level parameters for your OpenAI ChatGPT campaign.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6 shadow-sm">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
                    Campaign name
                  </label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    placeholder="e.g. adearnAi Q4 Scaling Campaign"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
                      Campaign Objective
                    </label>
                    <select
                      value={objective}
                      onChange={(e) => setObjective(e.target.value as any)}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                    >
                      <option value="clicks">Clicks (Traffic to landing page)</option>
                      <option value="impressions">Impressions (Brand visibility)</option>
                      <option value="conversions">Conversions (Purchases / Leads)</option>
                    </select>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Billing event: <span className="font-semibold text-gray-700">{objective === 'impressions' ? 'Impression' : 'Click'}</span>
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                    >
                      <option value="Software & Technology">Software & Technology</option>
                      <option value="E-Commerce & Retail">E-Commerce & Retail</option>
                      <option value="Financial Services">Financial Services</option>
                      <option value="Education & Learning">Education & Learning</option>
                      <option value="Healthcare & Wellness">Healthcare & Wellness</option>
                    </select>
                  </div>
                </div>

                {/* Budget Section */}
                <div className="border-t border-gray-100 pt-5 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900">Budget and schedule</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
                        Budget Type
                      </label>
                      <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50">
                        <button
                          type="button"
                          onClick={() => setBudgetType('DAILY')}
                          className={`flex-1 text-xs py-1.5 rounded-md font-semibold transition-colors ${
                            budgetType === 'DAILY' ? 'bg-white shadow text-purple-900' : 'text-gray-600'
                          }`}
                        >
                          Daily
                        </button>
                        <button
                          type="button"
                          onClick={() => setBudgetType('LIFETIME')}
                          className={`flex-1 text-xs py-1.5 rounded-md font-semibold transition-colors ${
                            budgetType === 'LIFETIME' ? 'bg-white shadow text-purple-900' : 'text-gray-600'
                          }`}
                        >
                          Lifetime
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
                        Average {budgetType === 'DAILY' ? 'daily' : 'lifetime'} budget ({currency})
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500 text-sm">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          value={budgetAmount}
                          onChange={(e) => setBudgetAmount(e.target.value)}
                          className="w-full pl-8 pr-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          placeholder="2900.00"
                        />
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Stored in OpenAI API as {(parseFloat(budgetAmount || '0') * 1_000_000).toLocaleString()} integer micros.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
                        Account Currency
                      </label>
                      <input
                        type="text"
                        disabled
                        value="INR (₹)"
                        className="w-full px-3.5 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Flight Start Date</label>
                      <input
                        type="date"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Flight End Date</label>
                      <input
                        type="date"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Target Locations & Platforms */}
                <div className="border-t border-gray-100 pt-5 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900">Targeting & Placement</h3>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
                      Locations for this campaign
                    </label>
                    <input
                      type="text"
                      value={locations}
                      onChange={(e) => setLocations(e.target.value)}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="India, United States, United Kingdom"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
                      Eligible platforms
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Android app', 'Android web', 'Desktop web', 'iOS app', 'iOS web'].map((plat) => (
                        <span
                          key={plat}
                          className="bg-gray-100 text-gray-800 text-xs px-2.5 py-1 rounded-full font-medium"
                        >
                          {plat}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
                      Campaign destination URL
                    </label>
                    <input
                      type="url"
                      value={landingPageUrl}
                      onChange={(e) => setLandingPageUrl(e.target.value)}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Step Navigation Bar */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm px-6 py-2.5 rounded-lg shadow-sm transition-colors flex items-center space-x-2"
                >
                  <span>Next: Create Ad Group & Ads</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CREATE AD GROUP & ADS */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Create Ad Group & Ads</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Configure context hints, bid strategy, and design your native ChatGPT ad card.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setActiveStep2Tab('assistant')}
                    className={`text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1 border ${
                      activeStep2Tab === 'assistant'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                    <span>AI Assistant</span>
                  </button>
                </div>
              </div>

              {/* AI Creative Assistant Modal / Panel */}
              {activeStep2Tab === 'assistant' && (
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="material-symbols-outlined text-purple-700">psychology</span>
                      <h3 className="text-sm font-bold text-purple-950">AI Creative Assistant</h3>
                    </div>
                    <button
                      onClick={() => setActiveStep2Tab('ad1')}
                      className="text-xs text-purple-700 hover:text-purple-900 font-semibold"
                    >
                      Close
                    </button>
                  </div>
                  <p className="text-xs text-purple-800">
                    Describe your product or service. Our assistant will generate policy-checked headlines, short descriptions, and relevance context hints.
                  </p>

                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={aiProductDesc}
                      onChange={(e) => setAiProductDesc(e.target.value)}
                      placeholder="e.g. Offer18 is a performance tracking platform helping affiliate networks track, automate, and scale affiliate campaigns with 24/7 dedicated support..."
                      className="w-full text-xs p-3 rounded-lg border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleRunAiAssistant}
                        disabled={aiLoading}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center space-x-1"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {aiLoading ? 'sync' : 'auto_awesome'}
                        </span>
                        <span>{aiLoading ? 'Analyzing...' : 'Generate Creatives'}</span>
                      </button>
                    </div>
                  </div>

                  {aiSuggestions && (
                    <div className="mt-4 pt-4 border-t border-purple-200/60 space-y-4 bg-white/70 p-4 rounded-lg">
                      {/* Policy scan notice */}
                      <div
                        className={`text-xs p-2.5 rounded-lg flex items-center space-x-2 ${
                          aiSuggestions.complianceCheck.isCompliant
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {aiSuggestions.complianceCheck.isCompliant ? 'verified' : 'warning'}
                        </span>
                        <span>{aiSuggestions.complianceCheck.summary}</span>
                      </div>

                      {/* Headline options */}
                      <div>
                        <div className="text-xs font-semibold text-gray-700 mb-1">Recommended Headlines (Click to apply):</div>
                        <div className="space-y-1">
                          {aiSuggestions.headlines.map((hl: string, i: number) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setHeadline(hl);
                                setActiveStep2Tab('ad1');
                              }}
                              className="text-left w-full text-xs p-2 rounded bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-100"
                            >
                              {hl}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Description options */}
                      <div>
                        <div className="text-xs font-semibold text-gray-700 mb-1">Recommended Descriptions (Click to apply):</div>
                        <div className="space-y-1">
                          {aiSuggestions.descriptions.map((desc: string, i: number) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setAdDescription(desc);
                                setActiveStep2Tab('ad1');
                              }}
                              className="text-left w-full text-xs p-2 rounded bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-100"
                            >
                              {desc}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-Tabs: Ad Group vs Ad 1 */}
              <div className="flex border-b border-gray-200">
                <button
                  type="button"
                  onClick={() => setActiveStep2Tab('adgroup')}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                    activeStep2Tab === 'adgroup'
                      ? 'border-purple-600 text-purple-700'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Ad Group Configuration
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep2Tab('ad1')}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                    activeStep2Tab === 'ad1'
                      ? 'border-purple-600 text-purple-700'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Ad 1 (Creative & Preview)
                </button>
              </div>

              {/* AD GROUP CONFIG TAB */}
              {activeStep2Tab === 'adgroup' && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
                      Ad Group Name
                    </label>
                    <input
                      type="text"
                      value={adGroupName}
                      onChange={(e) => setAdGroupName(e.target.value)}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                      Context hints (Comma separated)
                    </label>
                    <p className="text-[11px] text-gray-500 mb-2">
                      Descriptive relevance guidance for contextual ad placement. OpenAI does not support exact-match prompt triggers.
                    </p>
                    <textarea
                      rows={2}
                      value={contextHintsInput}
                      onChange={(e) => setContextHintsInput(e.target.value)}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm font-mono text-xs"
                      placeholder="e.g. affiliate marketing, SaaS tracking, conversion attribution"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
                        Bid Strategy
                      </label>
                      <select
                        value={bidStrategy}
                        onChange={(e) => setBidStrategy(e.target.value)}
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                      >
                        <option value="LOWEST_COST">Lowest cost (Automatic max results)</option>
                        <option value="COST_CAP">Cost cap (Target cost per event)</option>
                        <option value="BID_CAP">Bid cap (Maximum bid limit)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
                        Max Bid ({currency}, Optional)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={maxBidAmount}
                        onChange={(e) => setMaxBidAmount(e.target.value)}
                        placeholder="Leave blank for automatic"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* AD 1 CREATIVE TAB */}
              {activeStep2Tab === 'ad1' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Form Fields */}
                  <div className="lg:col-span-7 bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Brand Name</label>
                        <input
                          type="text"
                          value={brandName}
                          onChange={(e) => setBrandName(e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                          placeholder="Offer18"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Favicon / Logo URL</label>
                        <input
                          type="url"
                          value={faviconUrl}
                          onChange={(e) => setFaviconUrl(e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                          placeholder="https://..."
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-gray-700">Headline</label>
                        <span className={`text-[10px] ${headline.length > 60 ? 'text-rose-600 font-bold' : 'text-gray-400'}`}>
                          {headline.length}/60 chars
                        </span>
                      </div>
                      <input
                        type="text"
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        className={`w-full px-3 py-1.5 border rounded-lg text-xs ${
                          headline.length > 60 ? 'border-rose-500' : 'border-gray-300'
                        }`}
                        placeholder="Manage Affiliate Networks"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-gray-700">Description</label>
                        <span className={`text-[10px] ${adDescription.length > 120 ? 'text-rose-600 font-bold' : 'text-gray-400'}`}>
                          {adDescription.length}/120 chars
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        value={adDescription}
                        onChange={(e) => setAdDescription(e.target.value)}
                        className={`w-full px-3 py-1.5 border rounded-lg text-xs ${
                          adDescription.length > 120 ? 'border-rose-500' : 'border-gray-300'
                        }`}
                        placeholder="Manage affiliates, offers and commissions. 14 Days Free Trial."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Creative Image URL</label>
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                        placeholder="https://..."
                      />
                      <p className="text-[10px] text-gray-400 mt-1">
                        Recommended: 1200x628 landscape or 1080x1080 square JPG/PNG. Max 5MB.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">UTM Tracking Parameters</label>
                      <input
                        type="text"
                        value={utmParams}
                        onChange={(e) => setUtmParams(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-mono"
                        placeholder="utm_source=chatgpt&utm_medium=sponsored_card"
                      />
                    </div>
                  </div>

                  {/* Right Column: Live ChatGPT Native Ad Preview (as seen in Screenshot 1) */}
                  <div className="lg:col-span-5 bg-neutral-900 text-white rounded-xl p-5 flex flex-col justify-between shadow-lg">
                    <div>
                      <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
                        <div className="flex items-center space-x-1.5">
                          <span className="material-symbols-outlined text-xs text-neutral-400">visibility</span>
                          <span className="text-[11px] font-semibold text-neutral-300">ChatGPT Native Ad Preview</span>
                        </div>
                        <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded">
                          Dark Mode
                        </span>
                      </div>

                      <div className="text-[11px] text-neutral-400 mb-2 font-medium">
                        This might also interest you.
                      </div>

                      {/* Native Sponsored Card Container */}
                      <div className="bg-[#1f1f23] border border-neutral-700/60 rounded-xl p-4 flex items-start space-x-4 transition-all">
                        {/* Image Thumbnail */}
                        <div className="w-24 h-24 rounded-lg bg-neutral-800 overflow-hidden flex-shrink-0 relative border border-neutral-700">
                          {imageUrl ? (
                            <img src={imageUrl} alt={headline} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-500 text-[10px]">
                              No image
                            </div>
                          )}
                        </div>

                        {/* Text Block */}
                        <div className="flex-1 min-w-0">
                          {/* Brand row with favicon & Ad pill */}
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-1.5 truncate">
                              {faviconUrl && (
                                <img src={faviconUrl} alt={brandName} className="w-3.5 h-3.5 rounded-full" />
                              )}
                              <span className="text-xs font-semibold text-neutral-200 truncate">
                                {brandName || 'Brand'}
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold bg-neutral-700/80 text-neutral-300 px-1.5 py-0.2 rounded">
                              Ad
                            </span>
                          </div>

                          {/* Headline */}
                          <div className="text-xs font-bold text-white truncate mb-1">
                            {headline || 'Headline placeholder'}
                          </div>

                          {/* Description */}
                          <div className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed mb-2">
                            {adDescription || 'Description placeholder'}
                          </div>

                          {/* Action link */}
                          <div className="flex items-center space-x-1 text-xs text-neutral-200 hover:text-white underline font-medium">
                            <span>Learn more</span>
                            <span className="material-symbols-outlined text-[10px]">arrow_outward</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-neutral-500 mt-4 border-t border-neutral-800 pt-2">
                      Card renders underneath assistant responses for matching conversational context.
                    </div>
                  </div>
                </div>
              )}

              {/* Step Navigation Bar */}
              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  <span>Back: Campaign details</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm px-6 py-2.5 rounded-lg shadow-sm transition-colors flex items-center space-x-2"
                >
                  <span>Next: Review & Submit</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW AND SUBMIT (Matching Screenshot 4) */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-bold text-gray-900">Campaign summary</h1>
                  <span className="bg-purple-100 text-purple-700 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center space-x-1">
                    <span className="material-symbols-outlined text-xs">auto_awesome</span>
                    <span>AI generated</span>
                  </span>
                </div>
                <button
                  onClick={() => setCurrentStep(1)}
                  className="text-xs text-gray-600 hover:text-gray-900 font-medium px-3 py-1.5 border border-gray-300 rounded-full"
                >
                  Create from scratch
                </button>
              </div>

              {/* Error notice if fields missing */}
              {!isAdValid && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex items-center space-x-3 text-xs">
                  <span className="material-symbols-outlined text-rose-600">error</span>
                  <span>Fix issues in Ad &quot;Ad 1&quot; before moving to review. (Headline &lt;= 60 chars, Description &lt;= 120 chars, valid Image).</span>
                </div>
              )}

              {submissionError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-xs">
                  {submissionError}
                </div>
              )}

              {/* Successful creation banner */}
              {createdResult && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-6 text-emerald-900 space-y-4">
                  <div className="flex items-center space-x-3">
                    <span className="material-symbols-outlined text-2xl text-emerald-600">check_circle</span>
                    <div>
                      <h3 className="font-bold text-base">Campaign Successfully Created in OpenAI Ads Manager!</h3>
                      <p className="text-xs text-emerald-700">
                        In accordance with OpenAI policy, the campaign, ad groups, and ads have been created in <span className="font-bold uppercase">PAUSED</span> state.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/80 border border-emerald-200 rounded-lg p-3 text-xs font-mono space-y-1">
                    <div>OpenAI Campaign ID: {createdResult.campaign?.id}</div>
                    <div>Account Status: {createdResult.account?.status}</div>
                    <div>Mode: {createdResult.account?.isSandbox ? 'Sandbox Simulation' : 'Live Production API'}</div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleActivateCampaign(createdResult.campaign?.id)}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs px-4 py-2 rounded-lg"
                    >
                      Activate Campaign Now
                    </button>
                    <Link
                      href="/advertiser/chatgpt-ads"
                      className="text-xs font-semibold text-emerald-800 underline"
                    >
                      Go to ChatGPT Ads Manager Dashboard
                    </Link>
                  </div>
                </div>
              )}

              {/* Structured Summary Card (Screenshot 4 exact layout) */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Campaign name</div>
                    <div className="text-base font-bold text-gray-900 mt-0.5">{campaignName}</div>
                  </div>
                  <button onClick={() => setCurrentStep(1)} className="text-gray-400 hover:text-gray-700">
                    <span className="material-symbols-outlined text-base">edit</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6 border-t border-gray-100 pt-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Campaign type</div>
                    <div className="text-sm font-medium text-gray-900 mt-0.5">Standard</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Objective</div>
                    <div className="text-sm font-medium text-gray-900 mt-0.5 capitalize">{objective}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 border-t border-gray-100 pt-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Locations for this campaign</div>
                    <div className="text-sm font-medium text-gray-900 mt-0.5">{locations}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Eligible platforms</div>
                    <div className="text-sm font-medium text-gray-900 mt-0.5">{platforms.join(', ')}</div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Average daily budget</div>
                  <div className="text-lg font-bold text-gray-900 mt-0.5">₹{parseFloat(budgetAmount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  <div className="text-[11px] text-gray-400">Currency: {currency} • Integer micros: {(parseFloat(budgetAmount || '0') * 1_000_000).toLocaleString()}</div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                    <span>Creative enhancement</span>
                    <span className="material-symbols-outlined text-xs text-purple-600">auto_awesome</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                    <div><span className="font-semibold text-gray-700">Headline:</span> {headline}</div>
                    <div><span className="font-semibold text-gray-700">Description:</span> {adDescription}</div>
                    <div><span className="font-semibold text-gray-700">Context hints:</span> {contextHintsInput}</div>
                    <div><span className="font-semibold text-gray-700">Landing URL:</span> {landingPageUrl}</div>
                  </div>
                </div>
              </div>

              {/* Policy acknowledgment & confirmation checkbox */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={complianceAcknowledged}
                  onChange={(e) => setComplianceAcknowledged(e.target.checked)}
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="agreeTerms" className="text-xs text-gray-700 leading-relaxed cursor-pointer">
                  I confirm that all ad creatives comply with OpenAI Advertising Policies and ASCI guidelines. I understand that AdEarn creates campaigns via the OpenAI Advertiser API in a paused state and that ChatGPT native ad delivery is controlled exclusively by OpenAI.
                </label>
              </div>

              {/* Footer Action Bar (Screenshot 4 exact layout) */}
              <div className="flex items-center justify-between border-t border-gray-200 pt-6">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-xs px-5 py-2 rounded-full transition-colors"
                >
                  Back
                </button>

                <div className="text-xs text-gray-500 text-center">
                  By clicking &quot;Publish&quot;, you agree to the{' '}
                  <a
                    href="https://openai.com/policies/advertising-terms/"
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-gray-700 hover:text-black font-medium"
                  >
                    Advertising Tool Terms
                  </a>
                  .
                </div>

                <button
                  type="button"
                  disabled={isSubmitting || !isAdValid || !complianceAcknowledged}
                  onClick={handlePublish}
                  className={`font-semibold text-xs px-6 py-2 rounded-full shadow-sm transition-all ${
                    isSubmitting || !isAdValid || !complianceAcknowledged
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-black hover:bg-neutral-800 text-white'
                  }`}
                >
                  {isSubmitting ? 'Submitting to OpenAI...' : 'Publish'}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
