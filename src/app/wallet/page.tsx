'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import UserLayout from '@/components/navigation/UserLayout';
import { formatINR } from '@/lib/currency';

interface Transaction {
  id: string;
  referenceId: string;
  type: string;
  amountPaise: string;
  balanceAfterPaise: string;
  reason: string;
  createdAt: string;
}

export default function RewardWalletPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWallet();
  }, [typeFilter]);

  function fetchWallet() {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter !== 'ALL') params.append('type', typeFilter);

    fetch(`/api/wallet?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setWallet(data.wallet);
        setTransactions(data.transactions || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }

  function downloadCSV() {
    if (!transactions.length) return;
    const headers = ['Timestamp', 'Transaction Reference', 'Type', 'Reason', 'Amount (INR)', 'Balance After (INR)'];
    const rows = transactions.map((t) => [
      new Date(t.createdAt).toLocaleString('en-IN'),
      t.referenceId,
      t.type,
      `"${t.reason.replace(/"/g, '""')}"`,
      (Number(t.amountPaise) / 100).toFixed(2),
      (Number(t.balanceAfterPaise) / 100).toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AdEarn_Wallet_Statement_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <UserLayout>
      <div className="w-full max-w-[1280px] mx-auto px-space-lg py-space-xl space-y-space-lg">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs">
          <div>
            <h1 className="font-headline text-2xl font-bold text-on-surface">Reward Wallet & Authoritative Ledger</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Immutable double-entry transaction record. All amounts stored in integer paise and audited under RBI Nodal escrow standards.
            </p>
          </div>

          <div className="flex items-center gap-space-sm shrink-0">
            <button
              onClick={downloadCSV}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-container-low text-on-surface text-xs font-semibold hover:bg-surface-container border border-outline-variant/30 transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">file_download</span>
              <span>Download Statement (CSV)</span>
            </button>
            <Link
              href="/withdrawals"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary text-on-secondary text-xs font-bold hover:bg-on-secondary-container transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
              <span>Withdraw Funds</span>
            </Link>
          </div>
        </div>

        {/* Wallet Balances Cards matching Stitch Screen 04 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          {/* Available Withdrawable */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-sm">
            <span className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold block">
              Available to Withdraw
            </span>
            <div className="font-headline text-3xl font-bold text-secondary tabular-nums">
              {formatINR(wallet?.availablePaise ?? 0)}
            </div>
            <p className="text-xs text-on-surface-variant">Cleared and ready for instant UPI payout.</p>
          </div>

          {/* Pending Validation Hold */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold">
                Pending Hold
              </span>
              <span className="text-[10px] bg-tertiary-fixed text-on-tertiary-fixed-variant px-1.5 py-0.5 rounded font-bold">
                HOLD
              </span>
            </div>
            <div className="font-headline text-3xl font-bold text-on-tertiary-container tabular-nums">
              {formatINR(wallet?.pendingPaise ?? 0)}
            </div>
            <p className="text-xs text-on-surface-variant">In 24–48h advertiser reconciliation window.</p>
          </div>

          {/* Lifetime Cumulative Rewards */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-sm">
            <span className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold block">
              Cumulative Approved
            </span>
            <div className="font-headline text-3xl font-bold text-on-surface tabular-nums">
              {formatINR(wallet?.lifetimeEarnedPaise ?? 0)}
            </div>
            <p className="text-xs text-on-surface-variant">Total audited earnings credited to date.</p>
          </div>
        </div>

        {/* Ledger Transaction History Table */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm border-b border-outline-variant/20 pb-space-sm">
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface">Double-Entry Ledger Transactions</h2>
              <p className="text-xs text-on-surface-variant">Append-only audit trail with reference hash IDs</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-surface-container p-1 rounded-lg text-xs font-semibold">
              {['ALL', 'CREDIT_REWARD', 'DEBIT_WITHDRAWAL'].map((f) => (
                <button
                  key={f}
                  onClick={() => setTypeFilter(f)}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    typeFilter === f ? 'bg-surface-container-lowest text-on-surface shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {f === 'ALL' ? 'All Ledger' : f === 'CREDIT_REWARD' ? 'Rewards Only' : 'Withdrawals'}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant text-xs uppercase tracking-wider border-b border-outline-variant/20">
                  <th className="py-3 px-space-md font-semibold">Date & Time</th>
                  <th className="py-3 px-space-md font-semibold">Reference</th>
                  <th className="py-3 px-space-md font-semibold">Type</th>
                  <th className="py-3 px-space-md font-semibold">Description</th>
                  <th className="py-3 px-space-md font-semibold text-right">Amount</th>
                  <th className="py-3 px-space-md font-semibold text-right">Post Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-sm">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-on-surface-variant">
                      No ledger transactions found matching this filter.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const isCredit = tx.type === 'CREDIT_REWARD' || tx.type === 'ADVERTISER_TOPUP';
                    return (
                      <tr key={tx.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-3 px-space-md text-xs text-on-surface-variant">
                          {new Date(tx.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-space-md text-xs font-mono font-medium text-on-surface">
                          {tx.referenceId}
                        </td>
                        <td className="py-3 px-space-md">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            isCredit ? 'bg-secondary-container/50 text-secondary' : 'bg-surface-container text-on-surface'
                          }`}>
                            {tx.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-space-md text-xs text-on-surface-variant max-w-xs truncate">
                          {tx.reason}
                        </td>
                        <td className={`py-3 px-space-md text-right font-bold tabular-nums ${
                          isCredit ? 'text-secondary' : 'text-on-surface'
                        }`}>
                          {isCredit ? '+' : '-'}{formatINR(tx.amountPaise)}
                        </td>
                        <td className="py-3 px-space-md text-right text-xs text-on-surface-variant font-medium tabular-nums">
                          {formatINR(tx.balanceAfterPaise)}
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
    </UserLayout>
  );
}
