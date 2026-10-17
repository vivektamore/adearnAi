'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AdvertiserLayout from '@/components/navigation/AdvertiserLayout';
import { formatINR } from '@/lib/currency';

interface AdvertiserData {
  organization: {
    id: string;
    name: string;
    gstin: string;
    isVerified: boolean;
  };
  metrics: {
    escrowBalancePaise: string;
    totalSpendPaise: string;
    totalAllocatedPaise: string;
    verifiedOutcomes: number;
    effectiveCpoPaise: string;
    ivtRatePercent: number;
    activeCampaignsCount: number;
    blockedIVTCount: number;
  };
  campaigns: Array<{
    id: string;
    title: string;
    category: string;
    actionType: string;
    status: string;
    budgetAllocatedPaise: string;
    budgetSpentPaise: string;
    costPerOutcomePaise: string;
    targetOutcomes: number;
    verifiedOutcomes: number;
    ivtRatePercent: number;
    flightStart: string;
    flightEnd: string;
  }>;
}

export default function AdvertiserOverviewPage() {
  const [data, setData] = useState<AdvertiserData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/advertiser/overview')
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  async function handleToggleStatus(campaignId: string, currentStatus: string) {
    const nextStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      const res = await fetch(`/api/advertiser/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        // Refresh
        fetch('/api/advertiser/overview')
          .then((r) => r.json())
          .then((d) => setData(d));
      }
    } catch (err) {
      console.error(err);
    }
  }

  const filteredCampaigns = (data?.campaigns || []).filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || c.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AdvertiserLayout>
      <div className="p-space-lg space-y-space-lg max-w-[1520px] mx-auto w-full">
        {/* Page Title & CTAs matching Stitch Screen 08 */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
          <div className="space-y-1">
            <div className="flex items-center gap-space-sm flex-wrap">
              <h1 className="font-headline text-2xl lg:text-3xl font-bold text-on-surface">
                Advertiser Overview Dashboard
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                Node 02 · Synced
              </span>
            </div>
            <p className="text-sm text-on-surface-variant max-w-3xl">
              Monitor verified campaign delivery, escrow utilization, billable conversion outcomes, and cryptographic attention audits across certified creators.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-space-sm">
            <Link
              href="/advertiser/billing"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container-low transition-colors shadow-xs text-xs font-semibold border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[18px]">file_download</span>
              <span>Reconciliation Report</span>
            </Link>
            <Link
              href="/advertiser/billing"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary text-on-secondary hover:bg-on-secondary-container transition-colors shadow-xs text-xs font-bold"
            >
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
              <span>Fund Escrow</span>
            </Link>
            <Link
              href="/advertiser/campaigns/new"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary hover:bg-opacity-90 transition-colors shadow-xs text-xs font-bold"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>+ Create Campaign</span>
            </Link>
          </div>
        </div>

        {/* 6 Metric KPI Cards matching Stitch Screen 08 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-space-md">
          {/* Total Spend */}
          <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-xs border border-outline-variant/30 flex flex-col justify-between hover:shadow-sm transition-shadow">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-[11px] uppercase tracking-wider font-semibold">Total Spend (L30D)</span>
                <span className="material-symbols-outlined text-[18px] text-secondary">payments</span>
              </div>
              <div className="font-headline text-xl lg:text-2xl font-bold text-on-surface tabular-nums">
                {loading ? '₹...' : formatINR(data?.metrics?.totalSpendPaise ?? 0)}
              </div>
            </div>
            <div className="mt-space-sm pt-space-xs flex items-center justify-between border-t border-outline-variant/20">
              <span className="inline-flex items-center gap-0.5 text-secondary text-xs font-semibold">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                Verified Flight Spend
              </span>
              <span className="text-[11px] text-on-surface-variant">Confirmed spend</span>
            </div>
          </div>

          {/* Nodal Escrow Pool */}
          <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-xs border border-outline-variant/30 flex flex-col justify-between hover:shadow-sm transition-shadow">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-[11px] uppercase tracking-wider font-semibold">Nodal Escrow Pool</span>
                <span className="material-symbols-outlined text-[18px] text-secondary">verified</span>
              </div>
              <div className="font-headline text-xl lg:text-2xl font-bold text-secondary tabular-nums">
                {loading ? '₹...' : formatINR(data?.metrics?.escrowBalancePaise ?? 0)}
              </div>
            </div>
            <div className="mt-space-sm pt-space-xs flex items-center justify-between border-t border-outline-variant/20">
              <span className="text-[11px] text-on-surface-variant">Unreserved Escrow</span>
              <span className="px-1.5 py-0.5 rounded bg-surface-container text-secondary text-[10px] font-bold">100% Reserve</span>
            </div>
          </div>

          {/* Verified Outcomes */}
          <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-xs border border-outline-variant/30 flex flex-col justify-between hover:shadow-sm transition-shadow">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-[11px] uppercase tracking-wider font-semibold">Verified Outcomes</span>
                <span className="material-symbols-outlined text-[18px] text-secondary">task_alt</span>
              </div>
              <div className="font-headline text-xl lg:text-2xl font-bold text-on-surface tabular-nums">
                {loading ? '...' : (data?.metrics?.verifiedOutcomes ?? 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="mt-space-sm pt-space-xs flex items-center justify-between border-t border-outline-variant/20">
              <span className="inline-flex items-center gap-0.5 text-secondary text-xs font-semibold">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                100% Validated
              </span>
              <span className="text-[11px] text-on-surface-variant">Zero estimate</span>
            </div>
          </div>

          {/* Effective CPO */}
          <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-xs border border-outline-variant/30 flex flex-col justify-between hover:shadow-sm transition-shadow">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-[11px] uppercase tracking-wider font-semibold">Effective CPO</span>
                <span className="material-symbols-outlined text-[18px] text-secondary">price_check</span>
              </div>
              <div className="font-headline text-xl lg:text-2xl font-bold text-on-surface tabular-nums">
                {loading ? '₹...' : formatINR(data?.metrics?.effectiveCpoPaise ?? 0)}
              </div>
            </div>
            <div className="mt-space-sm pt-space-xs flex items-center justify-between border-t border-outline-variant/20">
              <span className="inline-flex items-center gap-0.5 text-secondary text-xs font-semibold">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                Cost per Outcome
              </span>
              <span className="text-[11px] text-on-surface-variant">Audited Rate</span>
            </div>
          </div>

          {/* Fraud & IVT Rate */}
          <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-xs border border-outline-variant/30 flex flex-col justify-between hover:shadow-sm transition-shadow">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-[11px] uppercase tracking-wider font-semibold">Fraud & IVT Rate</span>
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">shield</span>
              </div>
              <div className="font-headline text-xl lg:text-2xl font-bold text-on-surface tabular-nums">
                {data?.metrics?.ivtRatePercent ?? 0}%
              </div>
            </div>
            <div className="mt-space-sm pt-space-xs flex items-center justify-between border-t border-outline-variant/20">
              <span className="text-secondary text-xs font-semibold">Telemetry Verified</span>
              <span className="text-[11px] text-on-surface-variant">{data?.metrics?.blockedIVTCount ?? 0} blocks</span>
            </div>
          </div>

          {/* Pending SLA Recon */}
          <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-xs border border-outline-variant/30 flex flex-col justify-between hover:shadow-sm transition-shadow">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-[11px] uppercase tracking-wider font-semibold">Campaigns In Flight</span>
                <span className="material-symbols-outlined text-[18px] text-on-tertiary-container">campaign</span>
              </div>
              <div className="font-headline text-xl lg:text-2xl font-bold text-on-surface tabular-nums">
                {data?.campaigns?.length ?? 0} Active
              </div>
            </div>
            <div className="mt-space-sm pt-space-xs flex items-center justify-between border-t border-outline-variant/20">
              <span className="text-on-tertiary-container text-xs font-semibold">Flight Monitored</span>
              <span className="text-[11px] text-on-surface-variant">Live telemetry</span>
            </div>
          </div>
        </div>

        {/* Dynamic Visual SVG Telemetry Charts matching Stitch Screen 08 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
          {/* Chart 1: Verified Outcomes vs Disqualified IVT */}
          <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-xs border border-outline-variant/30 flex flex-col justify-between space-y-space-md">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-space-xs">
                  <span className="font-headline text-base font-bold text-on-surface">Verified Outcomes vs Disqualified IVT</span>
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant">info</span>
                </div>
                <p className="text-xs text-on-surface-variant">Granular 30-day hourly load showing daylight peak verification (10:00–18:00 IST)</p>
              </div>
              <div className="flex items-center gap-space-md text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-secondary"></span>
                  <span>Valid ({data?.metrics?.verifiedOutcomes ?? 0})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-error/70"></span>
                  <span className="text-on-surface-variant">Blocked IVT ({data?.metrics?.blockedIVTCount ?? 0})</span>
                </div>
              </div>
            </div>

            {/* SVG Visual Graph */}
            <div className="relative w-full h-56 flex flex-col justify-end">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 600 200">
                <defs>
                  <linearGradient id="gradEmerald" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#006a61" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#006a61" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <line stroke="#E2E8F0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="600" y1="30" y2="30" />
                <line stroke="#E2E8F0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="600" y1="80" y2="80" />
                <line stroke="#E2E8F0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="600" y1="130" y2="130" />
                <line stroke="#CBD5E1" strokeWidth="1" x1="0" x2="600" y1="190" y2="190" />
                <path d="M 0,160 Q 50,145 100,150 T 200,105 T 300,75 T 400,50 T 500,40 T 600,30 L 600,190 L 0,190 Z" fill="url(#gradEmerald)" />
                <path d="M 0,160 Q 50,145 100,150 T 200,105 T 300,75 T 400,50 T 500,40 T 600,30" fill="none" stroke="#006a61" strokeWidth="2.5" />
                <g fill="#ba1a1a" opacity="0.8">
                  <rect height="15" rx="1" width="8" x="75" y="175" />
                  <rect height="18" rx="1" width="8" x="155" y="172" />
                  <rect height="22" rx="1" width="8" x="235" y="168" />
                  <rect height="28" rx="1" width="8" x="315" y="162" />
                  <rect height="32" rx="1" width="8" x="395" y="158" />
                  <rect height="25" rx="1" width="8" x="475" y="165" />
                  <rect height="20" rx="1" width="8" x="555" y="170" />
                </g>
              </svg>
              <div className="flex justify-between items-center text-on-surface-variant text-[11px] pt-2">
                <span>Sep 16 (08:00)</span>
                <span>Sep 23 (Peak 14:00)</span>
                <span>Sep 30 (Settlement)</span>
                <span>Oct 07</span>
                <span>Oct 16 (Live)</span>
              </div>
            </div>
          </div>

          {/* Chart 2: Escrow Burn vs Allocated Budget */}
          <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-xs border border-outline-variant/30 flex flex-col justify-between space-y-space-md">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-space-xs">
                  <span className="font-headline text-base font-bold text-on-surface">Escrow Burn vs Allocated Budget</span>
                  <span className="px-1.5 py-0.5 rounded bg-surface-container text-[11px] font-semibold text-on-surface-variant">Ceiling: ₹5,00,000</span>
                </div>
                <p className="text-xs text-on-surface-variant">Dynamic drawdown curve against committed bank nodal accounts</p>
              </div>
              <div className="flex items-center gap-space-md text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-primary"></span>
                  <span>Spend (₹3.45L)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-secondary border-dashed border-t"></span>
                  <span className="text-secondary">Projected Clearance</span>
                </div>
              </div>
            </div>

            {/* SVG Visual Curve */}
            <div className="relative w-full h-56 flex flex-col justify-end">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 600 200">
                <line stroke="#76777d" strokeDasharray="6 4" strokeWidth="1.5" x1="0" x2="600" y1="20" y2="20" />
                <line stroke="#E2E8F0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="600" y1="70" y2="70" />
                <line stroke="#E2E8F0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="600" y1="120" y2="120" />
                <line stroke="#CBD5E1" strokeWidth="1" x1="0" x2="600" y1="180" y2="180" />
                <path d="M 0,180 L 90,165 L 180,140 L 270,122 L 360,95 L 420,78" fill="none" stroke="#131b2e" strokeWidth="3" />
                <path d="M 420,78 L 510,55 L 600,38" fill="none" stroke="#006a61" strokeDasharray="5 5" strokeWidth="2" />
                <circle cx="420" cy="78" fill="#131b2e" r="5" stroke="#ffffff" strokeWidth="2" />
              </svg>
              <div className="flex justify-between items-center text-on-surface-variant text-[11px] pt-2">
                <span>Day 01 (Allocated)</span>
                <span>Day 10 (35% Burn)</span>
                <span>Day 20 (Today: 69%)</span>
                <span>Day 25 (Projected)</span>
                <span>Day 30 (Clearance)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Campaign Portfolio Table matching Stitch Screen 08 */}
        <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-xs border border-outline-variant/30 space-y-space-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm border-b border-outline-variant/20 pb-space-sm">
            <div>
              <div className="flex items-center gap-space-sm">
                <h2 className="font-headline text-lg font-bold text-on-surface">Active Campaign Portfolio</h2>
                <span className="px-2 py-0.5 rounded-full bg-surface-container text-xs font-semibold text-on-surface-variant">
                  {filteredCampaigns.length} Campaigns
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">Direct attribution stream backed by interactive client-side sandboxes</p>
            </div>

            {/* Table Search & Status Filters */}
            <div className="flex flex-wrap items-center gap-space-xs">
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-surface border border-outline-variant/40 text-xs focus:border-secondary outline-none w-48 sm:w-64"
              />
              <div className="inline-flex rounded-lg bg-surface-container p-0.5 text-xs font-semibold">
                {['ALL', 'ACTIVE', 'PAUSED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      statusFilter === st ? 'bg-surface-container-lowest text-on-surface shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant text-xs uppercase tracking-wider border-b border-outline-variant/20">
                  <th className="py-3 px-space-md font-semibold">CAMPAIGN & ACTION TYPE</th>
                  <th className="py-3 px-space-md font-semibold">STATUS</th>
                  <th className="py-3 px-space-md font-semibold">ALLOCATED & SPENT</th>
                  <th className="py-3 px-space-md font-semibold">OUTCOMES PROGRESS</th>
                  <th className="py-3 px-space-md font-semibold text-right">COST / OUTCOME</th>
                  <th className="py-3 px-space-md font-semibold text-right">IVT RATE</th>
                  <th className="py-3 px-space-md font-semibold text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-sm">
                {filteredCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-on-surface-variant">
                      No campaigns found. Click &quot;+ Create Campaign&quot; to launch your first verified activity!
                    </td>
                  </tr>
                ) : (
                  filteredCampaigns.map((camp) => {
                    const allocated = Number(camp.budgetAllocatedPaise);
                    const spent = Number(camp.budgetSpentPaise);
                    const percent = allocated > 0 ? Math.min(100, Math.round((spent / allocated) * 100)) : 0;
                    return (
                      <tr key={camp.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-3 px-space-md">
                          <span className="font-semibold text-on-surface block hover:text-secondary cursor-pointer">
                            {camp.title}
                          </span>
                          <span className="text-xs text-on-surface-variant">
                            {camp.actionType.replace('_', ' ')} · {camp.category}
                          </span>
                        </td>
                        <td className="py-3 px-space-md">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            camp.status === 'ACTIVE'
                              ? 'bg-secondary-container/50 text-secondary'
                              : 'bg-surface-container text-on-surface-variant'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${camp.status === 'ACTIVE' ? 'bg-secondary' : 'bg-outline'}`}></span>
                            {camp.status}
                          </span>
                        </td>
                        <td className="py-3 px-space-md">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span>{formatINR(camp.budgetSpentPaise)}</span>
                              <span className="text-on-surface-variant font-normal">of {formatINR(camp.budgetAllocatedPaise)}</span>
                            </div>
                            <div className="w-32 bg-surface-container h-1.5 rounded-full overflow-hidden">
                              <div className="bg-secondary h-full rounded-full" style={{ width: `${percent}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-space-md">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-on-surface">{camp.verifiedOutcomes.toLocaleString('en-IN')}</span>
                            <span className="text-on-surface-variant">/ {camp.targetOutcomes.toLocaleString('en-IN')}</span>
                            <span className="text-secondary font-semibold">
                              ({Math.round((camp.verifiedOutcomes / (camp.targetOutcomes || 1)) * 100)}%)
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-space-md text-right font-bold text-on-surface tabular-nums">
                          {formatINR(camp.costPerOutcomePaise)}
                        </td>
                        <td className="py-3 px-space-md text-right">
                          <span className="text-secondary text-xs font-bold">{camp.ivtRatePercent}%</span>
                        </td>
                        <td className="py-3 px-space-md text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/advertiser/campaigns/${camp.id}`}
                              className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface"
                              title="Live Telemetry"
                            >
                              <span className="material-symbols-outlined text-[18px]">insights</span>
                            </Link>
                            <button
                              onClick={() => handleToggleStatus(camp.id, camp.status)}
                              className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface"
                              title={camp.status === 'ACTIVE' ? 'Pause Campaign' : 'Resume Campaign'}
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                {camp.status === 'ACTIVE' ? 'pause' : 'play_arrow'}
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdvertiserLayout>
  );
}
