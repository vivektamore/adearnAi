'use client';

import React, { useEffect, useState } from 'react';
import UserLayout from '@/components/navigation/UserLayout';
import { formatINR } from '@/lib/currency';

interface PayoutRequestItem {
  id: string;
  amountPaise: string;
  destinationAddress: string;
  maskedAddress: string;
  status: string;
  utrNumber: string | null;
  createdAt: string;
  clearedAt: string | null;
}

export default function WithdrawalsPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [payouts, setPayouts] = useState<PayoutRequestItem[]>([]);
  const [amountRupees, setAmountRupees] = useState<string>('150');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchPayoutsData();
  }, []);

  function fetchPayoutsData() {
    setLoading(true);
    fetch('/api/payouts')
      .then((res) => res.json())
      .then((data) => {
        setWallet(data.wallet);
        setUser(data.user);
        setPayouts(data.payoutRequests || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }

  async function handleRequestWithdrawal(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const val = parseFloat(amountRupees);
    if (isNaN(val) || val < 100) {
      setErrorMsg('Minimum withdrawal threshold is ₹100.00');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountRupees: val,
          upiId: user?.upiId || 'arun@okaxis',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Withdrawal cleared via UPI Nodal pool.');
        fetchPayoutsData();
      } else {
        setErrorMsg(data.error || 'Failed to process withdrawal request.');
      }
    } catch {
      setErrorMsg('Network error while requesting payout.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <UserLayout>
      <div className="w-full max-w-[1280px] mx-auto px-space-lg py-space-xl space-y-space-lg">
        {/* Header matching Stitch Screen 05 */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div>
            <div className="flex items-center gap-space-sm flex-wrap">
              <h1 className="font-headline text-2xl font-bold text-on-surface">Withdrawals & Payout History</h1>
              <span className="px-2 py-0.5 rounded-full bg-secondary-container/40 text-on-secondary-fixed-variant text-xs font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-secondary">verified</span>
                Instant UPI 2.0 / IMPS Clearing Active
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mt-1">
              Disburse your approved earnings directly to your verified Indian bank account or UPI VPA. No PINs or passwords required.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-right shrink-0">
            <span className="text-[11px] text-on-surface-variant uppercase font-semibold block">Available to Withdraw</span>
            <span className="font-headline text-2xl font-bold text-secondary tabular-nums">
              {formatINR(wallet?.availablePaise ?? 24500)}
            </span>
          </div>
        </div>

        {/* Withdrawal Form and Destination Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
          {/* Withdrawal Request Card */}
          <div className="lg:col-span-2 bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-md">
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface">Request Instant Withdrawal</h2>
              <p className="text-xs text-on-surface-variant">Instant nodal clearance to your verified UPI destination</p>
            </div>

            {successMsg && (
              <div className="p-3 rounded-lg bg-secondary-container/30 border border-secondary/30 text-secondary text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span className="font-semibold">{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRequestWithdrawal} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider block">
                  Withdrawal Amount (INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-on-surface-variant">₹</span>
                  <input
                    type="number"
                    min="100"
                    step="1"
                    value={amountRupees}
                    onChange={(e) => setAmountRupees(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 rounded-lg bg-surface border border-outline-variant/40 text-base font-semibold focus:border-secondary outline-none tabular-nums"
                  />
                </div>
                <div className="flex justify-between text-[11px] text-on-surface-variant">
                  <span>Minimum threshold: ₹100.00</span>
                  <button
                    type="button"
                    onClick={() => setAmountRupees(((Number(wallet?.availablePaise ?? 24500)) / 100).toFixed(0))}
                    className="text-secondary font-semibold hover:underline"
                  >
                    Withdraw All Available
                  </button>
                </div>
              </div>

              {/* Destination VPA details */}
              <div className="p-space-md rounded-lg bg-surface-container-low border border-outline-variant/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary-container/40 text-secondary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">account_balance</span>
                  </div>
                  <div>
                    <span className="text-xs text-on-surface-variant font-medium block">Verified Payout Target</span>
                    <span className="text-sm font-bold text-on-surface font-mono">
                      {user?.upiId || 'arun@okaxis'} (Masked: ar**@okaxis)
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-surface-container text-secondary text-xs font-semibold">
                  Verified Tier 1
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-lg bg-secondary text-on-secondary font-bold text-sm hover:bg-on-secondary-container transition-colors shadow-xs flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-on-secondary border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing Banking Clearance...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Instant Withdrawal</span>
                    <span className="material-symbols-outlined text-[18px]">send</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Security & Bank Disclaimer Card */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-sm text-xs text-on-surface-variant">
            <h3 className="font-headline text-base font-bold text-on-surface">Financial Protections</h3>
            <p>
              Withdrawals from AdEarn AI are settled via authorized Reserve Bank of India Nodal clearing pipelines.
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li>Transactions are processed 24/7/365 via NPCI UPI 2.0 rail.</li>
              <li>Every payout is assigned an immutable 12-digit UTR reference.</li>
              <li>Zero processing fees charged to creators.</li>
              <li>Bank reference statements are recorded in your double-entry ledger.</li>
            </ul>
          </div>
        </div>

        {/* Payout History Table */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-md">
          <h2 className="font-headline text-base font-bold text-on-surface">Payout Clearing History</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant text-xs uppercase tracking-wider border-b border-outline-variant/20">
                  <th className="py-3 px-space-md font-semibold">Initiated At</th>
                  <th className="py-3 px-space-md font-semibold">Destination VPA</th>
                  <th className="py-3 px-space-md font-semibold">Amount</th>
                  <th className="py-3 px-space-md font-semibold">Status</th>
                  <th className="py-3 px-space-md font-semibold">Banking UTR Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-sm">
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-on-surface-variant">
                      No payout requests on file yet.
                    </td>
                  </tr>
                ) : (
                  payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3 px-space-md text-xs text-on-surface-variant">
                        {new Date(p.createdAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-space-md text-xs font-mono font-medium text-on-surface">
                        {p.maskedAddress}
                      </td>
                      <td className="py-3 px-space-md font-bold text-on-surface tabular-nums">
                        {formatINR(p.amountPaise)}
                      </td>
                      <td className="py-3 px-space-md">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          p.status === 'CLEARED'
                            ? 'bg-secondary-container/50 text-secondary'
                            : p.status === 'FAILED'
                            ? 'bg-error-container text-on-error-container'
                            : 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-space-md text-xs font-mono text-on-surface-variant">
                        {p.utrNumber || 'Processing through clearing pool...'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
