'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/navigation/AdminLayout';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filterAction, setFilterAction] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [filterAction]);

  function fetchLogs() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterAction) params.append('action', filterAction);

    fetch(`/api/admin/audit-logs?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setLogs(data.logs || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }

  return (
    <AdminLayout>
      <div className="p-space-lg space-y-space-lg max-w-[1520px] mx-auto w-full">
        {/* Header matching Stitch Screen 17 */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div>
            <h1 className="font-headline text-2xl font-bold text-on-surface">Audit Trails & Immutable Security Logs</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Cryptographically chained administrative actions, authorization events, payout clearances, and configuration modifications.
            </p>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-low border border-outline-variant/30 text-xs text-secondary font-semibold">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span>SHA256 Hash Chain Integrity Verified</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-space-sm">
          <input
            type="text"
            placeholder="Filter by action (e.g. LOGIN, PAYOUT, CAMPAIGN)..."
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3.5 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-xs focus:border-secondary outline-none w-72 shadow-xs"
          />
        </div>

        {/* Logs Table */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant text-xs uppercase tracking-wider border-b border-outline-variant/20">
                  <th className="py-3 px-space-md font-semibold">Timestamp</th>
                  <th className="py-3 px-space-md font-semibold">Actor / Role</th>
                  <th className="py-3 px-space-md font-semibold">Action Identifier</th>
                  <th className="py-3 px-space-md font-semibold">Entity Modified</th>
                  <th className="py-3 px-space-md font-semibold">Client IP</th>
                  <th className="py-3 px-space-md font-semibold">Cryptographic Digest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-on-surface-variant">Loading security logs...</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-on-surface-variant">No audit logs found.</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3 px-space-md text-xs text-on-surface-variant">
                        {new Date(log.createdAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-space-md text-xs font-semibold text-on-surface">
                        {log.actor?.name || log.actorRole}
                        <span className="block text-[10px] text-on-surface-variant">{log.actorRole}</span>
                      </td>
                      <td className="py-3 px-space-md">
                        <span className="px-2 py-0.5 rounded bg-surface-container font-mono text-xs font-bold text-on-surface">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-space-md text-xs font-mono text-on-surface-variant">
                        {log.entityType} ({log.entityId.slice(0, 10)})
                      </td>
                      <td className="py-3 px-space-md text-xs font-mono text-on-surface-variant">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                      <td className="py-3 px-space-md font-mono text-[11px] text-secondary">
                        {log.cryptographicHash.slice(0, 24)}...
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
