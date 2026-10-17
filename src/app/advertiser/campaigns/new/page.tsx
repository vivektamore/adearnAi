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
              <h2 className="font-headline text-base font-bold text-on-surface">Step 1: Campaign Details & Action Type</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
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
                    placeholder="https://zerodha.com/campaign-landing"
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
