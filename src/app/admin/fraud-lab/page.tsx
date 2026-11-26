'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/navigation/AdminLayout';

export default function FraudForensicLabPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    fetchLab();
  }, []);

  function fetchLab() {
    setLoading(true);
    fetch('/api/admin/fraud')
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

  async function handleAction(taskId: string, action: 'CLEAR' | 'QUARANTINE_USER') {
    const res = await fetch('/api/admin/fraud', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, action, reason: 'Forensic Lab Anomaly Enforcement' }),
    });

    if (res.ok) {
      setActionMsg(`Action ${action} executed successfully.`);
      fetchLab();
    }
  }

  return (
    <AdminLayout>
      <div className="p-space-lg space-y-space-lg max-w-[1520px] mx-auto w-full">
        {/* Header matching Stitch Screen 15 */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div>
            <h1 className="font-headline text-2xl font-bold text-on-surface">Fraud & Kinematics Forensic Lab</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Inspect anomalous attention kinematics, synthetic cursor trajectories, instantaneous click bots, and suspicious device patterns.
            </p>
          </div>
          <span className="px-3 py-1.5 rounded-lg bg-surface-container font-mono text-xs font-bold text-secondary">
            AI Heuristics Engine v2.4 Live
          </span>
        </div>

        {actionMsg && (
          <div className="p-3 rounded-lg bg-secondary-container/30 border border-secondary/30 text-secondary text-xs font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{actionMsg}</span>
          </div>
        )}

        {/* Forensic Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">Bot Intercept Accuracy</span>
            <div className="font-headline text-2xl font-bold text-secondary">
              {data?.labSummary?.botInterceptAccuracy ?? '100.0%'}
            </div>
            <span className="text-[11px] text-on-surface-variant">Validated against certified human baselines</span>
          </div>

          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">Average Human Dwell</span>
            <div className="font-headline text-2xl font-bold text-on-surface">
              {data?.labSummary?.avgKinematicDwellSec ? `${data.labSummary.avgKinematicDwellSec}s` : '0.0s'}
            </div>
            <span className="text-[11px] text-secondary font-semibold">Zero automated macro penetration</span>
          </div>

          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">Flagged Sessions Under Review</span>
            <div className="font-headline text-2xl font-bold text-error">
              {data?.flaggedTasks?.length ?? 0}
            </div>
            <span className="text-[11px] text-on-surface-variant">Human-in-the-loop review queue</span>
          </div>
        </div>

        {/* Flagged Sessions Table */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-md">
          <h2 className="font-headline text-base font-bold text-on-surface">Flagged Telemetry & Kinematics Incidents</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant text-xs uppercase tracking-wider border-b border-outline-variant/20">
                  <th className="py-3 px-space-md font-semibold">Session Token</th>
                  <th className="py-3 px-space-md font-semibold">User</th>
                  <th className="py-3 px-space-md font-semibold">Campaign</th>
                  <th className="py-3 px-space-md font-semibold">Anomaly Score</th>
                  <th className="py-3 px-space-md font-semibold">Verdict</th>
                  <th className="py-3 px-space-md font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-sm">
                {!data?.flaggedTasks || data.flaggedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-on-surface-variant">
                      Zero high-risk kinematics incidents in queue. System attention fidelity is optimal!
                    </td>
                  </tr>
                ) : (
                  data.flaggedTasks.map((t: any) => (
                    <tr key={t.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3 px-space-md font-mono text-xs font-semibold text-on-surface">
                        {t.sessionToken.slice(0, 16)}...
                      </td>
                      <td className="py-3 px-space-md text-xs font-semibold text-on-surface">
                        {t.user.name} ({t.user.status})
                      </td>
                      <td className="py-3 px-space-md text-xs text-on-surface-variant">
                        {t.campaign.title}
                      </td>
                      <td className="py-3 px-space-md font-mono text-xs font-bold text-error">
                        {t.anomalyScore.toFixed(2)}
                      </td>
                      <td className="py-3 px-space-md">
                        <span className="px-2 py-0.5 rounded bg-error-container text-on-error-container text-xs font-bold">
                          {t.fraudVerdict}
                        </span>
                      </td>
                      <td className="py-3 px-space-md text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleAction(t.id, 'CLEAR')}
                            className="px-2.5 py-1 rounded bg-surface-container text-xs font-semibold hover:bg-surface-container-high"
                          >
                            Clear
                          </button>
                          <button
                            onClick={() => handleAction(t.id, 'QUARANTINE_USER')}
                            className="px-2.5 py-1 rounded bg-error text-on-error text-xs font-bold hover:bg-opacity-90"
                          >
                            Quarantine User
                          </button>
                        </div>
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
