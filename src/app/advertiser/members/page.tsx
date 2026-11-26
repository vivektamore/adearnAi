'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdvertiserLayout from '@/components/navigation/AdvertiserLayout';

interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  orgRole: string;
  systemRole: string;
  status: string;
  kycTier: string;
  joinedAt: string;
}

export default function BrandMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  function fetchMembers() {
    setLoading(true);
    fetch('/api/advertiser/members')
      .then((res) => res.json())
      .then((data) => {
        if (data.members) setMembers(data.members);
        if (data.organization?.name) setOrgName(data.organization.name);
      })
      .catch(() => setMessage({ text: 'Failed to load team members.', type: 'error' }))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchMembers();
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/advertiser/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ text: data.message, type: 'success' });
        setInviteEmail('');
        fetchMembers();
      } else {
        setMessage({ text: data.error || 'Failed to add member.', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error while adding member.', type: 'error' });
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(membershipId: string) {
    if (!confirm('Are you sure you want to remove this team member?')) return;

    try {
      const res = await fetch(`/api/advertiser/members?id=${membershipId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ text: 'Team member removed.', type: 'success' });
        fetchMembers();
      } else {
        setMessage({ text: data.error || 'Failed to remove member.', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error while removing member.', type: 'error' });
    }
  }

  return (
    <AdvertiserLayout>
      <div className="w-full max-w-[1080px] mx-auto px-space-lg py-space-xl space-y-space-lg">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <Link href="/advertiser" className="hover:text-on-surface">Advertiser Studio</Link>
          <span>/</span>
          <span className="text-on-surface font-semibold">Team Members & Access</span>
        </div>

        {/* Page Header */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
          <div>
            <h1 className="font-headline text-2xl font-bold text-on-surface">
              Team & Organization Access
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Manage organization members authorized to access {orgName || 'your brand'} campaigns, billing, and escrow reports.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-secondary">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>Role-Based Access Control</span>
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
            message.type === 'success' ? 'bg-secondary-container/40 text-secondary' : 'bg-error-container text-on-error-container'
          }`}>
            <span className="material-symbols-outlined text-[18px]">
              {message.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{message.text}</span>
          </div>
        )}

        {/* Add Team Member Card */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">person_add</span>
            <h2 className="font-headline text-sm font-bold text-on-surface">Add Team Member</h2>
          </div>

          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              placeholder="colleague@yourcompany.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-xs focus:border-secondary outline-none"
              required
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'MEMBER' | 'ADMIN')}
              className="px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-xs focus:border-secondary outline-none"
            >
              <option value="MEMBER">Member (Campaign & Analytics Viewer)</option>
              <option value="ADMIN">Admin (Campaign & Escrow Manager)</option>
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="px-4 py-2 rounded-lg bg-secondary text-on-secondary text-xs font-bold hover:bg-on-secondary-container transition-colors shadow-xs flex items-center justify-center gap-1.5 shrink-0"
            >
              {inviting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-on-secondary border-t-transparent rounded-full animate-spin"></div>
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Add Member</span>
                </>
              )}
            </button>
          </form>
          <p className="text-[11px] text-on-surface-variant">
            Team members must have an active AdEarn AI account with their business email.
          </p>
        </div>

        {/* Team Members Table */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-outline-variant/20 flex items-center justify-between">
            <span className="font-headline text-sm font-bold text-on-surface">Authorized Members ({members.length})</span>
            <button onClick={fetchMembers} className="p-1 rounded text-on-surface-variant hover:text-on-surface" title="Refresh">
              <span className="material-symbols-outlined text-[18px]">refresh</span>
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-on-surface-variant">Loading members...</div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-xs text-on-surface-variant">No members found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-outline-variant/20 bg-surface-container-low text-on-surface-variant font-semibold">
                    <th className="py-2.5 px-4">Member Name</th>
                    <th className="py-2.5 px-4">Email</th>
                    <th className="py-2.5 px-4">Role</th>
                    <th className="py-2.5 px-4">KYC Tier</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="py-3 px-4 font-semibold text-on-surface flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-[10px]">
                          {m.name ? m.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <span>{m.name || 'Anonymous User'}</span>
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant font-mono">{m.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.orgRole === 'OWNER'
                            ? 'bg-secondary/15 text-secondary'
                            : m.orgRole === 'ADMIN'
                            ? 'bg-primary-container text-on-primary'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}>
                          {m.orgRole}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant">{m.kycTier}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          m.status === 'ACTIVE' ? 'bg-secondary-container/40 text-secondary' : 'bg-error-container text-on-error-container'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {m.orgRole !== 'OWNER' && (
                          <button
                            onClick={() => handleRemove(m.id)}
                            className="px-2 py-1 rounded text-error hover:bg-error-container transition-colors text-[11px] font-semibold"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdvertiserLayout>
  );
}
