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
  const [budgetAllocatedRupees, setBudgetAllocatedRupees] = useState('50000');
  const [costPerOutcomeRupees, setCostPerOutcomeRupees] = useState('40');
  const [targetOutcomes, setTargetOutcomes] = useState('1250');
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
      const res = await fetch('/api/advertiser/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          actionType,
          targetUrl,
          budgetAllocatedRupees: parseFloat(budgetAllocatedRupees),
          costPerOutcomeRupees: parseFloat(costPerOutcomeRupees),
          targetOutcomes: parseInt(targetOutcomes, 10),
        }),
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

        {/* Wizard Header matching Stitch Screen 09 */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div>
            <h1 className="font-headline text-2xl font-bold text-on-surface">
              Campaign Creation & Escrow Allocation Wizard
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Deploy verified performance campaigns. Budget is securely reserved from your Nodal Escrow balance.
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
            1. Campaign Identity & Action
          </div>
          <div className={`p-2.5 rounded-lg border ${step === 2 ? 'bg-primary-container text-on-primary border-primary-container' : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant/30'}`}>
            2. Budget & Escrow Lock
          </div>
          <div className={`p-2.5 rounded-lg border ${step === 3 ? 'bg-primary-container text-on-primary border-primary-container' : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant/30'}`}>
            3. Regulatory Review & Launch
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs flex items-center gap-2 font-semibold">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Wizard Body Form */}
        <form onSubmit={handleCreateCampaign} className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-lg">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-headline text-base font-bold text-on-surface">Step 1: Campaign Details & Action Type</h2>
                <span className="text-[11px] text-secondary font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                  AI Assisted
                </span>
              </div>

              {/* AI / ChatGPT Generator Box */}
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

                {/* Quick 1-click inspiration chips */}
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
                  <label className="text-xs font-semibold text-on-surface">Activity Description</label>
                  <textarea
                    rows={3}
                    placeholder="Provide clear guidelines on the voluntary engagement expected from creators..."
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
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 rounded-lg bg-secondary text-on-secondary font-bold text-sm hover:bg-on-secondary-container transition-colors shadow-xs"
                >
                  Next: Budget & Escrow Lock →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-headline text-base font-bold text-on-surface">Step 2: Budget Allocation & Escrow Lock</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface">Total Budget (INR)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-sm font-bold text-on-surface-variant">₹</span>
                    <input
                      type="number"
                      min="5000"
                      value={budgetAllocatedRupees}
                      onChange={(e) => setBudgetAllocatedRupees(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-sm focus:border-secondary outline-none tabular-nums font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface">Cost Per Verified Outcome (CPO)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-sm font-bold text-on-surface-variant">₹</span>
                    <input
                      type="number"
                      min="10"
                      value={costPerOutcomeRupees}
                      onChange={(e) => setCostPerOutcomeRupees(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-sm focus:border-secondary outline-none tabular-nums font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface">Target Outcomes</label>
                  <input
                    type="number"
                    value={targetOutcomes}
                    onChange={(e) => setTargetOutcomes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-sm focus:border-secondary outline-none tabular-nums font-semibold"
                  />
                </div>
              </div>

              {/* Escrow Guarantee Notice */}
              <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">verified</span>
                  <span className="text-xs font-bold text-on-surface">RBI Nodal Escrow Lock Guarantee</span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  When launched, ₹{parseFloat(budgetAllocatedRupees || '0').toLocaleString('en-IN')} will be securely moved from your unreserved pool into this campaign&apos;s locked escrow register. Creators receive rewards solely upon authentic kinematic telemetry validation.
                </p>
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
              <h2 className="font-headline text-base font-bold text-on-surface">Step 3: ASCI Regulatory Policy & Launch</h2>

              <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policyDeclared}
                    onChange={(e) => setPolicyDeclared(e.target.checked)}
                    className="mt-0.5 accent-secondary"
                  />
                  <span className="text-xs text-on-surface font-medium">
                    <strong>Mandatory Advertiser Declaration:</strong> We certify that this campaign complies with ASCI (Advertising Standards Council of India) codes. This activity is voluntary, non-coercive, and contains no deceptive earnings guarantees.
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
