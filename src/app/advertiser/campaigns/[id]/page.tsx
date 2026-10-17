'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdvertiserLayout from '@/components/navigation/AdvertiserLayout';
import { formatINR } from '@/lib/currency';

export default function CampaignDetailTelemetryPage() {
  const params = useParams();
  const campaignId = params.id as string;
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/advertiser/campaigns/${campaignId}`)
      .then((res) => res.json())
      .then((data) => {
        setCampaign(data.campaign);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [campaignId]);

  async function handleToggleStatus() {
    if (!campaign) return;
    const nextStatus = campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const res = await fetch(`/api/advertiser/campaigns/${campaignId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      setCampaign({ ...campaign, status: nextStatus });
    }
  }

  if (loading) {
    return (
      <AdvertiserLayout>
        <div className="p-12 text-center text-sm text-on-surface-variant font-medium">
          Loading campaign live telemetry...
        </div>
      </AdvertiserLayout>
    );
  }

  if (!campaign) {
    return (
      <AdvertiserLayout>
        <div className="p-12 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/30 max-w-lg mx-auto mt-8">
          <h2 className="font-headline text-lg font-bold">Campaign Not Found</h2>
          <Link href="/advertiser" className="text-xs text-secondary font-semibold hover:underline mt-2 inline-block">
            ← Return to Overview
          </Link>
        </div>
      </AdvertiserLayout>
    );
  }

  const allocated = Number(campaign.budgetAllocatedPaise);
  const spent = Number(campaign.budgetSpentPaise);
  const percent = allocated > 0 ? Math.min(100, Math.round((spent / allocated) * 100)) : 0;

  return (
    <AdvertiserLayout>
      <div className="p-space-lg space-y-space-lg max-w-[1520px] mx-auto w-full">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <Link href="/advertiser" className="hover:text-on-surface">Advertiser Studio</Link>
          <span>/</span>
          <span className="text-on-surface font-semibold">{campaign.title}</span>
        </div>

        {/* Live Header matching Stitch Screen 10 */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="space-y-1">
            <div className="flex items-center gap-space-sm flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                campaign.status === 'ACTIVE'
                  ? 'bg-secondary-container/50 text-secondary'
                  : 'bg-surface-container text-on-surface-variant'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${campaign.status === 'ACTIVE' ? 'bg-secondary animate-pulse' : 'bg-outline'}`}></span>
                {campaign.status} Live Flight
              </span>
              <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant text-[11px] font-semibold uppercase">
                {campaign.category}
              </span>
            </div>
            <h1 className="font-headline text-2xl font-bold text-on-surface">
              {campaign.title}
            </h1>
            <p className="text-xs text-on-surface-variant max-w-3xl">
              Destination: <a href={campaign.targetUrl} target="_blank" rel="noreferrer" className="text-secondary hover:underline font-mono">{campaign.targetUrl}</a>
            </p>
          </div>

          <div className="flex items-center gap-space-sm shrink-0">
            <button
              onClick={handleToggleStatus}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 ${
                campaign.status === 'ACTIVE'
                  ? 'bg-surface-container text-on-surface hover:bg-surface-container-high border border-outline-variant/30'
                  : 'bg-secondary text-on-secondary hover:bg-on-secondary-container'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {campaign.status === 'ACTIVE' ? 'pause' : 'play_arrow'}
              </span>
              <span>{campaign.status === 'ACTIVE' ? 'Pause Campaign' : 'Resume Flight'}</span>
            </button>
          </div>
        </div>

        {/* Telemetry Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-space-md">
          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold block">Budget Escrow Burn</span>
            <div className="font-headline text-xl font-bold text-on-surface tabular-nums">
              {formatINR(campaign.budgetSpentPaise)}
            </div>
            <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden mt-1">
              <div className="bg-secondary h-full rounded-full" style={{ width: `${percent}%` }}></div>
            </div>
            <span className="text-[10px] text-on-surface-variant block mt-1">
              {percent}% of {formatINR(campaign.budgetAllocatedPaise)}
            </span>
          </div>

          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold block">Verified Outcomes</span>
            <div className="font-headline text-xl font-bold text-secondary tabular-nums">
              {campaign.verifiedOutcomes.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-on-surface-variant block mt-1">
              Target: {campaign.targetOutcomes.toLocaleString('en-IN')} conversions
            </span>
          </div>

          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold block">Fixed CPO (Paise)</span>
            <div className="font-headline text-xl font-bold text-on-surface tabular-nums">
              {formatINR(campaign.costPerOutcomePaise)}
            </div>
            <span className="text-[10px] text-on-surface-variant block mt-1">Guaranteed per verified outcome</span>
          </div>

          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold block">Telemetry IVT Rate</span>
            <div className="font-headline text-xl font-bold text-secondary tabular-nums">
              {campaign.ivtRatePercent}%
            </div>
            <span className="text-[10px] text-secondary font-medium block mt-1">Industry-leading fraud prevention</span>
          </div>
        </div>

        {/* Live Telemetry Stream Table */}
        <div className="p-space-lg rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-space-md">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-space-sm">
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface">Live Verification Stream</h2>
              <p className="text-xs text-on-surface-variant">Realtime attention dwell time and kinematic proof validations</p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-secondary-container/40 text-secondary text-xs font-semibold">
              Live Feed Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant text-xs uppercase tracking-wider border-b border-outline-variant/20">
                  <th className="py-2.5 px-space-md font-semibold">Timestamp</th>
                  <th className="py-2.5 px-space-md font-semibold">Creator</th>
                  <th className="py-2.5 px-space-md font-semibold">Status</th>
                  <th className="py-2.5 px-space-md font-semibold">Anomaly Score</th>
                  <th className="py-2.5 px-space-md font-semibold">Verdict</th>
                  <th className="py-2.5 px-space-md font-semibold text-right">Settlement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-sm">
                {!campaign.userTasks || campaign.userTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-on-surface-variant">
                      Telemetry stream active. Awaiting user task arrivals...
                    </td>
                  </tr>
                ) : (
                  campaign.userTasks.map((t: any) => (
                    <tr key={t.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3 px-space-md text-xs text-on-surface-variant">
                        {new Date(t.createdAt).toLocaleTimeString('en-IN')}
                      </td>
                      <td className="py-3 px-space-md text-xs font-semibold text-on-surface">
                        {t.user.name} ({t.user.kycTier})
                      </td>
                      <td className="py-3 px-space-md">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          t.status === 'VALIDATED'
                            ? 'bg-secondary-container/50 text-secondary'
                            : 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 px-space-md text-xs font-mono">
                        {t.anomalyScore.toFixed(2)}
                      </td>
                      <td className="py-3 px-space-md">
                        <span className="px-2 py-0.5 rounded bg-surface-container text-xs font-semibold text-secondary">
                          {t.fraudVerdict}
                        </span>
                      </td>
                      <td className="py-3 px-space-md text-right font-bold text-on-surface tabular-nums">
                        {formatINR(t.rewardPaise)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdvertiserLayout>
  );
}
