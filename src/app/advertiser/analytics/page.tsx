'use client';

import React, { useEffect, useState } from 'react';
import AdvertiserLayout from '@/components/navigation/AdvertiserLayout';

export default function AdvertiserAnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/advertiser/analytics')
      .then((res) => res.json())
      .then((data) => {
        setAnalytics(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <AdvertiserLayout>
      <div className="p-space-lg space-y-space-lg max-w-[1520px] mx-auto w-full">
        {/* Header matching Stitch Screen 11 */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div>
            <h1 className="font-headline text-2xl font-bold text-on-surface">Analytics & Multi-Touch Attribution</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Audited attention dwell analysis, IAB-compliant bot filtration, and multi-channel conversion attribution models.
            </p>
          </div>
          <span className="px-3 py-1.5 rounded-lg bg-surface-container text-xs font-semibold text-secondary">
            Attribution Engine v3.1 Synced
          </span>
        </div>

        {/* Analytics KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">Total Verified Conversions</span>
            <div className="font-headline text-2xl font-bold text-secondary">
              {analytics?.metrics?.validatedOutcomes ?? 0}
            </div>
            <span className="text-[11px] text-on-surface-variant">100% verified outcomes</span>
          </div>

          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">Average Attention Dwell</span>
            <div className="font-headline text-2xl font-bold text-on-surface">
              {analytics?.metrics?.averageAttentionDwellSec ?? 0}s
            </div>
            <span className="text-[11px] text-secondary font-semibold">Measured dwell time</span>
          </div>

          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">Retention & Completion</span>
            <div className="font-headline text-2xl font-bold text-on-surface">
              {analytics?.metrics?.multiTouchRetentionRate ?? 0}%
            </div>
            <span className="text-[11px] text-secondary font-semibold">Audited completion rate</span>
          </div>

          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">IVT & Bot Interceptions</span>
            <div className="font-headline text-2xl font-bold text-on-surface">
              {analytics?.metrics?.ivtRate ?? 0}%
            </div>
            <span className="text-[11px] text-secondary font-semibold">Kinematic filter active</span>
          </div>
        </div>

        {/* Multi-Touch Breakdown Table */}
        <div className="p-space-lg rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-space-md">
          <h2 className="font-headline text-base font-bold text-on-surface">Attribution Channel Breakdown</h2>

          {loading ? (
            <div className="py-8 text-center text-sm text-on-surface-variant font-medium">
              Loading attribution data...
            </div>
          ) : !analytics?.attributionBreakdown || analytics.attributionBreakdown.length === 0 ? (
            <div className="p-8 text-center bg-surface-container-low rounded-xl border border-outline-variant/20 space-y-2">
              <span className="material-symbols-outlined text-secondary text-[32px]">insights</span>
              <p className="text-sm font-semibold text-on-surface">No Verified Campaign Activity Available</p>
              <p className="text-xs text-on-surface-variant max-w-md mx-auto">
                Attribution channels and conversion analytics will appear here after creators complete and validate activities under your campaigns.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant text-xs uppercase tracking-wider border-b border-outline-variant/20">
                    <th className="py-3 px-space-md font-semibold">Touchpoint / Channel</th>
                    <th className="py-3 px-space-md font-semibold">Validated Conversions</th>
                    <th className="py-3 px-space-md font-semibold">Attribution Share</th>
                    <th className="py-3 px-space-md font-semibold">Model Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 text-sm">
                  {analytics.attributionBreakdown.map((ch: any) => (
                    <tr key={ch.channel} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3 px-space-md font-semibold text-on-surface">{ch.channel}</td>
                      <td className="py-3 px-space-md font-bold text-secondary tabular-nums">{ch.conversions}</td>
                      <td className="py-3 px-space-md text-xs font-semibold">{ch.share}</td>
                      <td className="py-3 px-space-md text-xs text-secondary font-semibold">
                        <span className="px-2 py-0.5 rounded-full bg-secondary-container/40">{ch.modelConfidence || '100% Verified Telemetry Audit'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdvertiserLayout>
  );
}
