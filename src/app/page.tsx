'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import UserLayout from '@/components/navigation/UserLayout';
import { formatINR } from '@/lib/currency';

interface DashboardData {
  user: {
    id: string;
    name: string;
    email: string;
    kycTier: string;
    kycStatus: string;
    upiId: string;
  };
  metrics: {
    availableBalancePaise: string;
    pendingBalancePaise: string;
    lifetimeEarnedPaise: string;
    lifetimePaidPaise: string;
    activeCampaignsAvailable: number;
  };
  recentTasks: Array<{
    id: string;
    status: string;
    rewardPaise: string;
    createdAt: string;
    campaign: {
      title: string;
      actionType: string;
      category: string;
      organization: { name: string };
    };
  }>;
}

export default function UserDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/user/dashboard')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load dashboard');
        return res.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <UserLayout>
      <div className="w-full max-w-[1280px] mx-auto px-space-lg py-space-xl flex flex-col gap-space-xl">
        {/* Welcome Section matching Stitch Screen 01 */}
        <section className="flex flex-col gap-space-md bg-surface-container-lowest p-space-lg rounded-xl shadow-xs relative overflow-hidden border border-outline-variant/30">
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-secondary-fixed/20 blur-3xl pointer-events-none"></div>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md relative z-10">
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center flex-wrap gap-space-sm">
                <h1 className="font-headline text-2xl lg:text-3xl font-bold text-on-surface tracking-tight">
                  Welcome back, {data?.user.name || 'Arun'}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container/40 text-on-secondary-fixed-variant text-xs font-semibold">
                  <span className="material-symbols-outlined text-[14px] text-secondary">verified</span>
                  Verified KYC · {data?.user.kycTier || 'Level 1'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                  Demonstration Data · Live Nodal Synced
                </span>
              </div>
              <p className="text-sm text-on-surface-variant max-w-3xl">
                Complete eligible sponsored activities to earn verified rewards. Rewards are credited upon advertiser verification. Earnings are never guaranteed.
              </p>
            </div>

            {/* Quick CTAs */}
            <div className="flex items-center gap-space-sm shrink-0">
              <Link
                href="/feed"
                className="inline-flex items-center gap-space-xs px-space-md py-2.5 rounded-lg bg-secondary text-on-secondary text-sm font-semibold hover:bg-on-secondary-container transition-all shadow-xs active:scale-[0.99]"
              >
                <span className="material-symbols-outlined text-[18px]">explore</span>
                <span>Explore Sponsored Campaigns</span>
              </Link>
              <Link
                href="/wallet"
                className="inline-flex items-center gap-space-xs px-space-md py-2.5 rounded-lg bg-surface-container-low text-on-surface text-sm font-semibold hover:bg-surface-container transition-all border border-outline-variant/30"
              >
                <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                <span>View Wallet Statement</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Four Prominent Metric Cards matching Stitch Screen 01 */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
          {/* Card 1: Available Balance */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs border border-outline-variant/30 flex flex-col justify-between gap-space-md relative overflow-hidden group hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-space-xs">
                <span className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold">
                  Available Balance
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="font-headline text-3xl font-bold text-secondary tracking-tight tabular-nums">
                    {loading ? '₹...' : formatINR(data?.metrics?.availableBalancePaise ?? 0)}
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-secondary-container/50 text-secondary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
              </div>
            </div>
            <div className="flex flex-col gap-space-xs pt-space-xs border-t border-outline-variant/20">
              <p className="text-xs text-on-surface-variant">Ready for withdrawal to verified UPI</p>
              <Link
                href="/withdrawals"
                className="inline-flex items-center gap-1 text-xs text-secondary font-semibold hover:underline"
              >
                <span>Withdraw funds</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </div>

          {/* Card 2: Pending Rewards */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs border border-outline-variant/30 flex flex-col justify-between gap-space-md group hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center gap-1">
                  <span className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold">
                    Pending Rewards
                  </span>
                  <span className="material-symbols-outlined text-[15px] text-outline cursor-help" title="Pending advertiser verification (typically 24–48 hrs)">
                    help_outline
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-headline text-3xl font-bold text-on-tertiary-container tracking-tight tabular-nums">
                    {loading ? '₹...' : formatINR(data?.metrics?.pendingBalancePaise ?? 0)}
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed-variant flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">hourglass_top</span>
              </div>
            </div>
            <div className="flex flex-col gap-space-xs pt-space-xs border-t border-outline-variant/20">
              <p className="text-xs text-on-surface-variant">Activities awaiting advertiser validation</p>
              <Link
                href="/wallet"
                className="inline-flex items-center gap-1 text-xs text-on-tertiary-container font-semibold hover:underline"
              >
                <span>View ledger details</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </div>

          {/* Card 3: Total Approved Earnings */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs border border-outline-variant/30 flex flex-col justify-between gap-space-md group hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-space-xs">
                <span className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold">
                  Lifetime Approved
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="font-headline text-3xl font-bold text-on-surface tracking-tight tabular-nums">
                    {loading ? '₹...' : formatINR(data?.metrics?.lifetimeEarnedPaise ?? 0)}
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-surface-container text-on-surface flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">check_circle</span>
              </div>
            </div>
            <div className="flex flex-col gap-space-xs pt-space-xs border-t border-outline-variant/20">
              <p className="text-xs text-on-surface-variant">Cumulative verified earnings</p>
              <span className="text-xs text-on-surface-variant font-medium">100% Tax Compliant</span>
            </div>
          </div>

          {/* Card 4: Lifetime Completed Payouts */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs border border-outline-variant/30 flex flex-col justify-between gap-space-md group hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-space-xs">
                <span className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold">
                  Total Disbursed
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="font-headline text-3xl font-bold text-on-surface tracking-tight tabular-nums">
                    {loading ? '₹...' : formatINR(data?.metrics?.lifetimePaidPaise ?? 0)}
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-surface-container text-on-surface flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">receipt_long</span>
              </div>
            </div>
            <div className="flex flex-col gap-space-xs pt-space-xs border-t border-outline-variant/20">
              <p className="text-xs text-on-surface-variant">Cleared to verified UPI / Bank</p>
              <Link
                href="/withdrawals"
                className="inline-flex items-center gap-1 text-xs text-secondary font-semibold hover:underline"
              >
                <span>Track payouts</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Recent Task Activity and Available Campaigns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
          {/* Recent Task History */}
          <div className="lg:col-span-2 bg-surface-container-lowest p-space-lg rounded-xl shadow-xs border border-outline-variant/30 space-y-space-md">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline text-lg font-bold text-on-surface">Recent Activity</h2>
                <p className="text-xs text-on-surface-variant">Your latest sponsored engagements and verification states</p>
              </div>
              <Link href="/wallet" className="text-xs text-secondary font-semibold hover:underline">
                View Full Ledger →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant text-xs uppercase tracking-wider border-b border-outline-variant/20">
                    <th className="py-2.5 px-space-md font-semibold">Campaign</th>
                    <th className="py-2.5 px-space-md font-semibold">Type</th>
                    <th className="py-2.5 px-space-md font-semibold">Status</th>
                    <th className="py-2.5 px-space-md font-semibold text-right">Reward</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 text-sm">
                  {data?.recentTasks && data.recentTasks.length > 0 ? (
                    data.recentTasks.map((t) => (
                      <tr key={t.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-3 px-space-md font-medium text-on-surface">
                          {t.campaign.title}
                          <span className="block text-xs text-on-surface-variant">by {t.campaign.organization.name}</span>
                        </td>
                        <td className="py-3 px-space-md text-xs text-on-surface-variant font-medium">
                          {t.campaign.actionType.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-space-md">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            t.status === 'VALIDATED'
                              ? 'bg-secondary-container/50 text-secondary'
                              : t.status === 'REJECTED'
                              ? 'bg-error-container text-on-error-container'
                              : 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                          }`}>
                            {t.status === 'VALIDATED' ? 'Approved' : t.status === 'REJECTED' ? 'Rejected' : 'Pending'}
                          </span>
                        </td>
                        <td className="py-3 px-space-md text-right font-bold text-secondary tabular-nums">
                          +{formatINR(t.rewardPaise)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-sm text-on-surface-variant">
                        No recent activity yet. Explore campaigns below to begin!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Compliance & Indian Regulatory Panel */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs border border-outline-variant/30 space-y-space-md">
            <h3 className="font-headline text-base font-bold text-on-surface">Compliance & Payout Rules</h3>
            <div className="space-y-3 text-xs text-on-surface-variant">
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/30">
                <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">verified</span>
                <div>
                  <strong className="block text-on-surface font-semibold">ASCI Guidelines Enforced</strong>
                  All content is strictly voluntary, clearly labelled "Sponsored", and verified before payout.
                </div>
              </div>
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/30">
                <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">account_balance</span>
                <div>
                  <strong className="block text-on-surface font-semibold">RBI Nodal Escrow Backing</strong>
                  Rewards are backed 100% by cash deposits held in institutional nodal accounts.
                </div>
              </div>
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/30">
                <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">shield</span>
                <div>
                  <strong className="block text-on-surface font-semibold">Instant UPI Withdrawals</strong>
                  Minimum withdrawal threshold: ₹100.00. No UPI PIN or passwords requested.
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/feed"
                className="w-full flex items-center justify-center gap-1 py-2.5 rounded-lg bg-primary-container text-on-primary text-sm font-semibold hover:bg-opacity-90 transition-opacity"
              >
                <span>Browse {data?.metrics?.activeCampaignsAvailable ?? 0} Available Campaigns</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
