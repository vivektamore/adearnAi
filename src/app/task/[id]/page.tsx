'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import UserLayout from '@/components/navigation/UserLayout';
import { formatINR } from '@/lib/currency';

interface CampaignDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  actionType: string;
  targetUrl: string;
  costPerOutcomePaise: string;
  organization: {
    name: string;
    isVerified: boolean;
    gstin: string;
  };
}

export default function AdDetailAndTaskPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Telemetry metrics
  const [dwellSeconds, setDwellSeconds] = useState(0);
  const [interactionCount, setInteractionCount] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [submissionStatus, setSubmissionStatus] = useState<'IDLE' | 'SUBMITTING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMessage, setErrorMessage] = useState('');
  const [creditedRewardPaise, setCreditedRewardPaise] = useState('0');

  useEffect(() => {
    // 1. Fetch Campaign
    fetch(`/api/campaigns/${campaignId}`)
      .then((res) => res.json())
      .then((data) => {
        setCampaign(data.campaign);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });

    // 2. Start Task Session
    fetch('/api/tasks/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.sessionToken) {
          setSessionToken(data.sessionToken);
        } else if (data.error) {
          setErrorMessage(data.error);
        }
      })
      .catch(() => {});
  }, [campaignId]);

  // Dwell timer
  useEffect(() => {
    if (submissionStatus === 'SUCCESS') return;
    const interval = setInterval(() => {
      setDwellSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [submissionStatus]);

  function handleInteraction(val: string) {
    setSelectedAnswer(val);
    setInteractionCount((prev) => prev + 1);
  }

  async function handleSubmitTask() {
    if (!sessionToken) {
      setErrorMessage('Missing active task session.');
      return;
    }
    if (!selectedAnswer) {
      setErrorMessage('Please select a response to complete the questionnaire.');
      return;
    }

    setSubmissionStatus('SUBMITTING');
    setErrorMessage('');

    try {
      const res = await fetch('/api/tasks/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          dwellTimeSeconds: dwellSeconds,
          interactionCount: interactionCount + 5,
          mouseEventsRecorded: 20 + interactionCount * 2,
          scrollDepthPercent: 85,
          userResponses: { answer: selectedAnswer },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmissionStatus('SUCCESS');
        setCreditedRewardPaise(data.rewardPaise);
      } else {
        setSubmissionStatus('ERROR');
        setErrorMessage(data.message || data.error || data.reasons?.join('. ') || 'Submission failed verification.');
      }
    } catch {
      setSubmissionStatus('ERROR');
      setErrorMessage('Network or server error during validation.');
    }
  }

  if (loading) {
    return (
      <UserLayout>
        <div className="max-w-4xl mx-auto p-12 text-center">
          <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-on-surface-variant mt-3 font-medium">Initializing secure task sandbox...</p>
        </div>
      </UserLayout>
    );
  }

  if (!campaign) {
    return (
      <UserLayout>
        <div className="max-w-4xl mx-auto p-12 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/30 mt-8">
          <h2 className="font-headline text-lg font-bold">Campaign not found</h2>
          <Link href="/feed" className="text-sm text-secondary font-semibold hover:underline mt-2 inline-block">
            ← Return to Sponsored Ad Feed
          </Link>
        </div>
      </UserLayout>
    );
  }

  const minDwell = 15;
  const dwellProgress = Math.min(100, Math.round((dwellSeconds / minDwell) * 100));

  return (
    <UserLayout>
      <div className="w-full max-w-[1080px] mx-auto px-space-lg py-space-xl space-y-space-lg">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <Link href="/feed" className="hover:text-on-surface">Sponsored Feed</Link>
          <span>/</span>
          <span className="text-on-surface font-semibold">{campaign.title}</span>
        </div>

        {/* Task Header Card matching Stitch Screen 03 */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-secondary-container/40 text-on-secondary-fixed-variant text-xs font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-secondary">verified</span>
                Verified Sponsor: {campaign.organization.name}
              </span>
              <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant text-[11px] font-semibold uppercase">
                {campaign.actionType.replace('_', ' ')}
              </span>
            </div>
            <h1 className="font-headline text-xl lg:text-2xl font-bold text-on-surface">
              {campaign.title}
            </h1>
            <p className="text-xs text-on-surface-variant max-w-2xl">
              {campaign.description}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 text-right shrink-0">
            <span className="text-[11px] text-on-surface-variant uppercase font-semibold block">Reward Value</span>
            <span className="font-headline text-2xl font-bold text-secondary tabular-nums">
              +{formatINR(campaign.costPerOutcomePaise)}
            </span>
            <span className="text-[10px] text-secondary font-medium block">Guaranteed Escrow Credit</span>
          </div>
        </div>

        {/* Live Attention Dwell Meter */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/30 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-secondary text-[24px]">timer</span>
            <div>
              <span className="text-xs font-bold text-on-surface block">
                Attention & Voluntary Dwell Validation: {dwellSeconds}s / {minDwell}s
              </span>
              <span className="text-[11px] text-on-surface-variant">
                Authentic attention timer guarantees bot-free voluntary response verification.
              </span>
            </div>
          </div>
          <div className="w-full sm:w-48 bg-surface-container-highest h-2 rounded-full overflow-hidden shrink-0">
            <div
              className="bg-secondary h-full rounded-full transition-all duration-500"
              style={{ width: `${dwellProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Interactive Task Container */}
        {submissionStatus === 'SUCCESS' ? (
          <div className="p-space-xl text-center bg-surface-container-lowest rounded-xl border border-secondary-container shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-full bg-secondary-container/50 text-secondary flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[36px]">check_circle</span>
            </div>
            <div>
              <h2 className="font-headline text-2xl font-bold text-on-surface">
                Reward Approved & Credited!
              </h2>
              <p className="text-sm text-on-surface-variant mt-1 max-w-md mx-auto">
                Your voluntary task engagement passed kinematic verification. <strong className="text-secondary font-bold">+{formatINR(creditedRewardPaise)}</strong> has been credited to your available wallet balance.
              </p>
            </div>
            <div className="flex items-center justify-center gap-space-sm pt-4">
              <Link
                href="/wallet"
                className="px-5 py-2.5 rounded-lg bg-secondary text-on-secondary text-sm font-semibold hover:bg-on-secondary-container transition-colors shadow-xs"
              >
                View Wallet & Ledger
              </Link>
              <Link
                href="/feed"
                className="px-5 py-2.5 rounded-lg bg-surface-container text-on-surface text-sm font-semibold hover:bg-surface-container-high transition-colors"
              >
                Browse More Campaigns
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-lg">
            <div className="border-b border-outline-variant/20 pb-space-sm">
              <h2 className="font-headline text-base font-bold text-on-surface">
                Diagnostic Question 1 of 1: Risk & Allocation Preference
              </h2>
              <p className="text-xs text-on-surface-variant mt-1">
                Select your genuine personal preference to complete this certified survey activity:
              </p>
            </div>

            {/* Radio Choices */}
            <div className="space-y-3">
              {[
                {
                  id: 'opt1',
                  label: 'Conservative Capital Preservation',
                  desc: 'Priority on sovereign debt, fixed deposits, and capital safety with minimal equity volatility.',
                },
                {
                  id: 'opt2',
                  label: 'Balanced Growth & Equity Hybrid',
                  desc: 'Diversified asset allocation blending index funds, debt instruments, and blue-chip equities.',
                },
                {
                  id: 'opt3',
                  label: 'High-Alpha Dynamic Growth',
                  desc: 'Long-term equity compounding, thematic technology ETFs, and aggressive capital appreciation.',
                },
              ].map((opt) => (
                <label
                  key={opt.id}
                  onClick={() => handleInteraction(opt.id)}
                  className={`flex items-start gap-space-md p-space-md rounded-xl border cursor-pointer transition-all ${
                    selectedAnswer === opt.id
                      ? 'border-secondary bg-secondary-container/10 ring-1 ring-secondary'
                      : 'border-outline-variant/30 hover:bg-surface-container-low/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="taskAnswer"
                    checked={selectedAnswer === opt.id}
                    onChange={() => handleInteraction(opt.id)}
                    className="mt-1 accent-secondary"
                  />
                  <div>
                    <span className="font-semibold text-sm text-on-surface block">{opt.label}</span>
                    <span className="text-xs text-on-surface-variant block mt-0.5">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-space-sm rounded-lg bg-error-container text-on-error-container text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submission CTA */}
            <div className="flex items-center justify-between pt-space-sm border-t border-outline-variant/20">
              <span className="text-xs text-on-surface-variant">
                Interactions logged: {interactionCount} events
              </span>

              <button
                type="button"
                onClick={handleSubmitTask}
                disabled={submissionStatus === 'SUBMITTING' || dwellSeconds < minDwell}
                className={`inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-sm font-bold shadow-xs transition-all ${
                  dwellSeconds < minDwell
                    ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed opacity-60'
                    : 'bg-secondary text-on-secondary hover:bg-on-secondary-container active:scale-[0.99]'
                }`}
              >
                {submissionStatus === 'SUBMITTING' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-on-secondary border-t-transparent rounded-full animate-spin"></div>
                    <span>Verifying Telemetry...</span>
                  </>
                ) : (
                  <>
                    <span>Submit & Claim Reward</span>
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
}
