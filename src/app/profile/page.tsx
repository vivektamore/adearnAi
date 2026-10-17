'use client';

import React, { useEffect, useState } from 'react';
import UserLayout from '@/components/navigation/UserLayout';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    fetch('/api/user/profile')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          setName(data.user.name || '');
          setUpiId(data.user.upiId || '');
          setBankAccountNumber(data.user.bankAccountNumber || '');
          setBankIfsc(data.user.bankIfsc || '');
          setBankAccountName(data.user.bankAccountName || '');
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
        setStatusMsg('Profile and payment destinations updated successfully.');
      } else {
        setStatusMsg(data.error || 'Failed to update preferences.');
      }
    } catch {
      setStatusMsg('Network error while saving profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <UserLayout>
      <div className="w-full max-w-[1080px] mx-auto px-space-lg py-space-xl space-y-space-lg">
        {/* Header */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center text-secondary text-2xl font-bold border border-secondary/30">
              AK
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-headline text-2xl font-bold text-on-surface">{user?.name || 'Arun Kumar'}</h1>
                <span className="px-2 py-0.5 rounded-full bg-secondary-container/40 text-on-secondary-fixed-variant text-xs font-semibold">
                  Verified Tier 1
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">{user?.email || 'arun@creator.in'}</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-on-surface-variant uppercase font-semibold block">KYC Status</span>
            <span className="text-xs font-bold text-secondary flex items-center justify-end gap-1">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              PAN & Aadhaar Verified
            </span>
          </div>
        </div>

        {/* Profile and Destination Form */}
        <form onSubmit={handleSave} className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-lg">
          <div>
            <h2 className="font-headline text-base font-bold text-on-surface">Payment Preferences & Payout Target</h2>
            <p className="text-xs text-on-surface-variant">Update your registered Indian UPI Virtual Payment Address and Bank details for instant withdrawals</p>
          </div>

          {statusMsg && (
            <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/30 text-xs font-semibold text-secondary flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">info</span>
              <span>{statusMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface">Full Name</label>
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
