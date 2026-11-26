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
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

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
              Maintain institutional advertising reserves with our banking and payment partners. Download GST-compliant tax invoices.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-right shrink-0">
            <span className="text-[11px] text-on-surface-variant uppercase font-semibold block">Total Escrow Balance</span>
            <span className="font-headline text-2xl font-bold text-secondary tabular-nums">
              {formatINR(data?.wallet?.escrowPaise ?? 0)}
            </span>
          </div>
        </div>

        {/* Top-Up Form and Escrow Status Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
          {/* Top-up Form */}
          <div className="lg:col-span-2 bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-md">
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface">Top-Up Advertising Escrow Reserve</h2>
              <p className="text-xs text-on-surface-variant">Instant credit via RTGS / NEFT / NetBanking via Authorized Banking Partners</p>
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
                  <span className="font-bold text-on-surface block">Destination: AdEarn AI Escrow Reserve (Partner Bank)</span>
                  <span>Virtual Escrow Account · Partner Bank Settlement Rail</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-surface-container font-mono text-[11px] text-secondary font-bold">
                  TEST SANDBOX CLEARING
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
                <span className="font-mono text-secondary font-bold">
                  {data?.organization?.gstin || 'Not registered / Optional for Pilot'}
                </span>
              </div>
              <div>
                <span className="block font-semibold text-on-surface">PAN Identification:</span>
                <span className="font-mono">
                  {data?.organization?.pan ||
                    (data?.organization?.gstin && data.organization.gstin.length >= 12
                      ? data.organization.gstin.slice(2, 12)
                      : 'Not on file')}
                </span>
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

          {(!data?.invoices || data.invoices.length === 0) ? (
            <div className="p-8 text-center bg-surface-container-low rounded-xl border border-outline-variant/20 space-y-2">
              <span className="material-symbols-outlined text-secondary text-[32px]">receipt_long</span>
              <p className="text-sm font-semibold text-on-surface">No Escrow Deposit Invoices Yet</p>
              <p className="text-xs text-on-surface-variant max-w-md mx-auto">
                Once you make a deposit above via RTGS, NEFT, or NetBanking, an official GST tax invoice receipt will be generated automatically.
              </p>
            </div>
          ) : (
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
                  {data.invoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3 px-space-md font-mono text-xs font-bold text-on-surface">{inv.id}</td>
                      <td className="py-3 px-space-md text-xs text-on-surface-variant">{inv.date}</td>
                      <td className="py-3 px-space-md text-xs font-medium text-on-surface">{inv.period}</td>
                      <td className="py-3 px-space-md font-bold text-on-surface tabular-nums">
                        {formatINR(inv.basePaise || inv.amountPaise)}
                      </td>
                      <td className="py-3 px-space-md text-xs text-on-surface-variant tabular-nums">
                        {formatINR(inv.gstPaise || 0)}
                      </td>
                      <td className="py-3 px-space-md">
                        <span className="px-2 py-0.5 rounded-full bg-secondary-container/40 text-secondary text-xs font-bold">
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-space-md text-right">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="p-1.5 rounded hover:bg-surface-container text-secondary text-xs font-semibold flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">receipt</span>
                          <span>View Tax Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* GST Tax Invoice Modal */}
        {selectedInvoice && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-secondary">Institutional Tax Receipt</span>
                  <h3 className="font-headline text-lg font-bold text-on-surface">GST Tax Invoice #{selectedInvoice.id}</h3>
                </div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-surface-container-low">
                  <div>
                    <span className="text-on-surface-variant block font-medium">Issuer:</span>
                    <span className="font-semibold text-on-surface">AdEarn AI Media Tech Pvt. Ltd.</span>
                    <span className="text-[11px] text-on-surface-variant block font-mono">GSTIN: 27AABCA1234F1Z8</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block font-medium">Recipient:</span>
                    <span className="font-semibold text-on-surface">{data?.organization?.name || 'Authorized Brand'}</span>
                    <span className="text-[11px] text-on-surface-variant block font-mono">
                      GSTIN: {data?.organization?.gstin || 'Unregistered'}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-outline-variant/20 border border-outline-variant/20 rounded-lg overflow-hidden">
                  <div className="flex justify-between p-2.5 bg-surface-container-low font-semibold text-on-surface">
                    <span>Particulars</span>
                    <span>Amount</span>
                  </div>
                  <div className="flex justify-between p-2.5 text-on-surface">
                    <span>Escrow Allocation ({selectedInvoice.period || 'Settlement'})</span>
                    <span className="font-mono tabular-nums">{formatINR(selectedInvoice.basePaise || selectedInvoice.amountPaise)}</span>
                  </div>
                  <div className="flex justify-between p-2.5 text-on-surface-variant">
                    <span>CGST (9.0%)</span>
                    <span className="font-mono tabular-nums">{formatINR((selectedInvoice.gstPaise || 0) / 2)}</span>
                  </div>
                  <div className="flex justify-between p-2.5 text-on-surface-variant">
                    <span>SGST (9.0%)</span>
                    <span className="font-mono tabular-nums">{formatINR((selectedInvoice.gstPaise || 0) / 2)}</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-surface-container-low font-bold text-on-surface">
                    <span>Total Settled</span>
                    <span className="font-mono tabular-nums text-secondary">{formatINR(selectedInvoice.amountPaise)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px] text-secondary">verified</span>
                  <span>Validated with Partner Banking UTR Settlement.</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-outline-variant/20">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2 rounded-lg bg-secondary text-on-secondary font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>Print / Save Tax Receipt</span>
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 rounded-lg bg-surface-container text-on-surface font-semibold text-xs hover:bg-surface-container-high cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdvertiserLayout>
  );
}
