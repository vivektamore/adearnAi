'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/navigation/AdminLayout';

export default function AdminSettingsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    fetch('/api/admin/settings')
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
        {/* Header matching Stitch Screen 19 */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div>
            <h1 className="font-headline text-2xl font-bold text-on-surface">Platform Settings & Access Control</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Configure system-wide reward limits, financial thresholds, role-based access control, and telemetry API keys.
            </p>
          </div>
          <span className="px-3 py-1.5 rounded-lg bg-surface-container font-mono text-xs font-bold text-secondary">
            Environment: Production Node
          </span>
        </div>

        {/* Global Limits & Thresholds */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-md">
          <h2 className="font-headline text-base font-bold text-on-surface">System Reward Limits & Financial Controls</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
            <div className="p-space-md rounded-lg bg-surface-container-low border border-outline-variant/20 space-y-1">
              <span className="text-xs text-on-surface-variant font-semibold">Minimum Withdrawal Threshold</span>
              <div className="font-headline text-xl font-bold text-on-surface">₹100.00 (10,000 paise)</div>
              <p className="text-[11px] text-on-surface-variant">Enforced at API gateway before initiating banking payout</p>
            </div>

            <div className="p-space-md rounded-lg bg-surface-container-low border border-outline-variant/20 space-y-1">
              <span className="text-xs text-on-surface-variant font-semibold">Max Daily Creator Earning Cap</span>
              <div className="font-headline text-xl font-bold text-on-surface">₹5,000.00 (500,000 paise)</div>
              <p className="text-[11px] text-on-surface-variant">Anti-sybil velocity ceiling to mitigate credential stuffing</p>
            </div>

            <div className="p-space-md rounded-lg bg-surface-container-low border border-outline-variant/20 space-y-1">
              <span className="text-xs text-on-surface-variant font-semibold">Payout Rail Mode</span>
              <div className="font-headline text-xl font-bold text-secondary">
                {data?.settings?.payoutMode === 'sandbox' ? 'SANDBOX NODAL POOL' : 'LIVE BANKING'}
              </div>
              <p className="text-[11px] text-on-surface-variant">Deterministic UPI 2.0 / IMPS clearing with real UTR tracking</p>
            </div>
          </div>
        </div>

        {/* API Keys Management */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-md">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-space-sm">
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface">Registered API Keys & Webhooks</h2>
              <p className="text-xs text-on-surface-variant">Secret credentials are encrypted at rest and never exposed via API</p>
            </div>
            <button
              onClick={() => alert('Secret rotation policy: generate new key pair through server CLI')}
              className="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary text-xs font-semibold hover:bg-opacity-90 transition-opacity"
            >
              + Rotate Keys
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant text-xs uppercase tracking-wider border-b border-outline-variant/20">
                  <th className="py-2.5 px-space-md font-semibold">Key Identifier</th>
                  <th className="py-2.5 px-space-md font-semibold">Key Name</th>
                  <th className="py-2.5 px-space-md font-semibold">Prefix</th>
                  <th className="py-2.5 px-space-md font-semibold">Status</th>
                  <th className="py-2.5 px-space-md font-semibold">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-sm">
                {(data?.apiKeys || []).map((k: any) => (
                  <tr key={k.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-3 px-space-md font-mono text-xs font-semibold">{k.id}</td>
                    <td className="py-3 px-space-md text-xs font-medium text-on-surface">{k.name}</td>
                    <td className="py-3 px-space-md font-mono text-xs text-secondary font-bold">{k.prefix}</td>
                    <td className="py-3 px-space-md">
                      <span className="px-2 py-0.5 rounded-full bg-secondary-container/50 text-secondary text-xs font-semibold">
                        {k.status}
                      </span>
                    </td>
                    <td className="py-3 px-space-md text-xs text-on-surface-variant">{k.created}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Role Permissions Matrix */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-md">
          <h2 className="font-headline text-base font-bold text-on-surface">Role-Based Access Control (RBAC) Hierarchy</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md text-xs">
            <div className="p-space-md rounded-lg bg-surface-container-low border border-outline-variant/20 space-y-2">
              <strong className="text-sm font-bold text-on-surface block">Role: USER / CREATOR</strong>
              <p className="text-on-surface-variant">
                Voluntary task discovery, authenticated task telemetry submission, double-entry wallet balance review, voluntary UPI payout withdrawal.
              </p>
            </div>
            <div className="p-space-md rounded-lg bg-surface-container-low border border-outline-variant/20 space-y-2">
              <strong className="text-sm font-bold text-on-surface block">Role: ADVERTISER / BRAND</strong>
              <p className="text-on-surface-variant">
                Tenant-isolated campaign creation, escrow fund reservation, live conversion telemetry inspection, GST tax invoice access.
              </p>
            </div>
            <div className="p-space-md rounded-lg bg-surface-container-low border border-outline-variant/20 space-y-2">
              <strong className="text-sm font-bold text-on-surface block">Role: SUPER ADMIN</strong>
              <p className="text-on-surface-variant">
                Global platform oversight, human-in-the-loop ad moderation, forensic lab anomaly review, dual-approval nodal payout clearance, immutable audit logs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
