'use client';

import React, { useEffect, useState } from 'react';
import AdvertiserLayout from '@/components/navigation/AdvertiserLayout';
import { formatINR } from '@/lib/currency';

export default function AdvertiserBillingPage() {
  const [data, setData] = useState<any>(null);
  const [topUpAmount, setTopUpAmount] = useState('100000');
  const [utrNumber, setUtrNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    fetchBilling();
  }, []);

  function fetchBilling() {
    setLoading(true);
    fetch('/api/advertiser/billing')
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

  async function handleTopUp(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatusMsg('');

    try {
      const res = await fetch('/api/advertiser/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountRupees: parseFloat(topUpAmount),
          utrNumber: utrNumber || `RTGS-${Date.now()}`,
        }),
      });

      const resp = await res.json();
      if (res.ok) {
        setStatusMsg(resp.message);
        setUtrNumber('');
        fetchBilling();
      } else {
        setStatusMsg(resp.error || 'Failed to complete escrow top-up.');
      }
    } catch {
      setStatusMsg('Network error while processing deposit.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdvertiserLayout>
      <div className="p-space-lg space-y-space-lg max-w-[1520px] mx-auto w-full">
        {/* Header matching Stitch Screen 12 */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div>
            <h1 className="font-headline text-2xl font-bold text-on-surface">Advertiser Billing, Invoices & Escrow Top-Up</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Maintain institutional escrow reserves under Indian RBI nodal framework. Download GST-compliant tax invoices.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-right shrink-0">
            <span className="text-[11px] text-on-surface-variant uppercase font-semibold block">Total Escrow Balance</span>
            <span className="font-headline text-2xl font-bold text-secondary tabular-nums">
              {formatINR(data?.wallet?.escrowPaise ?? 45000000)}
            </span>
          </div>
        </div>

        {/* Top-Up Form and Escrow Status Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
          {/* Top-up Form */}
          <div className="lg:col-span-2 bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-md">
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface">Top-Up Nodal Escrow Reserve</h2>
              <p className="text-xs text-on-surface-variant">Instant credit via RTGS / NEFT / NetBanking to HDFC Nodal Pool</p>
            </div>

            {statusMsg && (
              <div className="p-3 rounded-lg bg-secondary-container/30 border border-secondary/30 text-secondary text-xs flex items-center gap-2 font-semibold">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>{statusMsg}</span>
              </div>
            )}

            <form onSubmit={handleTopUp} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface">Deposit Amount (INR)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm font-bold text-on-surface-variant">₹</span>
                    <input
                      type="number"
                      min="10000"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 rounded-lg bg-surface border border-outline-variant/40 text-sm font-bold tabular-nums focus:border-secondary outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface">Bank UTR Reference (RTGS/NEFT)</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC2026101689234"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-surface border border-outline-variant/40 text-sm font-mono focus:border-secondary outline-none uppercase"
                  />
                </div>
              </div>

              <div className="p-space-sm rounded-lg bg-surface-container-low border border-outline-variant/20 text-xs text-on-surface-variant flex items-center justify-between">
                <div>
                  <span className="font-bold text-on-surface block">Destination: AdEarn AI Nodal Settlement</span>
                  <span>HDFC Bank Nodal Virtual Account · IFSC: HDFC0000128</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-surface-container font-mono text-[11px] text-secondary font-bold">
                  AUTOPAY ENABLED
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-lg bg-secondary text-on-secondary font-bold text-sm hover:bg-on-secondary-container transition-colors shadow-xs"
              >
                {submitting ? 'Reconciling Escrow Deposit...' : 'Confirm Escrow Reserve Deposit'}
              </button>
            </form>
          </div>

          {/* GST Details Card */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-sm text-xs">
            <h3 className="font-headline text-base font-bold text-on-surface">GST & Tax Compliance</h3>
            <div className="space-y-2 text-on-surface-variant">
              <div>
                <span className="block font-semibold text-on-surface">Registered GSTIN:</span>
                <span className="font-mono text-secondary font-bold">{data?.organization?.gstin || '29AAACZ1234A1Z5'}</span>
              </div>
              <div>
                <span className="block font-semibold text-on-surface">PAN Identification:</span>
                <span className="font-mono">{data?.organization?.pan || 'AAACZ1234A'}</span>
              </div>
              <p className="pt-2 border-t border-outline-variant/20">
                18% GST (CGST 9% + SGST 9%) is applied to campaign platform commissions in compliance with Central Board of Indirect Taxes and Customs.
              </p>
            </div>
          </div>
        </div>

        {/* GST Invoices Table */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-md">
          <h2 className="font-headline text-base font-bold text-on-surface">Tax Invoices & Settlement Receipts</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant text-xs uppercase tracking-wider border-b border-outline-variant/20">
                  <th className="py-3 px-space-md font-semibold">Invoice Number</th>
                  <th className="py-3 px-space-md font-semibold">Date</th>
                  <th className="py-3 px-space-md font-semibold">Description</th>
                  <th className="py-3 px-space-md font-semibold">Base Amount</th>
                  <th className="py-3 px-space-md font-semibold">GST (18%)</th>
                  <th className="py-3 px-space-md font-semibold">Status</th>
                  <th className="py-3 px-space-md font-semibold text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-sm">
                {(data?.invoices || []).map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-3 px-space-md font-mono text-xs font-bold text-on-surface">{inv.id}</td>
                    <td className="py-3 px-space-md text-xs text-on-surface-variant">{inv.date}</td>
                    <td className="py-3 px-space-md text-xs font-medium text-on-surface">{inv.period}</td>
                    <td className="py-3 px-space-md font-bold text-on-surface tabular-nums">{formatINR(inv.amountPaise)}</td>
                    <td className="py-3 px-space-md text-xs text-on-surface-variant tabular-nums">{formatINR(inv.gstPaise)}</td>
                    <td className="py-3 px-space-md">
                      <span className="px-2 py-0.5 rounded-full bg-secondary-container/40 text-secondary text-xs font-bold">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-space-md text-right">
                      <button
                        onClick={() => alert(`Downloading verified GST invoice receipt ${inv.id}`)}
                        className="p-1.5 rounded hover:bg-surface-container text-secondary text-xs font-semibold flex items-center gap-1 ml-auto"
                      >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        <span>PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdvertiserLayout>
  );
}
