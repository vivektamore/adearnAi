'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdvertiserLayout from '@/components/navigation/AdvertiserLayout';

export default function CampaignCreationWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('FinTech');
  const [actionType, setActionType] = useState('SURVEY');
  const [targetUrl, setTargetUrl] = useState('');
  const [assetUrl, setAssetUrl] = useState('https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80');

  // Pricing & Budget states
  const [pricingModel, setPricingModel] = useState<'CPO' | 'CPC' | 'CPM'>('CPO');
  const [budgetAllocatedRupees, setBudgetAllocatedRupees] = useState('5000');
  const [dailyBudgetCapRupees, setDailyBudgetCapRupees] = useState('1000');
  const [costPerOutcomeRupees, setCostPerOutcomeRupees] = useState('25');
  const [targetOutcomes, setTargetOutcomes] = useState('200');
  const [cpcRateRupees, setCpcRateRupees] = useState('2.50');
  const [creatorClickRewardRupees, setCreatorClickRewardRupees] = useState('1.25');
  const [cpmRateRupees, setCpmRateRupees] = useState('60');
  const [creatorImpressionRewardRupees, setCreatorImpressionRewardRupees] = useState('30');

  // Targeting & Rewards states
  const [rewardsEnabled, setRewardsEnabled] = useState(true);
  const [minKycTier, setMinKycTier] = useState('TIER_0');
  const [policyDeclared, setPolicyDeclared] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // AI / ChatGPT generation state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuccess, setAiSuccess] = useState(false);

  async function handleAiGenerate(customPrompt?: string) {
    const promptToUse = customPrompt || aiPrompt;
    if (!promptToUse.trim()) {
      setErrorMessage('Please type a product or brand idea to generate your campaign.');
      return;
    }

    setAiLoading(true);
    setErrorMessage('');
    setAiSuccess(false);

    try {
      const res = await fetch('/api/campaigns/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptToUse, category }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.campaign) {
        const c = data.campaign;
        setTitle(c.title || '');
        setDescription(c.description || '');
        if (c.category) setCategory(c.category);
        if (c.actionType) setActionType(c.actionType);
        if (c.targetUrl) setTargetUrl(c.targetUrl);
        if (c.recommendedCostPerOutcome) setCostPerOutcomeRupees(c.recommendedCostPerOutcome.toString());
        if (c.suggestedBudget) setBudgetAllocatedRupees(c.suggestedBudget.toString());
        if (c.targetOutcomes) setTargetOutcomes(c.targetOutcomes.toString());
        setAiSuccess(true);
      } else {
        setErrorMessage(data.error || 'Failed to auto-generate campaign with AI.');
      }
    } catch {
      setErrorMessage('Network error while generating with AI.');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !description || !targetUrl) {
      setErrorMessage('Please complete all mandatory campaign details.');
      return;
    }
    if (!policyDeclared) {
      setErrorMessage('You must confirm adherence to ASCI and Indian advertising regulations.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const payload: any = {
        title,
        description,
        category,
        actionType,
        pricingModel,
        targetUrl,
        assetUrl,
        budgetAllocatedRupees: parseFloat(budgetAllocatedRupees),
        rewardsEnabled,
        minKycTier,
      };

      if (dailyBudgetCapRupees) {
        payload.dailyBudgetCapRupees = parseFloat(dailyBudgetCapRupees);
      }

      if (pricingModel === 'CPO') {
        payload.costPerOutcomeRupees = parseFloat(costPerOutcomeRupees);
        payload.targetOutcomes = parseInt(targetOutcomes, 10) || 200;
      } else if (pricingModel === 'CPC') {
        payload.cpcRateRupees = parseFloat(cpcRateRupees);
        payload.creatorClickRewardRupees = parseFloat(creatorClickRewardRupees);
        payload.targetOutcomes = Math.floor(parseFloat(budgetAllocatedRupees) / parseFloat(cpcRateRupees));
      } else if (pricingModel === 'CPM') {
        payload.cpmRateRupees = parseFloat(cpmRateRupees);
        payload.creatorImpressionRewardRupees = parseFloat(creatorImpressionRewardRupees);
        payload.targetOutcomes = Math.floor((parseFloat(budgetAllocatedRupees) / parseFloat(cpmRateRupees)) * 1000);
      }

      const res = await fetch('/api/advertiser/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        router.push('/advertiser');
      } else {
        setErrorMessage(data.error || 'Failed to initialize campaign.');
      }
    } catch {
      setErrorMessage('Network error while deploying campaign.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdvertiserLayout>
      <div className="w-full max-w-[1080px] mx-auto px-space-lg py-space-xl space-y-space-lg">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <Link href="/advertiser" className="hover:text-on-surface">Advertiser Studio</Link>
          <span>/</span>
          <span className="text-on-surface font-semibold">New Campaign Wizard</span>
        </div>

        {/* Wizard Header */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div>
            <h1 className="font-headline text-2xl font-bold text-on-surface">
              Campaign Creation & Escrow Allocation Wizard
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Deploy verified advertising campaigns across CPM, CPC, or CPO pricing models with guaranteed partner bank escrow protection.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-secondary">
            <span className="material-symbols-outlined text-[18px]">verified_user</span>
            <span>ASCI / SEBI Validated Framework</span>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
          <div className={`p-2.5 rounded-lg border ${step === 1 ? 'bg-primary-container text-on-primary border-primary-container' : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant/30'}`}>
            1. Campaign Identity & Assets
          </div>
          <div className={`p-2.5 rounded-lg border ${step === 2 ? 'bg-primary-container text-on-primary border-primary-container' : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant/30'}`}>
            2. Pricing, Budgets & Targeting
          </div>
          <div className={`p-2.5 rounded-lg border ${step === 3 ? 'bg-primary-container text-on-primary border-primary-container' : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant/30'}`}>
            3. Regulatory Review & Launch
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-semibold">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMessage}</span>
            </div>
            {errorMessage.toLowerCase().includes('escrow') && (
              <Link
                href="/advertiser/billing"
                className="px-3 py-1 bg-on-error-container text-error-container rounded font-bold hover:opacity-90 shrink-0 text-center"
              >
                Top-Up Escrow &rarr;
              </Link>
            )}
          </div>
        )}

        {/* Wizard Body Form */}
        <form onSubmit={handleCreateCampaign} className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-lg">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-headline text-base font-bold text-on-surface">Step 1: Campaign Details & Creative Assets</h2>
                <span className="text-[11px] text-secondary font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                  AI Assisted
                </span>
              </div>

              {/* AI Generator Box */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-secondary-container/30 to-primary-container/20 border border-secondary/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-secondary text-on-secondary flex items-center justify-center shadow-xs">
                      <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-on-surface block">
                        Auto-Draft Campaign with ChatGPT & AI
                      </span>
                      <span className="text-[11px] text-on-surface-variant">
                        Type your product idea, app name, or website URL and AI will fill this wizard automatically.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g. AI-powered financial trading assistant with zero commission"
                    className="flex-1 px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-xs focus:border-secondary outline-none"
                    disabled={aiLoading}
                  />
                  <button
                    type="button"
                    onClick={() => handleAiGenerate()}
                    disabled={aiLoading}
                    className="px-4 py-2 rounded-lg bg-secondary text-on-secondary text-xs font-bold hover:bg-on-secondary-container transition-colors shadow-xs flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {aiLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-on-secondary border-t-transparent rounded-full animate-spin"></div>
                        <span>Drafting with AI...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                        <span>Generate with AI</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Quick inspiration chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-on-surface-variant font-semibold">Quick Ideas:</span>
                  {[
                    'ChatGPT SaaS Productivity Tool',
                    'Zero Brokerage FinTech App',
                    'D2C Organic Skincare Store',
                    'Solar Energy Green Initiative',
                  ].map((idea) => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() => {
                        setAiPrompt(idea);
                        handleAiGenerate(idea);
                      }}
                      className="px-2 py-0.5 rounded-md bg-surface text-[10px] font-medium text-on-surface hover:text-secondary border border-outline-variant/30 hover:border-secondary transition-colors"
                    >
                      {idea}
                    </button>
                  ))}
                </div>

                {aiSuccess && (
                  <div className="p-2 rounded-lg bg-secondary-container/40 text-secondary text-xs font-semibold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>Campaign drafted by AI! You can customize any field below or proceed to Step 2.</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-1">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-semibold text-on-surface">Campaign Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Sovereign Gold Bond & Equity Readiness Survey 2026"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-sm focus:border-secondary outline-none"
                    required
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-semibold text-on-surface">Activity Description / Ad Copy</label>
                  <textarea
                    rows={3}
                    placeholder="Provide clear guidelines on the value proposition and engagement expected from users..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-sm focus:border-secondary outline-none resize-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface">Category Vertical</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-sm focus:border-secondary outline-none"
                  >
                    <option value="FinTech">FinTech & Investment</option>
                    <option value="Enterprise SaaS">Enterprise SaaS & Productivity</option>
                    <option value="Digital Commerce">Digital Commerce & Retail</option>
                    <option value="Sustainability">ESG & Green Finance</option>
                    <option value="EdTech">EdTech & Upskilling</option>
                    <option value="Web3">Web3 & Decentralized Tools</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface">Action Verification Type</label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-sm focus:border-secondary outline-none"
                  >
                    <option value="SURVEY">Diagnostic Questionnaire (Survey)</option>
                    <option value="SANDBOX_TRIAL">Interactive Sandbox Trial</option>
                    <option value="APP_INSTALL">Application Trial & Exploration</option>
                    <option value="SENTIMENT_POLL">Public Sentiment Poll</option>
                    <option value="VIDEO_ATTENTION">High-Attention Brand Video</option>
                  </select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-semibold text-on-surface">Destination URL (SSL/HTTPS Only)</label>
                  <input
                    type="url"
                    placeholder="https://yourbrand.com/landing"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-sm focus:border-secondary outline-none font-mono"
                    required
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-semibold text-on-surface">Creative Banner / Asset Image URL</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={assetUrl}
                      onChange={(e) => setAssetUrl(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-xs focus:border-secondary outline-none font-mono"
                    />
                    {assetUrl && (
                      <div className="w-12 h-9 rounded border border-outline-variant/30 overflow-hidden shrink-0 bg-surface-container">
                        <img src={assetUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 rounded-lg bg-secondary text-on-secondary font-bold text-sm hover:bg-on-secondary-container transition-colors shadow-xs"
                >
                  Next: Pricing & Budgeting →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-headline text-base font-bold text-on-surface">Step 2: Pricing Model, Budget & Targeting</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Select your commercial billing model. Funds are held in partner bank escrow and disbursed upon validated delivery.
                </p>
              </div>

              {/* Pricing Model Selector Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div
                  onClick={() => setPricingModel('CPO')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    pricingModel === 'CPO'
                      ? 'border-secondary bg-secondary-container/20 shadow-xs'
                      : 'border-outline-variant/30 bg-surface-container-low hover:border-outline-variant'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-on-surface">CPO (Verified Outcomes)</span>
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${pricingModel === 'CPO' ? 'border-secondary bg-secondary' : 'border-outline-variant'}`}>
                      {pricingModel === 'CPO' && <span className="w-1.5 h-1.5 rounded-full bg-on-secondary"></span>}
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant">Pay only for audited cognitive task completions, trials, or high-intent forms.</p>
                </div>

                <div
                  onClick={() => setPricingModel('CPC')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    pricingModel === 'CPC'
                      ? 'border-secondary bg-secondary-container/20 shadow-xs'
                      : 'border-outline-variant/30 bg-surface-container-low hover:border-outline-variant'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-on-surface">CPC (Cost Per Click)</span>
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${pricingModel === 'CPC' ? 'border-secondary bg-secondary' : 'border-outline-variant'}`}>
                      {pricingModel === 'CPC' && <span className="w-1.5 h-1.5 rounded-full bg-on-secondary"></span>}
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant">Pay for verified extension clicks with signed telemetry and anti-bot validation.</p>
                </div>

                <div
                  onClick={() => setPricingModel('CPM')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    pricingModel === 'CPM'
                      ? 'border-secondary bg-secondary-container/20 shadow-xs'
                      : 'border-outline-variant/30 bg-surface-container-low hover:border-outline-variant'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-on-surface">CPM (Viewable Impressions)</span>
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${pricingModel === 'CPM' ? 'border-secondary bg-secondary' : 'border-outline-variant'}`}>
                      {pricingModel === 'CPM' && <span className="w-1.5 h-1.5 rounded-full bg-on-secondary"></span>}
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant">Pay per 1,000 IAB-compliant in-viewport impressions with verified dwell time.</p>
                </div>
              </div>

              {/* Dynamic Rates according to Pricing Model */}
              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-4">
                <span className="text-xs font-bold text-on-surface block">Commercial Rate Configuration</span>

                {pricingModel === 'CPO' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-on-surface">Cost Per Verified Outcome (₹)</label>
                      <input
                        type="number"
                        min="5"
                        step="1"
                        value={costPerOutcomeRupees}
                        onChange={(e) => setCostPerOutcomeRupees(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-sm font-semibold tabular-nums outline-none focus:border-secondary"
                      />
                      <span className="text-[10px] text-on-surface-variant">Minimum ₹5.00 per completed task</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-on-surface">Target Outcomes</label>
                      <input
                        type="number"
                        min="10"
                        value={targetOutcomes}
                        onChange={(e) => setTargetOutcomes(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-sm font-semibold tabular-nums outline-none focus:border-secondary"
                      />
                      <span className="text-[10px] text-on-surface-variant">Expected outcome volume for this flight</span>
                    </div>
                  </div>
                )}

                {pricingModel === 'CPC' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-on-surface">Advertiser Cost Per Click (₹)</label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.25"
                        value={cpcRateRupees}
                        onChange={(e) => setCpcRateRupees(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-sm font-semibold tabular-nums outline-none focus:border-secondary"
                      />
                      <span className="text-[10px] text-on-surface-variant">Charged per cryptographically signed click</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-on-surface">User Click Reward (₹)</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={creatorClickRewardRupees}
                        onChange={(e) => setCreatorClickRewardRupees(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-sm font-semibold tabular-nums outline-none focus:border-secondary"
                      />
                      <span className="text-[10px] text-on-surface-variant">Micro-reward allocated to participating user wallet</span>
                    </div>
                  </div>
                )}

                {pricingModel === 'CPM' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-on-surface">CPM Rate (₹ per 1,000 Impressions)</label>
                      <input
                        type="number"
                        min="20"
                        step="5"
                        value={cpmRateRupees}
                        onChange={(e) => setCpmRateRupees(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-sm font-semibold tabular-nums outline-none focus:border-secondary"
                      />
                      <span className="text-[10px] text-on-surface-variant">₹{(parseFloat(cpmRateRupees || '0') / 1000).toFixed(3)} per single verified view</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-on-surface">Creator Reward (₹ per 1,000 Views)</label>
                      <input
                        type="number"
                        min="5"
                        step="5"
                        value={creatorImpressionRewardRupees}
                        onChange={(e) => setCreatorImpressionRewardRupees(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-sm font-semibold tabular-nums outline-none focus:border-secondary"
                      />
                      <span className="text-[10px] text-on-surface-variant">Shared with creators meeting dwell criteria</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Budgets & Spending Limits */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface">Total Campaign Budget Allocation (INR)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-sm font-bold text-on-surface-variant">₹</span>
                    <input
                      type="number"
                      min="1000"
                      step="500"
                      value={budgetAllocatedRupees}
                      onChange={(e) => setBudgetAllocatedRupees(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-sm focus:border-secondary outline-none tabular-nums font-semibold"
                    />
                  </div>
                  <span className="text-[10px] text-on-surface-variant">Minimum ₹1,000. Reserved atomically from unreserved escrow balance</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface">Daily Spending Cap (Optional)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-sm font-bold text-on-surface-variant">₹</span>
                    <input
                      type="number"
                      min="100"
                      step="100"
                      value={dailyBudgetCapRupees}
                      onChange={(e) => setDailyBudgetCapRupees(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-sm focus:border-secondary outline-none tabular-nums font-semibold"
                    />
                  </div>
                  <span className="text-[10px] text-on-surface-variant">Paces campaign delivery across the flight window</span>
                </div>
              </div>

              {/* Targeting & Optional Rewards Settings */}
              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
                <span className="text-xs font-bold text-on-surface block">Audience Targeting & Reward Participation</span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-on-surface">User KYC Verification Requirement</label>
                    <select
                      value={minKycTier}
                      onChange={(e) => setMinKycTier(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-xs focus:border-secondary outline-none"
                    >
                      <option value="TIER_0">Tier 0 (Registered Extension Users)</option>
                      <option value="TIER_1">Tier 1 (Phone & Email Verified Only)</option>
                      <option value="TIER_2">Tier 2 (Government ID & Bank Verified)</option>
                    </select>
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rewardsEnabled}
                        onChange={(e) => setRewardsEnabled(e.target.checked)}
                        className="accent-secondary w-4 h-4 rounded"
                      />
                      <span className="text-xs text-on-surface font-medium">
                        Enable optional user reward payouts for this campaign
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-lg bg-surface-container text-on-surface text-xs font-semibold"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 rounded-lg bg-secondary text-on-secondary font-bold text-sm hover:bg-on-secondary-container transition-colors shadow-xs"
                >
                  Next: Regulatory Policy & Submit →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-headline text-base font-bold text-on-surface">Step 3: Review Breakdown & Policy Declaration</h2>

              {/* Summary Card */}
              <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                  <span className="text-xs font-bold text-on-surface">Campaign Commercial Summary</span>
                  <span className="px-2 py-0.5 rounded bg-secondary/15 text-secondary text-[11px] font-bold">
                    {pricingModel} Model
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-on-surface-variant block text-[10px]">Total Escrow Lock</span>
                    <span className="font-bold text-on-surface text-sm">₹{parseFloat(budgetAllocatedRupees || '0').toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block text-[10px]">Pricing Model</span>
                    <span className="font-bold text-on-surface">{pricingModel}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block text-[10px]">Daily Cap</span>
                    <span className="font-bold text-on-surface">₹{dailyBudgetCapRupees || 'None'}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block text-[10px]">Reward Payouts</span>
                    <span className="font-bold text-on-surface">{rewardsEnabled ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>
              </div>

              <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policyDeclared}
                    onChange={(e) => setPolicyDeclared(e.target.checked)}
                    className="mt-0.5 accent-secondary"
                  />
                  <span className="text-xs text-on-surface font-medium">
                    <strong>Mandatory Advertiser Declaration:</strong> We certify that this campaign complies with ASCI (Advertising Standards Council of India) codes and applicable digital advertising guidelines. This campaign is served exclusively within verified extension inventory surfaces without third-party website DOM injection.
                  </span>
                </label>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-lg bg-surface-container text-on-surface text-xs font-semibold"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-2.5 rounded-lg bg-secondary text-on-secondary font-bold text-sm hover:bg-on-secondary-container transition-colors shadow-xs flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-on-secondary border-t-transparent rounded-full animate-spin"></div>
                      <span>Locking Escrow & Launching...</span>
                    </>
                  ) : (
                    <>
                      <span>Lock Escrow & Deploy Campaign</span>
                      <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </AdvertiserLayout>
  );
}
