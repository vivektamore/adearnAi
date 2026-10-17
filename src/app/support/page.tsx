'use client';

import React, { useEffect, useState } from 'react';
import UserLayout from '@/components/navigation/UserLayout';

interface DisputeItem {
  id: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
  resolutionNotes: string | null;
}

export default function SupportPage() {
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    fetchDisputes();
  }, []);

  function fetchDisputes() {
    fetch('/api/disputes')
      .then((res) => res.json())
      .then((data) => {
        setDisputes(data.disputes || []);
      })
      .catch((err) => console.error(err));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatusMsg('');

    try {
      const res = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, description, evidenceUrl }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMsg(data.message || 'Ticket filed successfully.');
        setSubject('');
        setDescription('');
        setEvidenceUrl('');
        fetchDisputes();
      } else {
        setStatusMsg(data.error || 'Failed to submit ticket.');
      }
    } catch {
      setStatusMsg('Network error while filing dispute.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <UserLayout>
      <div className="w-full max-w-[1080px] mx-auto px-space-lg py-space-xl space-y-space-lg">
        {/* Header matching Stitch Screen 07 */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div>
            <h1 className="font-headline text-2xl font-bold text-on-surface">Help Centre & Reward Disputes</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              File audited reward discrepancy disputes or report non-compliant sponsored content to our operations desk.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/30 text-xs font-semibold text-secondary flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">support_agent</span>
            <span>45-Minute SLA Operations Desk</span>
          </div>
        </div>

        {/* Dispute Form and FAQ Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
          {/* Dispute Ticket Form */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-md">
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface">File a Dispute or Inquiry</h2>
              <p className="text-xs text-on-surface-variant">Our compliance officers investigate every task and payout query with full ledger telemetry</p>
            </div>

            {statusMsg && (
              <div className="p-3 rounded-lg bg-secondary-container/30 border border-secondary/30 text-secondary text-xs flex items-center gap-2 font-semibold">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>{statusMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface">Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Discrepancy on Task #CAMP-ZR-091 verification"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-sm focus:border-secondary outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface">Detailed Explanation</label>
                <textarea
                  rows={4}
                  placeholder="Provide details regarding the campaign, engagement timestamp, or payout issue..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-sm focus:border-secondary outline-none resize-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface">Evidence / Screenshot Link (Optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-sm focus:border-secondary outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-secondary text-on-secondary font-bold text-sm hover:bg-on-secondary-container transition-colors shadow-xs"
              >
                {submitting ? 'Submitting to Desk...' : 'Submit Dispute Ticket'}
              </button>
            </form>
          </div>

          {/* Quick FAQ and Guides */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-md">
            <h2 className="font-headline text-base font-bold text-on-surface">Frequently Asked Questions</h2>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20">
                <h4 className="font-bold text-on-surface">How long does advertiser validation take?</h4>
                <p className="text-on-surface-variant mt-1">
                  Most automated campaigns validate telemetry within seconds. Complex trials or surveys have a maximum 24–48 hour escrow clearance window.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20">
                <h4 className="font-bold text-on-surface">What is the minimum withdrawal threshold?</h4>
                <p className="text-on-surface-variant mt-1">
                  The minimum withdrawable balance is ₹100.00. This ensures zero fees on UPI 2.0 transfers while maintaining high regulatory efficiency.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20">
                <h4 className="font-bold text-on-surface">How are my earnings taxed?</h4>
                <p className="text-on-surface-variant mt-1">
                  Rewards are subject to Indian Income Tax regulations. Annual financial statements are downloadable from your Wallet page.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Existing Disputes Table */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-md">
          <h2 className="font-headline text-base font-bold text-on-surface">Your Support & Dispute History</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant text-xs uppercase tracking-wider border-b border-outline-variant/20">
                  <th className="py-2.5 px-space-md font-semibold">Ticket ID</th>
                  <th className="py-2.5 px-space-md font-semibold">Subject</th>
                  <th className="py-2.5 px-space-md font-semibold">Submitted</th>
                  <th className="py-2.5 px-space-md font-semibold">Status</th>
                  <th className="py-2.5 px-space-md font-semibold">Resolution Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-sm">
                {disputes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-on-surface-variant">
                      No dispute tickets on file. All your activities are in good standing!
                    </td>
                  </tr>
                ) : (
                  disputes.map((d) => (
                    <tr key={d.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3 px-space-md text-xs font-mono font-medium">#{d.id.slice(-6).toUpperCase()}</td>
                      <td className="py-3 px-space-md text-xs font-semibold text-on-surface">{d.subject}</td>
                      <td className="py-3 px-space-md text-xs text-on-surface-variant">
                        {new Date(d.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 px-space-md">
                        <span className="px-2 py-0.5 rounded-full bg-secondary-container/40 text-secondary text-xs font-semibold">
                          {d.status}
                        </span>
                      </td>
                      <td className="py-3 px-space-md text-xs text-on-surface-variant">
                        {d.resolutionNotes || 'In queue with operations officer'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
