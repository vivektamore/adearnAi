'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import UserLayout from '@/components/navigation/UserLayout';

interface PayoutMethodItem {
  id: string;
  type: 'UPI' | 'BANK_ACCOUNT';
  accountHolderName: string;
  maskedAddress: string;
  bankName: string | null;
  ifscCode: string | null;
  isDefault: boolean;
}

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/user/profile').then((res) => res.json()),
      fetch('/api/payout-methods').then((res) => res.json()),
    ])
      .then(([profData, pmData]) => {
        if (profData.user) {
          setUser(profData.user);
          setName(profData.user.name || '');
          setUpiId(profData.user.upiId || '');
          setBankAccountNumber(profData.user.bankAccountNumber || '');
          setBankIfsc(profData.user.bankIfsc || '');
          setBankAccountName(profData.user.bankAccountName || '');
        }
        if (pmData.payoutMethods) {
          setPayoutMethods(pmData.payoutMethods);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatusMsg('');

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          upiId,
          bankAccountNumber,
          bankIfsc,
          bankAccountName,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMsg('Profile and payment preferences updated successfully.');
      } else {
        setStatusMsg(data.error || 'Failed to update preferences.');
      }
    } catch {
      setStatusMsg('Network error while saving profile.');
    } finally {
      setSaving(false);
    }
  }

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((p: string) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'CR';

  return (
    <UserLayout>
      <div className="w-full max-w-[1080px] mx-auto px-space-lg py-space-xl space-y-space-lg">
        {/* Header */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center text-secondary text-2xl font-bold border border-secondary/30">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-headline text-2xl font-bold text-on-surface">
                  {user?.name || (loading ? 'Loading...' : 'Creator')}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-secondary-container/40 text-on-secondary-fixed-variant text-xs font-semibold">
                  {user?.kycTier ? `Verified ${user.kycTier}` : 'Verified Tier 1'}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">{user?.email || ''}</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-on-surface-variant uppercase font-semibold block">KYC Verification</span>
            <span className="text-xs font-bold text-secondary flex items-center justify-end gap-1">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              {user?.kycStatus === 'VERIFIED' ? 'PAN & Aadhaar Verified' : 'Compliance Active'}
            </span>
          </div>
        </div>

        {/* Configured Payout Methods List */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface">Configured Payout Destinations</h2>
              <p className="text-xs text-on-surface-variant">Active Indian UPI and bank destinations enabled for instant withdrawal</p>
            </div>
            <Link
              href="/withdrawals"
              className="px-3 py-1.5 rounded-lg bg-secondary text-on-secondary text-xs font-bold flex items-center gap-1 hover:bg-on-secondary-container transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">add_card</span>
              Manage in Withdrawals
            </Link>
          </div>

          {payoutMethods.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {payoutMethods.map((pm) => (
                <div
                  key={pm.id}
                  className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary-container/40 text-secondary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">
                        {pm.type === 'UPI' ? 'qr_code_2' : 'account_balance'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm font-bold text-on-surface">{pm.maskedAddress}</span>
                        {pm.isDefault && (
                          <span className="text-[10px] bg-secondary-container text-secondary font-bold px-1.5 py-0.2 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-on-surface-variant">
                        {pm.accountHolderName} {pm.bankName ? `• ${pm.bankName}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-secondary font-semibold flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    Verified
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-surface-container-low border border-dashed border-outline-variant/40 text-xs text-on-surface-variant flex items-center justify-between">
              <span>No multiple payout destinations linked yet. Your primary UPI destination is configured below.</span>
              <Link href="/withdrawals" className="text-secondary font-bold hover:underline">
                Add Destination →
              </Link>
            </div>
          )}
        </div>

        {/* Profile and Destination Form */}
        <form onSubmit={handleSave} className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-lg">
          <div>
            <h2 className="font-headline text-base font-bold text-on-surface">Primary Payment Profile</h2>
            <p className="text-xs text-on-surface-variant">Update your registered Indian UPI Virtual Payment Address and primary banking details</p>
          </div>

          {statusMsg && (
            <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/30 text-xs font-semibold text-secondary flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">info</span>
              <span>{statusMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface">Full Legal Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-sm focus:border-secondary outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface">Primary UPI ID (VPA)</label>
              <input
                type="text"
                placeholder="username@okhdfcbank"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-sm focus:border-secondary outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface">Bank Account Number</label>
              <input
                type="text"
                placeholder="918239019234"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-sm focus:border-secondary outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface">Bank IFSC Code</label>
              <input
                type="text"
                placeholder="HDFC0001234"
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-sm focus:border-secondary outline-none font-mono uppercase"
              />
            </div>
          </div>

          {/* Privacy & Consents Section matching Stitch Screen 06 */}
          <div className="border-t border-outline-variant/20 pt-space-md space-y-3">
            <h3 className="font-headline text-sm font-bold text-on-surface">Privacy & Advertising Consents</h3>
            <div className="space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" defaultChecked className="mt-0.5 accent-secondary" />
                <span className="text-xs text-on-surface-variant">
                  <strong>Voluntary Telemetry Collection:</strong> Consent to anonymized kinematic and dwell-time attention telemetry strictly for verifying genuine task participation.
                </span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" defaultChecked className="mt-0.5 accent-secondary" />
                <span className="text-xs text-on-surface-variant">
                  <strong>Indian Data Protection Compliance:</strong> Consent to storage of KYC and payout receipts in accordance with applicable Indian financial statutory requirements.
                </span>
              </label>
            </div>
          </div>

          <div className="border-t border-outline-variant/20 pt-space-sm flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-secondary text-on-secondary font-bold text-sm hover:bg-on-secondary-container transition-colors shadow-xs flex items-center gap-1.5"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      </div>
    </UserLayout>
  );
}
