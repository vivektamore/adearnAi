'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/navigation/AdminLayout';
import { formatINR } from '@/lib/currency';

export default function PayoutClearingNodalPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    fetchPayouts();
  }, []);

  function fetchPayouts() {
    setLoading(true);
    fetch('/api/admin/payouts')
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }

  async function handleClearPayout(payoutId: string) {
    const res = await fetch('/api/admin/payouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payoutId, action: 'APPROVE_BATCH' }),
    });

    if (res.ok) {
      setActionMsg('Payout cleared successfully via HDFC Nodal Pool.');
      fetchPayouts();
    }
  }

  return (
    <AdminLayout>
      <div className="p-space-lg space-y-space-lg max-w-[1520px] mx-auto w-full">
        {/* Header matching Stitch Screen 16 */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div>
            <h1 className="font-headline text-2xl font-bold text-on-surface">Payout Clearing & RBI Nodal Pool</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Dual-approval disbursement operations and automated NPCI UPI 2.0 settlement reconciliation.
            </p>
          </div>
          <span className="px-3 py-1.5 rounded-lg bg-surface-container font-mono text-xs font-bold text-secondary">
            100% Cash Backed Reserve
          </span>
        </div>

        {actionMsg && (
          <div className="p-3 rounded-lg bg-secondary-container/30 border border-secondary/30 text-secondary text-xs font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{actionMsg}</span>
          </div>
        )}

        {/* Nodal Pool Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">Total Disbursed to Date</span>
            <div className="font-headline text-2xl font-bold text-secondary tabular-nums">
              {formatINR(data?.nodalPoolSummary?.totalDisbursedPaise ?? 110700)}
            </div>
            <span className="text-[11px] text-on-surface-variant">Settled with verified banking UTRs</span>
          </div>

          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">Pending Settlement Queue</span>
            <div className="font-headline text-2xl font-bold text-on-surface tabular-nums">
              {formatINR(data?.nodalPoolSummary?.pendingQueuePaise ?? 0)}
            </div>
            <span className="text-[11px] text-on-surface-variant">Awaiting dual compliance approval</span>
          </div>

          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">Nodal Custodian Bank</span>
            <div className="font-headline text-lg font-bold text-on-surface">HDFC Bank Ltd.</div>
            <span className="text-[11px] text-secondary font-semibold">RBI Section 10A Compliant Nodal Pool</span>
          </div>
        </div>

        {/* Payout Queue Table */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-md">
          <h2 className="font-headline text-base font-bold text-on-surface">Disbursement & Settlement Batches</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant text-xs uppercase tracking-wider border-b border-outline-variant/20">
                  <th className="py-3 px-space-md font-semibold">Payout ID</th>
                  <th className="py-3 px-space-md font-semibold">User</th>
                  <th className="py-3 px-space-md font-semibold">Target VPA</th>
                  <th className="py-3 px-space-md font-semibold">Amount</th>
                  <th className="py-3 px-space-md font-semibold">Status</th>
                  <th className="py-3 px-space-md font-semibold">UTR Reference</th>
                  <th className="py-3 px-space-md font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-sm">
                {!data?.payouts || data.payouts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-on-surface-variant">
                      No pending payouts in clearing queue.
                    </td>
                  </tr>
                ) : (
                  data.payouts.map((p: any) => (
                    <tr key={p.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3 px-space-md font-mono text-xs font-bold text-on-surface">
                        #{p.id.slice(-6).toUpperCase()}
                      </td>
                      <td className="py-3 px-space-md text-xs font-semibold text-on-surface">
                        {p.user.name} ({p.user.kycTier})
                      </td>
                      <td className="py-3 px-space-md text-xs font-mono text-on-surface-variant">
                        {p.maskedAddress}
                      </td>
                      <td className="py-3 px-space-md font-bold text-on-surface tabular-nums">
                        {formatINR(p.amountPaise)}
                      </td>
                      <td className="py-3 px-space-md">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          p.status === 'CLEARED' ? 'bg-secondary-container/50 text-secondary' : 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-space-md text-xs font-mono text-on-surface-variant">
                        {p.utrNumber || 'Awaiting batch release'}
                      </td>
                      <td className="py-3 px-space-md text-right">
                        {p.status !== 'CLEARED' ? (
                          <button
                            onClick={() => handleClearPayout(p.id)}
                            className="px-3 py-1 rounded bg-secondary text-on-secondary text-xs font-bold hover:bg-on-secondary-container transition-colors shadow-xs"
                          >
                            Clear via Nodal
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-secondary">Settled ✓</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
