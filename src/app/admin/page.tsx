'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/navigation/AdminLayout';
import { formatINR } from '@/lib/currency';

export default function AdminOperationsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/overview')
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
        {/* Header matching Stitch Screen 13 */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div>
            <div className="flex items-center gap-space-sm flex-wrap">
              <h1 className="font-headline text-2xl font-bold text-on-surface">Admin Operations Command Center</h1>
              <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
                Master Control Active
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mt-1">
              Real-time platform throughput telemetry, queue depths, fraud alerts, and nodal escrow liability monitoring.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/moderation"
              className="px-3.5 py-2 rounded-lg bg-secondary text-on-secondary text-xs font-bold hover:bg-on-secondary-container transition-colors shadow-xs"
            >
              Moderation Queue ({data?.metrics?.pendingModeration ?? 0})
            </Link>
            <Link
              href="/admin/payouts"
              className="px-3.5 py-2 rounded-lg bg-primary-container text-on-primary text-xs font-bold hover:bg-opacity-90 transition-colors shadow-xs"
            >
              Nodal Pool ({data?.metrics?.pendingPayouts ?? 0})
            </Link>
          </div>
        </div>

        {/* Operational Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">Total Escrow Liabilities</span>
            <div className="font-headline text-2xl font-bold text-secondary tabular-nums">
              {formatINR(data?.metrics?.totalEscrowPaise ?? 0)}
            </div>
            <span className="text-[11px] text-on-surface-variant">100% backed in HDFC Nodal Pool</span>
          </div>

          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">Creator Wallet Liabilities</span>
            <div className="font-headline text-2xl font-bold text-on-surface tabular-nums">
              {formatINR(data?.metrics?.totalAvailablePaise ?? 0)}
            </div>
            <span className="text-[11px] text-on-surface-variant">Ready for instant UPI claim</span>
          </div>

          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">Active Campaigns Live</span>
            <div className="font-headline text-2xl font-bold text-on-surface">
              {data?.metrics?.activeCampaigns ?? 0}
            </div>
            <span className="text-[11px] text-secondary font-semibold">All flights adhering to ASCI</span>
          </div>

          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">Flagged Kinematic Sessions</span>
            <div className="font-headline text-2xl font-bold text-error">
              {data?.metrics?.flaggedFraud ?? 0}
            </div>
            <Link href="/admin/fraud-lab" className="text-[11px] text-error font-semibold hover:underline block">
              Inspect Forensic Lab →
            </Link>
          </div>
        </div>

        {/* Live Immutable Audit Trails Snapshot */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-md">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-space-sm">
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface">Recent Privileged Audit Logs</h2>
              <p className="text-xs text-on-surface-variant">Cryptographically signed compliance trail of sensitive operations</p>
            </div>
            <Link href="/admin/audit-logs" className="text-xs text-secondary font-semibold hover:underline">
              View All Logs →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant text-xs uppercase tracking-wider border-b border-outline-variant/20">
                  <th className="py-2.5 px-space-md font-semibold">Timestamp</th>
                  <th className="py-2.5 px-space-md font-semibold">Actor</th>
                  <th className="py-2.5 px-space-md font-semibold">Action</th>
                  <th className="py-2.5 px-space-md font-semibold">Entity</th>
                  <th className="py-2.5 px-space-md font-semibold">Cryptographic Digest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-sm">
                {(data?.recentAuditLogs || []).map((log: any) => (
                  <tr key={log.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-2.5 px-space-md text-xs text-on-surface-variant">
                      {new Date(log.createdAt).toLocaleTimeString('en-IN')}
                    </td>
                    <td className="py-2.5 px-space-md text-xs font-semibold text-on-surface">
                      {log.actor?.name || log.actorRole}
                    </td>
                    <td className="py-2.5 px-space-md">
                      <span className="px-2 py-0.5 rounded bg-surface-container font-mono text-xs font-bold text-on-surface">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-space-md text-xs text-on-surface-variant">
                      {log.entityType} ({log.entityId.slice(0, 8)}...)
                    </td>
                    <td className="py-2.5 px-space-md font-mono text-[11px] text-secondary">
                      {log.cryptographicHash.slice(0, 16)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
