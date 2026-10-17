'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/navigation/AdminLayout';
import { formatINR } from '@/lib/currency';

export default function AdminModerationPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    fetchQueue();
  }, []);

  function fetchQueue() {
    setLoading(true);
    fetch('/api/admin/moderation')
      .then((res) => res.json())
      .then((data) => {
        setCampaigns(data.campaigns || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }

  async function handleDecision(campaignId: string, decision: 'ACTIVE' | 'REJECTED') {
    const reviewerNotes = decision === 'ACTIVE' ? 'Approved - Compliant with ASCI guidelines and funded' : 'Rejected - Destination or policy non-compliance';
    const res = await fetch('/api/admin/moderation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, decision, reviewerNotes }),
    });

    if (res.ok) {
      setActionMsg(`Campaign updated to ${decision}.`);
      fetchQueue();
    }
  }

  return (
    <AdminLayout>
      <div className="p-space-lg space-y-space-lg max-w-[1520px] mx-auto w-full">
        {/* Header matching Stitch Screen 14 */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div>
            <h1 className="font-headline text-2xl font-bold text-on-surface">Moderation & Campaign Ad Approval</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Verify advertiser authorization evidence, domain destinations, ASCI disclosure adherence, and escrow reserves before public flight.
            </p>
          </div>
          <span className="px-3 py-1.5 rounded-lg bg-secondary-container/40 text-secondary text-xs font-semibold">
            Human-in-the-Loop Review Desk
          </span>
        </div>

        {actionMsg && (
          <div className="p-3 rounded-lg bg-secondary-container/30 border border-secondary/30 text-secondary text-xs font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{actionMsg}</span>
          </div>
        )}

        {/* Campaign Moderation Cards */}
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-sm text-on-surface-variant">Loading moderation queue...</div>
          ) : campaigns.length === 0 ? (
            <div className="p-12 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/30">
              No campaigns in moderation queue.
            </div>
          ) : (
            campaigns.map((camp) => (
              <div
                key={camp.id}
                className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-space-md"
              >
                <div className="space-y-2 max-w-3xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-on-surface bg-surface-container px-2 py-0.5 rounded">
                      ID: #{camp.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="text-xs font-bold text-secondary">
                      {camp.organization.name} {camp.organization.isVerified && '✓'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-surface-container-low text-[11px] font-semibold text-on-surface-variant uppercase">
                      {camp.actionType.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="font-headline text-lg font-bold text-on-surface">{camp.title}</h3>
                  <p className="text-xs text-on-surface-variant">{camp.description}</p>

                  <div className="flex items-center gap-4 text-xs text-on-surface-variant pt-1">
                    <span>
                      Destination: <a href={camp.targetUrl} target="_blank" rel="noreferrer" className="text-secondary hover:underline font-mono">{camp.targetUrl}</a>
                    </span>
                    <span>Allocated: <strong className="text-on-surface">{formatINR(camp.budgetAllocatedPaise)}</strong></span>
                    <span>CPO: <strong className="text-on-surface">{formatINR(camp.costPerOutcomePaise)}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    camp.status === 'ACTIVE'
                      ? 'bg-secondary-container/50 text-secondary'
                      : camp.status === 'REJECTED'
                      ? 'bg-error-container text-on-error-container'
                      : 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                  }`}>
                    {camp.status}
                  </span>

                  {camp.status !== 'ACTIVE' && (
                    <button
                      onClick={() => handleDecision(camp.id, 'ACTIVE')}
                      className="px-4 py-2 rounded-lg bg-secondary text-on-secondary text-xs font-bold hover:bg-on-secondary-container transition-colors shadow-xs"
                    >
                      Approve & Launch
                    </button>
                  )}

                  {camp.status !== 'REJECTED' && (
                    <button
                      onClick={() => handleDecision(camp.id, 'REJECTED')}
                      className="px-4 py-2 rounded-lg bg-error text-on-error text-xs font-bold hover:bg-opacity-90 transition-colors shadow-xs"
                    >
                      Reject Campaign
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
