'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdvertiserLayout from '@/components/navigation/AdvertiserLayout';
import { formatINR } from '@/lib/currency';

export default function UnifiedCampaignCreationWizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [escrowBalancePaise, setEscrowBalancePaise] = useState<bigint | number>(0);

  // Core Form States
  const [title, setTitle] = useState('');
  const [brandName, setBrandName] = useState('Fintect');
  const [faviconUrl, setFaviconUrl] = useState('https://api.dicebear.com/7.x/identicon/svg?seed=fintect');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('FinTech');
  const [targetUrl, setTargetUrl] = useState('https://fintech.ai');
  const [assetUrl, setAssetUrl] = useState('https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80');
  const [contextHintsInput, setContextHintsInput] = useState('fintech solutions, accounting automation, business banking');

  // Distribution Channels: OMNICHANNEL by default, or individual
  const [selectedChannel, setSelectedChannel] = useState<'OMNICHANNEL' | 'OPENAI_CHATGPT' | 'ADEARN_EXTENSION'>('OMNICHANNEL');

  // Budget in Indian Rupees (INR)
  const [budgetAllocatedRupees, setBudgetAllocatedRupees] = useState('2000');
  const [pricingModel, setPricingModel] = useState<'CPO' | 'CPC' | 'CPM'>('CPC');
  const [costPerOutcomeRupees, setCostPerOutcomeRupees] = useState('2.50');
  const [policyDeclared, setPolicyDeclared] = useState(true);

  // AI Assistant States
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  // Submission States
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetch('/api/advertiser/overview')
      .then((res) => res.json())
      .then((data) => {
        if (data?.metrics?.escrowBalancePaise !== undefined) {
          setEscrowBalancePaise(data.metrics.escrowBalancePaise);
        }
        if (data?.organization?.name) {
          setBrandName(data.organization.name);
        }
      })
      .catch(() => {});
  }, []);

  // Run AI Creative Assistant
  async function handleAiGenerate() {
    if (!aiPrompt.trim()) {
      setErrorMessage('Please type a brief summary of what you are promoting.');
      return;
    }

    setAiLoading(true);
    setErrorMessage('');
    setAiNotice(null);

    try {
      const res = await fetch('/api/advertiser/openai/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName,
          productDescription: aiPrompt,
          landingPageUrl: targetUrl,
          category,
          objective: pricingModel === 'CPM' ? 'impressions' : 'clicks',
        }),
      });

      const data = await res.json();
      if (res.ok && data.creativeAssistant) {
        const ca = data.creativeAssistant;
        setTitle(ca.headlines[0] || `${brandName} Promotional Campaign`);
        setHeadline(ca.headlines[0] || '');
        setDescription(ca.descriptions[0] || '');
        setContextHintsInput(ca.contextHints?.join(', ') || '');
        setAiNotice('AI generated optimized copy adhering to ASCI and OpenAI advertising policies.');
      } else {
        setErrorMessage(data.error || 'Failed to generate campaign with AI.');
      }
    } catch {
      setErrorMessage('Network error while generating with AI.');
    } finally {
      setAiLoading(false);
    }
  }

  // Submit Campaign for Admin Approval
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage('');

    if (!title || !description || !targetUrl) {
      setErrorMessage('Please fill in all mandatory fields before submitting.');
      setCurrentStep(1);
      setSubmitting(false);
      return;
    }

    if (!policyDeclared) {
      setErrorMessage('Please accept the ASCI & Advertising Terms compliance statement.');
      setSubmitting(false);
      return;
    }

    try {
      const contextHints = contextHintsInput
        .split(',')
        .map((h) => h.trim())
        .filter((h) => h.length > 0);

      const res = await fetch('/api/advertiser/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          channel: selectedChannel,
          headline: headline || title.slice(0, 60),
          brandName,
          faviconUrl,
          contextHints,
          targetUrl,
          assetUrl,
          budgetAllocatedRupees,
          pricingModel,
          cpcRateRupees: costPerOutcomeRupees,
          costPerOutcomeRupees,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert('Campaign submitted successfully! It is now in the Admin Moderation Queue for review and auto-deployment.');
        router.push('/advertiser/campaigns');
      } else {
        setErrorMessage(data.error || 'Campaign submission failed.');
      }
    } catch (err: any) {
      setErrorMessage('Network error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdvertiserLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-gray-900">Create Unified Campaign</h1>
              <span className="text-xs bg-purple-100 text-purple-900 font-bold px-2 py-0.5 rounded-full">
                Multi-Channel Middleware
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Submit your offer in INR. AdEarn AI structures the creatives, obtains admin approval, and autonomously deploys across ChatGPT AI conversations and the AdEarn extension network.
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 flex items-center space-x-2">
            <span className="material-symbols-outlined text-sm text-emerald-600">account_balance_wallet</span>
            <div className="text-xs">
              <span className="text-gray-500">Escrow Balance: </span>
              <span className="font-bold text-gray-900">{formatINR(BigInt(escrowBalancePaise))}</span>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`p-3 rounded-xl border text-left transition-colors ${
              currentStep === 1
                ? 'bg-purple-50 border-purple-300 text-purple-900'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="block text-[10px] uppercase text-gray-400 font-bold">Step 1</span>
            1. Offer & AI Copy
          </button>

          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className={`p-3 rounded-xl border text-left transition-colors ${
              currentStep === 2
                ? 'bg-purple-50 border-purple-300 text-purple-900'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="block text-[10px] uppercase text-gray-400 font-bold">Step 2</span>
            2. Channels & Budget
          </button>

          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            className={`p-3 rounded-xl border text-left transition-colors ${
              currentStep === 3
                ? 'bg-purple-50 border-purple-300 text-purple-900'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="block text-[10px] uppercase text-gray-400 font-bold">Step 3</span>
            3. Preview & Submit
          </button>
        </div>

        {/* Error / AI notices */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl flex items-center space-x-2">
            <span className="material-symbols-outlined text-sm text-rose-600">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {aiNotice && (
          <div className="bg-purple-50 border border-purple-200 text-purple-900 text-xs p-3 rounded-xl flex items-center space-x-2">
            <span className="material-symbols-outlined text-sm text-purple-600">auto_awesome</span>
            <span>{aiNotice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* STEP 1: OFFER & AI CREATIVE ASSISTANT */}
          {currentStep === 1 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6 shadow-sm">
              <div className="border-b border-gray-100 pb-4">
                <h3 className="text-base font-bold text-gray-900">What are you promoting?</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Type a quick prompt or paste your product link. Our AI will craft compliant copy for both ChatGPT sponsored cards and extension popups.
                </p>
              </div>

              {/* AI Generator Box */}
              <div className="bg-purple-50/60 border border-purple-200/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-purple-900">
                  <span className="material-symbols-outlined text-sm text-purple-700">psychology</span>
                  <span>AI Creative Generator</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g. Fintech AI platform offering automated tax filing, invoice reconciliation, and 14-day free trial..."
                    className="flex-1 px-3 py-2 border border-purple-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <button
                    type="button"
                    onClick={handleAiGenerate}
                    disabled={aiLoading}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center space-x-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {aiLoading ? 'sync' : 'auto_awesome'}
                    </span>
                    <span>{aiLoading ? 'Drafting...' : 'Generate Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Campaign Title (Internal)</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Fintech Q4 Growth"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Brand Name (Public)</label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-gray-700">Ad Headline</label>
                    <span className="text-[10px] text-gray-400">{headline.length}/60 chars</span>
                  </div>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. Automate Your Tax & Accounting"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
                    maxLength={60}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white"
                  >
                    <option value="FinTech">FinTech & Banking</option>
                    <option value="SaaS & Software">SaaS & Software</option>
                    <option value="E-Commerce">E-Commerce & Retail</option>
                    <option value="Education">Education & Courses</option>
                    <option value="Healthcare">Healthcare & Wellness</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-gray-700">Short Ad Description</label>
                  <span className="text-[10px] text-gray-400">{description.length}/120 chars</span>
                </div>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Experience seamless cloud accounting with instant reconciliation. Start your 14-day free trial."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
                  maxLength={120}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Landing Page URL (Destination)</label>
                  <input
                    type="url"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://yourbrand.com/landing"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Creative Banner / Image URL</label>
                  <input
                    type="url"
                    value={assetUrl}
                    onChange={(e) => setAssetUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  AI Context Relevance Hints (Comma separated)
                </label>
                <input
                  type="text"
                  value={contextHintsInput}
                  onChange={(e) => setContextHintsInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono text-gray-700"
                  placeholder="accounting, tax filing, invoice management"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Used by the backend to contextually position your ad below matching ChatGPT conversational answers.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg flex items-center space-x-1"
                >
                  <span>Next: Choose Channels & Budget</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CHANNELS & BUDGET */}
          {currentStep === 2 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6 shadow-sm">
              <div className="border-b border-gray-100 pb-4">
                <h3 className="text-base font-bold text-gray-900">Distribution Channels & Escrow Budget</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select where your advertisement should be distributed. All spending is funded directly from your verified INR escrow reserve.
                </p>
              </div>

              {/* Channel Selector Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  onClick={() => setSelectedChannel('OMNICHANNEL')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all space-y-2 ${
                    selectedChannel === 'OMNICHANNEL'
                      ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-purple-700 text-xl">hub</span>
                    <span className="text-[10px] bg-purple-200 text-purple-900 font-bold px-1.5 py-0.5 rounded">
                      Recommended
                    </span>
                  </div>
                  <div className="font-bold text-xs text-gray-900">Omnichannel (Max Reach)</div>
                  <p className="text-[11px] text-gray-500 leading-snug">
                    Deploys to both ChatGPT conversational responses and AdEarn verified extension user popups.
                  </p>
                </div>

                <div
                  onClick={() => setSelectedChannel('OPENAI_CHATGPT')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all space-y-2 ${
                    selectedChannel === 'OPENAI_CHATGPT'
                      ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-purple-700 text-xl">smart_toy</span>
                  <div className="font-bold text-xs text-gray-900">ChatGPT AI Only</div>
                  <p className="text-[11px] text-gray-500 leading-snug">
                    Native sponsored cards rendered directly underneath relevant user answers inside ChatGPT.
                  </p>
                </div>

                <div
                  onClick={() => setSelectedChannel('ADEARN_EXTENSION')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all space-y-2 ${
                    selectedChannel === 'ADEARN_EXTENSION'
                      ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-blue-700 text-xl">extension</span>
                  <div className="font-bold text-xs text-gray-900">Extension Network Only</div>
                  <p className="text-[11px] text-gray-500 leading-snug">
                    Verified browser popup inventory with IVT protection and optional voluntary creator reward tasks.
                  </p>
                </div>
              </div>

              {/* Budget Configuration */}
              <div className="border-t border-gray-100 pt-5 space-y-4">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Campaign Budget</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Total Allocated Budget (INR ₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500 text-xs">₹</span>
                      <input
                        type="number"
                        min="500"
                        value={budgetAllocatedRupees}
                        onChange={(e) => setBudgetAllocatedRupees(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900"
                        required
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Reserved safely in your nodal escrow balance upon submission.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Target Cost Per Click (CPC ₹)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500 text-xs">₹</span>
                      <input
                        type="number"
                        step="0.10"
                        value={costPerOutcomeRupees}
                        onChange={(e) => setCostPerOutcomeRupees(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-xs px-5 py-2.5 rounded-lg"
                >
                  Back: Offer & Copy
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg flex items-center space-x-1"
                >
                  <span>Next: Preview & Submit</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: DUAL LIVE PREVIEW & SUBMIT */}
          {currentStep === 3 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6 shadow-sm">
              <div className="border-b border-gray-100 pb-4">
                <h3 className="text-base font-bold text-gray-900">Review & Dual Channel Preview</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Confirm how your advertisement renders on both channels before submitting for admin moderation approval.
                </p>
              </div>

              {/* Previews Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Preview 1: ChatGPT Native Card Preview */}
                <div className="bg-neutral-900 text-white rounded-xl p-4 shadow-sm border border-neutral-800 space-y-3">
                  <div className="text-[10px] text-neutral-400 font-semibold flex justify-between items-center border-b border-neutral-800 pb-2">
                    <span className="flex items-center space-x-1">
                      <span className="material-symbols-outlined text-xs">smart_toy</span>
                      <span>ChatGPT Native Delivery Preview</span>
                    </span>
                    <span className="bg-neutral-800 text-neutral-300 px-1.5 py-0.2 rounded text-[9px]">Dark Mode</span>
                  </div>

                  <div className="text-[11px] text-neutral-400 font-medium">This might also interest you.</div>

                  <div className="bg-[#1f1f23] border border-neutral-700/60 rounded-xl p-3 flex items-start space-x-3">
                    <div className="w-16 h-16 rounded-lg bg-neutral-800 overflow-hidden flex-shrink-0 border border-neutral-700">
                      <img src={assetUrl} alt={title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-semibold text-neutral-200 truncate">{brandName}</span>
                        <span className="text-[9px] font-bold bg-neutral-700 text-neutral-300 px-1 py-0.2 rounded">Ad</span>
                      </div>
                      <div className="text-xs font-bold text-white truncate">{headline || title}</div>
                      <div className="text-[10px] text-neutral-400 line-clamp-2 mt-0.5 leading-snug">{description}</div>
                      <div className="text-[10px] text-neutral-300 underline font-semibold mt-1">Learn more ↗</div>
                    </div>
                  </div>
                </div>

                {/* Preview 2: AdEarn Extension Card Preview */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                  <div className="text-[10px] text-gray-500 font-semibold flex justify-between items-center border-b border-gray-200 pb-2">
                    <span className="flex items-center space-x-1">
                      <span className="material-symbols-outlined text-xs text-blue-600">extension</span>
                      <span>AdEarn Extension Popup Preview</span>
                    </span>
                    <span className="bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded text-[9px] font-bold">Popup Unit</span>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center space-x-3 shadow-xs">
                    <img src={assetUrl} alt={title} className="w-14 h-14 rounded-lg object-cover border border-gray-100" />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">{category}</span>
                      <div className="text-xs font-bold text-gray-900 truncate">{headline || title}</div>
                      <div className="text-[10px] text-gray-500 line-clamp-1">{description}</div>
                      <div className="text-[10px] text-purple-700 font-semibold mt-0.5">Visit Sponsor ↗</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Strip */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-xs space-y-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <span className="text-gray-500 text-[10px] uppercase font-bold block">Allocated Budget:</span>
                    <span className="font-bold text-gray-900">₹{parseFloat(budgetAllocatedRupees || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] uppercase font-bold block">Selected Channel:</span>
                    <span className="font-bold text-purple-900">{selectedChannel}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] uppercase font-bold block">Destination:</span>
                    <span className="font-mono text-gray-700 text-[11px] truncate block">{targetUrl}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] uppercase font-bold block">Approval Status:</span>
                    <span className="bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded text-[10px]">
                      Pending Review
                    </span>
                  </div>
                </div>
              </div>

              {/* Policy Checkbox */}
              <div className="flex items-start space-x-2.5 text-xs text-gray-700 pt-2">
                <input
                  type="checkbox"
                  id="policy"
                  checked={policyDeclared}
                  onChange={(e) => setPolicyDeclared(e.target.checked)}
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="policy" className="cursor-pointer leading-relaxed text-[11px]">
                  I confirm that all ad creatives comply with ASCI Guidelines and OpenAI Advertising Policies. I acknowledge that campaign budget will be locked in domestic escrow upon submission and deployed autonomously upon administrator moderation approval.
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-xs px-5 py-2.5 rounded-lg"
                >
                  Back: Channels & Budget
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-black hover:bg-neutral-800 text-white font-bold text-xs px-6 py-2.5 rounded-lg shadow-sm flex items-center space-x-2 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">
                    {submitting ? 'sync' : 'send'}
                  </span>
                  <span>{submitting ? 'Submitting Proposal...' : 'Submit Campaign for Approval'}</span>
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </AdvertiserLayout>
  );
}
