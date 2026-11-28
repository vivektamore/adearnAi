'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AdvertiserLayout from '@/components/navigation/AdvertiserLayout';
import { formatINR } from '@/lib/currency';

interface CampaignItem {
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
}

export default function AdvertiserCampaignsListPage() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/advertiser/overview')
      .then((res) => res.json())
      .then((data) => {
        setCampaigns(data.campaigns || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  async function handleToggleStatus(campaignId: string, currentStatus: string) {
    if (['IN_REVIEW', 'PENDING_APPROVAL', 'DRAFT', 'REJECTED'].includes(currentStatus)) {
      alert('This campaign is awaiting administrator moderation review. It will automatically go live once approved by AdEarn Compliance.');
      return;
    }
    const nextStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      const res = await fetch(`/api/advertiser/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setCampaigns((prev) =>
          prev.map((c) => (c.id === campaignId ? { ...c, status: nextStatus } : c))
        );
      } else {
        alert(data.error || 'Failed to update campaign status');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error updating campaign: ' + err.message);
    }
  }

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAllocated = campaigns.reduce((acc, c) => acc + BigInt(c.budgetAllocatedPaise || '0'), 0n);
  const totalSpent = campaigns.reduce((acc, c) => acc + BigInt(c.budgetSpentPaise || '0'), 0n);
  const activeCount = campaigns.filter((c) => c.status === 'ACTIVE').length;

  return (
    <AdvertiserLayout>
      <div className="p-space-lg space-y-space-lg max-w-[1520px] mx-auto w-full">
        {/* Header Breadcrumb & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="space-y-1">
            <div className="flex items-center gap-space-xs text-xs text-on-surface-variant font-medium">
              <Link href="/advertiser" className="hover:text-secondary transition-colors">
                Advertiser Studio
              </Link>
              <span>/</span>
              <span className="text-on-surface font-semibold">Campaign Management</span>
            </div>
            <h1 className="font-headline text-2xl lg:text-3xl font-bold text-on-surface">
              Active Campaigns & Creative Portfolio
            </h1>
            <p className="text-sm text-on-surface-variant">
              Manage campaign flights, monitor live performance metrics, and toggle delivery states in real-time.
            </p>
          </div>

          <div className="flex items-center gap-space-sm">
            <Link
              href="/advertiser"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container-low transition-colors shadow-xs text-xs font-semibold border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[18px]">dashboard</span>
              <span>Overview</span>
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

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-on-surface-variant">Total Campaigns</span>
            <div className="font-headline text-2xl font-bold text-on-surface mt-1">{campaigns.length}</div>
            <span className="text-xs text-on-surface-variant">Portfolio size</span>
          </div>
          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-on-surface-variant">Active in Flight</span>
            <div className="font-headline text-2xl font-bold text-secondary mt-1">{activeCount} Active</div>
            <span className="text-xs text-secondary font-semibold">Live delivery</span>
          </div>
          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-on-surface-variant">Committed Budget</span>
            <div className="font-headline text-2xl font-bold text-on-surface mt-1">{formatINR(totalAllocated)}</div>
            <span className="text-xs text-on-surface-variant">Escrow allocation</span>
          </div>
          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-on-surface-variant">Total Spend</span>
            <div className="font-headline text-2xl font-bold text-on-surface mt-1">{formatINR(totalSpent)}</div>
            <span className="text-xs text-secondary font-semibold">Verified outcomes</span>
          </div>
        </div>

        {/* Campaigns Table & Controls */}
        <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-xs border border-outline-variant/30 space-y-space-md">
          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm border-b border-outline-variant/20 pb-space-sm">
            <div className="flex items-center gap-space-sm flex-1 max-w-md">
              <div className="relative w-full">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-on-surface-variant">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search campaigns by title or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-secondary"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto">
              {['ALL', 'ACTIVE', 'PAUSED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    statusFilter === st
                      ? 'bg-secondary text-on-secondary shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
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
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-on-surface-variant font-medium">
                      Loading campaign portfolio...
                    </td>
                  </tr>
                ) : filteredCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-on-surface-variant">
                      No matching campaigns found. Click &quot;+ Create Campaign&quot; to launch a new activity.
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
                          <Link
                            href={`/advertiser/campaigns/${camp.id}`}
                            className="font-semibold text-on-surface block hover:text-secondary transition-colors"
                          >
                            {camp.title}
                          </Link>
                          <span className="text-xs text-on-surface-variant">
                            {camp.actionType.replace('_', ' ')} · {camp.category}
                          </span>
                        </td>
                        <td className="py-3 px-space-md">
                          {camp.status === 'ACTIVE' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              ACTIVE
                            </span>
                          ) : camp.status === 'IN_REVIEW' || camp.status === 'PENDING_APPROVAL' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <span className="material-symbols-outlined text-[13px] text-amber-600 animate-spin">progress_activity</span>
                              IN REVIEW
                            </span>
                          ) : camp.status === 'REJECTED' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              REJECTED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-container text-on-surface-variant border border-outline-variant/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
                              PAUSED
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-space-md">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span>{formatINR(camp.budgetSpentPaise)}</span>
                              <span className="text-on-surface-variant font-normal">
                                of {formatINR(camp.budgetAllocatedPaise)}
                              </span>
                            </div>
                            <div className="w-32 bg-surface-container h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-secondary h-full rounded-full"
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-space-md">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-on-surface">
                              {camp.verifiedOutcomes.toLocaleString('en-IN')}
                            </span>
                            <span className="text-on-surface-variant">
                              / {camp.targetOutcomes.toLocaleString('en-IN')}
                            </span>
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
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/advertiser/campaigns/${camp.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors"
                              title="Live Telemetry"
                            >
                              <span className="material-symbols-outlined text-[16px]">insights</span>
                              <span>Telemetry</span>
                            </Link>
                            {camp.status === 'IN_REVIEW' || camp.status === 'PENDING_APPROVAL' ? (
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50/80 border border-amber-200 text-amber-800 text-xs font-semibold cursor-help"
                                title="Pending compliance review in AdEarn Admin Moderation Queue"
                              >
                                <span className="material-symbols-outlined text-[14px] text-amber-600">lock_clock</span>
                                <span>In Review</span>
                              </span>
                            ) : camp.status === 'REJECTED' ? (
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold cursor-help"
                                title="Campaign declined in moderation"
                              >
                                <span className="material-symbols-outlined text-[14px] text-rose-600">cancel</span>
                                <span>Declined</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleToggleStatus(camp.id, camp.status)}
                                className={`p-1.5 rounded-md hover:bg-surface-container text-xs font-semibold transition-colors ${
                                  camp.status === 'ACTIVE'
                                    ? 'text-on-surface-variant hover:text-error'
                                    : 'text-secondary hover:text-secondary'
                                }`}
                                title={camp.status === 'ACTIVE' ? 'Pause Campaign' : 'Resume Flight'}
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  {camp.status === 'ACTIVE' ? 'pause' : 'play_arrow'}
                                </span>
                              </button>
                            )}
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
