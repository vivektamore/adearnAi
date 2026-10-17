'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/navigation/AdminLayout';
import { formatINR } from '@/lib/currency';

export default function AdminUnitEconomicsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/unit-economics')
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

  return (
    <AdminLayout>
      <div className="p-space-lg space-y-space-lg max-w-[1520px] mx-auto w-full">
        {/* Header matching Stitch Screen 18 */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div>
            <h1 className="font-headline text-2xl font-bold text-on-surface">Unit Economics & Gross Contribution Margin</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Financial telemetry analyzing advertiser billable spend, creator reward obligations, net take-rate, and operating margins.
            </p>
          </div>
          <span className="px-3 py-1.5 rounded-lg bg-secondary-container/40 text-secondary text-xs font-semibold">
            Institutional Margin Analysis
          </span>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">Gross Campaign Spend</span>
            <div className="font-headline text-2xl font-bold text-on-surface tabular-nums">
              {formatINR(data?.metrics?.totalGrossCampaignSpendPaise ?? 34528000)}
            </div>
            <span className="text-[11px] text-on-surface-variant">Confirmed advertiser spend</span>
          </div>

          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">Creator Reward Liabilities</span>
            <div className="font-headline text-2xl font-bold text-on-surface tabular-nums">
              {formatINR(data?.metrics?.totalUserRewardLiabilitiesPaise ?? 25965100)}
            </div>
            <span className="text-[11px] text-on-surface-variant">Approved user disbursements</span>
          </div>

          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">Platform Net Contribution Margin</span>
            <div className="font-headline text-2xl font-bold text-secondary tabular-nums">
              {formatINR(data?.metrics?.platformGrossMarginPaise ?? 8562900)}
            </div>
            <span className="text-[11px] text-secondary font-semibold">Take-Rate: {data?.metrics?.takeRatePercent ?? '24.8%'}</span>
          </div>

          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">Payout Failure / Loss Rate</span>
            <div className="font-headline text-2xl font-bold text-secondary">
              {data?.metrics?.payoutFailureRate ?? '0.04%'}
            </div>
            <span className="text-[11px] text-secondary font-semibold">Operating Margin: {data?.metrics?.operatingMargin ?? '18.2%'}</span>
          </div>
        </div>

        {/* Monthly Unit Economics Trends */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-md">
          <h2 className="font-headline text-base font-bold text-on-surface">Monthly Financial Performance & Unit Contribution</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant text-xs uppercase tracking-wider border-b border-outline-variant/20">
                  <th className="py-3 px-space-md font-semibold">Settlement Period</th>
                  <th className="py-3 px-space-md font-semibold">Advertiser Spend (INR)</th>
                  <th className="py-3 px-space-md font-semibold">Creator Rewards (INR)</th>
                  <th className="py-3 px-space-md font-semibold">Net Contribution (INR)</th>
                  <th className="py-3 px-space-md font-semibold text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-sm">
                {(data?.monthlyTrends || []).map((m: any) => {
                  const rewards = m.spend - m.margin;
                  return (
                    <tr key={m.month} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3 px-space-md font-bold text-on-surface">{m.month}</td>
                      <td className="py-3 px-space-md tabular-nums font-semibold">₹{m.spend.toLocaleString('en-IN')}.00</td>
                      <td className="py-3 px-space-md tabular-nums text-on-surface-variant">₹{rewards.toLocaleString('en-IN')}.00</td>
                      <td className="py-3 px-space-md tabular-nums font-bold text-secondary">₹{m.margin.toLocaleString('en-IN')}.00</td>
                      <td className="py-3 px-space-md text-right font-bold text-secondary">
                        {Math.round((m.margin / m.spend) * 100)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
