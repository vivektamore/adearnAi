'use client';

import React, { useEffect, useState } from 'react';
import UserLayout from '@/components/navigation/UserLayout';
import { formatINR } from '@/lib/currency';

interface PayoutMethodItem {
  id: string;
  type: 'UPI' | 'BANK_ACCOUNT';
  accountHolderName: string;
  maskedAddress: string;
  bankName: string | null;
  ifscCode: string | null;
  status: string;
  isDefault: boolean;
}

interface PayoutRequestItem {
  id: string;
  amountPaise: string;
  destinationAddress: string;
  maskedAddress: string;
  method: string;
  status: string;
  utrNumber: string | null;
  failureReason: string | null;
  createdAt: string;
  clearedAt: string | null;
  payoutMethod?: {
    type: string;
    maskedAddress: string;
    bankName: string | null;
  } | null;
}

export default function WithdrawalsPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [payouts, setPayouts] = useState<PayoutRequestItem[]>([]);
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethodItem[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [amountRupees, setAmountRupees] = useState<string>('150');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Add Payout Method Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMethodType, setNewMethodType] = useState<'UPI' | 'BANK_ACCOUNT'>('UPI');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [newUpiId, setNewUpiId] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newIfsc, setNewIfsc] = useState('');
  const [newBankName, setNewBankName] = useState('');
  const [addingMethod, setAddingMethod] = useState(false);
  const [addMethodError, setAddMethodError] = useState('');

  // Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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
        const methods: PayoutMethodItem[] = data.payoutMethods || [];
        setPayoutMethods(methods);

        // Pre-select default or first method
        const defaultMethod = methods.find((m) => m.isDefault) || methods[0];
        if (defaultMethod) {
          setSelectedMethodId(defaultMethod.id);
        }

        if (data.user?.name && !accountHolderName) {
          setAccountHolderName(data.user.name);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }

  async function handleAddPayoutMethod(e: React.FormEvent) {
    e.preventDefault();
    setAddingMethod(true);
    setAddMethodError('');

    try {
      const res = await fetch('/api/payout-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newMethodType,
          accountHolderName,
          upiId: newUpiId,
          accountNumber: newAccountNumber,
          ifscCode: newIfsc,
          bankName: newBankName,
          makeDefault: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowAddModal(false);
        setNewUpiId('');
        setNewAccountNumber('');
        setNewIfsc('');
        setNewBankName('');
        setSuccessMsg(data.message || 'Payout destination verified.');
        fetchPayoutsData();
      } else {
        setAddMethodError(data.error || 'Failed to add payout method.');
      }
    } catch {
      setAddMethodError('Network error while saving payout method.');
    } finally {
      setAddingMethod(false);
    }
  }

  function handleInitiateWithdrawal(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const val = parseFloat(amountRupees);
    if (isNaN(val) || val < 100) {
      setErrorMsg('Minimum withdrawal threshold is ₹100.00');
      return;
    }

    const availablePaise = BigInt(wallet?.availablePaise ?? 0);
    const reqPaise = BigInt(Math.round(val * 100));
    if (availablePaise < reqPaise) {
      setErrorMsg(`Insufficient balance. You have ₹${(Number(availablePaise) / 100).toFixed(2)} available.`);
      return;
    }

    if (payoutMethods.length === 0 && !user?.upiId) {
      setErrorMsg('Please configure a verified payout method first.');
      return;
    }

    setShowConfirmModal(true);
  }

  async function handleExecuteWithdrawal() {
    setShowConfirmModal(false);
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const val = parseFloat(amountRupees);

    try {
      const res = await fetch('/api/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountRupees: val,
          payoutMethodId: selectedMethodId || undefined,
          upiId: !selectedMethodId ? user?.upiId : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Withdrawal cleared via institutional RBI Nodal pool.');
        fetchPayoutsData();
      } else {
        setErrorMsg(data.error || 'Failed to process withdrawal request.');
      }
    } catch {
      setErrorMsg('Network communication error while executing payout.');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedMethod = payoutMethods.find((m) => m.id === selectedMethodId);

  return (
    <UserLayout>
      <div className="w-full max-w-[1280px] mx-auto px-space-lg py-space-xl space-y-space-lg">
        {/* Header matching Stitch Screen 05 */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div>
            <div className="flex items-center gap-space-sm flex-wrap">
              <h1 className="font-headline text-2xl font-bold text-on-surface">Withdrawals & Payout History</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-secondary-container/40 text-on-secondary-fixed-variant text-xs font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-secondary">verified</span>
                RBI Nodal Clearing • Zero Processing Fees
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mt-1">
              Disburse your verified earnings directly to your Indian bank account or UPI VPA. No passwords or ATM PINs required.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-right shrink-0">
              <span className="text-[11px] text-on-surface-variant uppercase font-semibold block">Available to Withdraw</span>
              <span className="font-headline text-2xl font-bold text-secondary tabular-nums">
                {formatINR(wallet?.availablePaise ?? 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Withdrawal Form and Destination Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
          {/* Main Withdrawal Panel */}
          <div className="lg:col-span-2 bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-md">
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface">Request Instant Withdrawal</h2>
              <p className="text-xs text-on-surface-variant">Instant settlement via NPCI UPI 2.0 / IMPS institutional nodal clearing</p>
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

            <form onSubmit={handleInitiateWithdrawal} className="space-y-4">
              {/* Amount Input */}
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
                    onClick={() => setAmountRupees(((Number(wallet?.availablePaise ?? 0)) / 100).toFixed(0))}
                    className="text-secondary font-semibold hover:underline"
                  >
                    Withdraw All Available
                  </button>
                </div>
              </div>

              {/* Destination Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wider block">
                    Payout Destination
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="text-xs font-bold text-secondary hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                    Add Payout Method
                  </button>
                </div>

                {payoutMethods.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {payoutMethods.map((pm) => {
                      const isSelected = pm.id === selectedMethodId;
                      return (
                        <div
                          key={pm.id}
                          onClick={() => setSelectedMethodId(pm.id)}
                          className={`cursor-pointer p-3 rounded-lg border transition-all ${
                            isSelected
                              ? 'bg-secondary-container/20 border-secondary ring-1 ring-secondary'
                              : 'bg-surface border-outline-variant/30 hover:border-outline-variant'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">
                              {pm.type === 'UPI' ? 'UPI VPA' : 'Bank Account'}
                            </span>
                            {pm.isDefault && (
                              <span className="text-[10px] text-secondary font-bold flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[12px]">star</span>
                                Default
                              </span>
                            )}
                          </div>
                          <div className="mt-2">
                            <p className="text-sm font-mono font-bold text-on-surface">{pm.maskedAddress}</p>
                            <p className="text-[11px] text-on-surface-variant truncate">
                              {pm.accountHolderName} {pm.bankName ? `• ${pm.bankName}` : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-surface border border-dashed border-outline-variant/60 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-on-surface">No Payout Methods Configured</p>
                      <p className="text-[11px] text-on-surface-variant">
                        {user?.upiId ? `Legacy UPI: ${user.upiId}` : 'Add a verified UPI ID or Bank account to receive instant payouts.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddModal(true)}
                      className="px-3 py-1.5 rounded-lg bg-secondary text-on-secondary text-xs font-bold"
                    >
                      + Add Now
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || (Number(wallet?.availablePaise ?? 0) < 10000)}
                className="w-full py-3 rounded-lg bg-secondary text-on-secondary font-bold text-sm hover:bg-on-secondary-container transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-on-secondary border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing Nodal Settlement...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Instant Withdrawal (₹{amountRupees})</span>
                    <span className="material-symbols-outlined text-[18px]">send</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Protections Panel */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-sm text-xs text-on-surface-variant">
            <h3 className="font-headline text-base font-bold text-on-surface">Institutional Protections</h3>
            <p>
              Withdrawals from AdEarn AI are settled via authorized Reserve Bank of India Nodal clearing pipelines.
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li>Transactions are processed 24/7/365 via NPCI UPI 2.0 rail.</li>
              <li>Every payout is assigned an immutable 12-digit UTR reference.</li>
              <li>Zero processing fees charged to creators.</li>
              <li>Bank reference statements are recorded in your double-entry ledger.</li>
              <li>Compensating failure recovery ensures no funds are dropped.</li>
            </ul>

            <div className="pt-3 border-t border-outline-variant/20 mt-4">
              <span className="text-[11px] font-bold text-on-surface block mb-1">Active KYC Tier</span>
              <span className="px-2 py-0.5 rounded bg-secondary-container/40 text-secondary text-xs font-semibold">
                Tier 1 Verified • Pan / Aadhaar Linked
              </span>
            </div>
          </div>
        </div>

        {/* Payout History Table matching Screen 05 */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-xs overflow-hidden">
          <div className="p-space-lg border-b border-outline-variant/20 flex items-center justify-between">
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface">Payout History & Clearing Records</h2>
              <p className="text-xs text-on-surface-variant">Immutable double-entry disbursement ledger entries</p>
            </div>
            <span className="text-xs text-on-surface-variant font-medium">
              {payouts.length} Total Disbursements
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low text-on-surface-variant font-bold border-b border-outline-variant/20">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Method & Destination</th>
                  <th className="py-3 px-4">UTR Reference</th>
                  <th className="py-3 px-4">Clearing Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-on-surface">
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                      No withdrawals requested yet. Complete campaigns to earn rewards and withdraw instantly.
                    </td>
                  </tr>
                ) : (
                  payouts.map((p) => {
                    const isCleared = p.status === 'CLEARED';
                    const isFailed = p.status === 'FAILED';
                    return (
                      <tr key={p.id} className="hover:bg-surface/50">
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          {new Date(p.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-secondary tabular-nums">
                          {formatINR(p.amountPaise)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          <span className="font-bold text-on-surface">{p.method || 'UPI'}</span>: {p.maskedAddress}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-on-surface-variant">
                          {p.utrNumber ? (
                            <span className="text-secondary font-bold">{p.utrNumber}</span>
                          ) : isFailed ? (
                            <span className="text-error">{p.failureReason || 'Failed & Reversed'}</span>
                          ) : (
                            <span className="text-on-surface-variant italic">Pending Clearing</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              isCleared
                                ? 'bg-secondary-container/40 text-secondary'
                                : isFailed
                                ? 'bg-error-container text-on-error-container'
                                : 'bg-surface-container text-on-surface-variant'
                            }`}
                          >
                            {p.status}
                          </span>
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

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-2xl border border-outline-variant/30 p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[24px]">verified_user</span>
              </div>
              <div>
                <h3 className="font-headline text-lg font-bold text-on-surface">Confirm Instant Withdrawal</h3>
                <p className="text-xs text-on-surface-variant">Direct Nodal Clearing via NPCI</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-low space-y-2 border border-outline-variant/20 text-xs">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Amount:</span>
                <span className="font-bold text-sm text-secondary">₹{parseFloat(amountRupees).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Destination:</span>
                <span className="font-mono font-bold text-on-surface">
                  {selectedMethod?.maskedAddress || user?.upiId || 'Primary Destination'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Transfer Fee:</span>
                <span className="font-bold text-secondary">₹0.00 (Zero Fee)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Clearing Network:</span>
                <span className="font-medium text-on-surface">RBI Nodal Settlement / IMPS</span>
              </div>
            </div>

            <p className="text-[11px] text-on-surface-variant">
              AdEarn AI never asks for your UPI PIN, banking password, or card CVV. This transfer will be credited directly to your destination account.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteWithdrawal}
                className="px-5 py-2.5 rounded-lg bg-secondary text-on-secondary text-xs font-bold hover:bg-on-secondary-container transition-colors shadow-xs"
              >
                Confirm & Disburse Funds
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Payout Method Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-2xl border border-outline-variant/30 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-headline text-lg font-bold text-on-surface">Add Payout Destination</h3>
                <p className="text-xs text-on-surface-variant">Configure verified Indian UPI or Bank Account for instant withdrawals</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {addMethodError && (
              <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{addMethodError}</span>
              </div>
            )}

            {/* Type Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-surface-container-low border border-outline-variant/20">
              <button
                type="button"
                onClick={() => setNewMethodType('UPI')}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  newMethodType === 'UPI'
                    ? 'bg-secondary text-on-secondary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                UPI ID (Instant)
              </button>
              <button
                type="button"
                onClick={() => setNewMethodType('BANK_ACCOUNT')}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  newMethodType === 'BANK_ACCOUNT'
                    ? 'bg-secondary text-on-secondary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">account_balance</span>
                Bank Account (IMPS/NEFT)
              </button>
            </div>

            <form onSubmit={handleAddPayoutMethod} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface">Account Holder Legal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arun Kumar"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-xs focus:border-secondary outline-none"
                />
              </div>

              {newMethodType === 'UPI' ? (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface">Virtual Payment Address (UPI ID)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. arunkumar@okhdfcbank"
                    value={newUpiId}
                    onChange={(e) => setNewUpiId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-xs font-mono focus:border-secondary outline-none"
                  />
                  <p className="text-[11px] text-on-surface-variant">Supported VPAs: @okhdfcbank, @oksbi, @okaxis, @paytm, @ybl, etc.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-on-surface">Account Number</label>
                    <input
                      type="text"
                      required
                      placeholder="9 to 18 digit account number"
                      value={newAccountNumber}
                      onChange={(e) => setNewAccountNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-xs font-mono focus:border-secondary outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-on-surface">IFSC Code</label>
                      <input
                        type="text"
                        required
                        placeholder="HDFC0001234"
                        value={newIfsc}
                        onChange={(e) => setNewIfsc(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-xs font-mono focus:border-secondary outline-none uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-on-surface">Bank Name</label>
                      <input
                        type="text"
                        placeholder="HDFC Bank"
                        value={newBankName}
                        onChange={(e) => setNewBankName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-xs focus:border-secondary outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="p-3 rounded-lg bg-surface-container-low text-[11px] text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-secondary">security</span>
                <span>We strictly do NOT ask for UPI PINs, passwords, or OTPs. Destination will be masked in UI responses.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingMethod}
                  className="px-5 py-2.5 rounded-lg bg-secondary text-on-secondary text-xs font-bold hover:bg-on-secondary-container transition-colors shadow-xs flex items-center gap-2"
                >
                  {addingMethod ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-on-secondary border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Verify & Save Destination</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </UserLayout>
  );
}
