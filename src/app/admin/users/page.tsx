'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/navigation/AdminLayout';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  kycTier: string;
  kycStatus: string;
  createdAt: string;
  wallet?: {
    availablePaise: number;
    pendingPaise: number;
    escrowPaise: number;
    lifetimeEarnedPaise: number;
  };
  userOrganizations?: Array<{
    organization: { id: string; name: string; isVerified: boolean };
  }>;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  function fetchUsers() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (roleFilter) params.set('role', roleFilter);
    if (statusFilter) params.set('status', statusFilter);

    fetch(`/api/admin/users?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.users) setUsers(data.users);
        if (data.totalCount !== undefined) setTotalCount(data.totalCount);
      })
      .catch(() => setMessage({ text: 'Failed to fetch user directory', type: 'error' }))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  async function handleStatusChange(userId: string, newStatus: string, newTier?: string) {
    setActionLoading(true);
    setMessage(null);

    try {
      const payload: any = { userId };
      if (newStatus) payload.status = newStatus;
      if (newTier) payload.kycTier = newTier;

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ text: data.message, type: 'success' });
        fetchUsers();
        if (selectedUser && selectedUser.id === userId) {
          setSelectedUser((prev) => prev ? { ...prev, status: newStatus || prev.status, kycTier: newTier || prev.kycTier } : null);
        }
      } else {
        setMessage({ text: data.error || 'Failed to update user status', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error updating user', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <AdminLayout>
      <div className="w-full max-w-[1280px] mx-auto px-space-lg py-space-xl space-y-space-lg">
        {/* Header */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[24px]">manage_accounts</span>
              <h1 className="font-headline text-2xl font-bold text-on-surface">
                User Management & Identity Desk
              </h1>
            </div>
            <p className="text-sm text-on-surface-variant mt-1">
              Inspect user identities, KYC compliance tiers, financial balances, and administrative account statuses across the network.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-secondary-container/40 text-secondary text-xs font-bold">
              {totalCount} Total Accounts
            </span>
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

        {/* Filters Bar */}
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchUsers();
            }}
            className="flex-1 w-full sm:w-auto flex gap-2"
          >
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-xs focus:border-secondary outline-none font-medium"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-secondary text-on-secondary text-xs font-bold shrink-0 hover:bg-on-secondary-container transition-colors shadow-xs"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-xs focus:border-secondary outline-none font-semibold text-on-surface"
            >
              <option value="">All Roles</option>
              <option value="USER">User / Creator</option>
              <option value="ADVERTISER">Brand / Advertiser</option>
              <option value="ADMIN">Administrator</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-xs focus:border-secondary outline-none font-semibold text-on-surface"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="PENDING_VERIFICATION">Pending Verification</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-on-surface-variant font-medium">Loading user records...</div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-xs text-on-surface-variant font-medium">No user accounts matched the filter criteria.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-outline-variant/20 bg-surface-container-low text-on-surface-variant font-semibold">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">KYC Tier</th>
                    <th className="py-3 px-4">Wallet Balance</th>
                    <th className="py-3 px-4">Joined</th>
                    <th className="py-3 px-4 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {users.map((u) => {
                    const availableRupees = (Number(u.wallet?.availablePaise || 0) / 100).toFixed(2);
                    const escrowRupees = (Number(u.wallet?.escrowPaise || 0) / 100).toFixed(2);

                    return (
                      <tr key={u.id} className="hover:bg-surface-container-low/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-on-surface">{u.name || 'Unnamed'}</div>
                          <div className="text-[11px] text-on-surface-variant font-mono">{u.email}</div>
                          {u.userOrganizations && u.userOrganizations.length > 0 && (
                            <div className="text-[10px] text-secondary font-semibold mt-0.5">
                              Org: {u.userOrganizations[0].organization.name}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === 'ADMIN'
                              ? 'bg-error-container text-on-error-container'
                              : u.role === 'ADVERTISER'
                              ? 'bg-primary-container text-on-primary'
                              : 'bg-surface-container text-on-surface'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.status === 'ACTIVE'
                              ? 'bg-secondary-container/40 text-secondary'
                              : u.status === 'SUSPENDED'
                              ? 'bg-error-container text-error'
                              : 'bg-surface-container text-on-surface-variant'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded border border-outline-variant/30 text-[10px] font-mono font-bold">
                            {u.kycTier}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {u.role === 'ADVERTISER' ? (
                            <div>
                              <span className="font-bold text-on-surface">₹{escrowRupees}</span>
                              <span className="text-[10px] text-on-surface-variant block">Escrow Pool</span>
                            </div>
                          ) : (
                            <div>
                              <span className="font-bold text-on-surface">₹{availableRupees}</span>
                              <span className="text-[10px] text-on-surface-variant block">Withdrawable</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-on-surface-variant text-[11px]">
                          {new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5">
                          {u.status === 'ACTIVE' ? (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleStatusChange(u.id, 'SUSPENDED')}
                              className="px-2.5 py-1 rounded bg-error-container text-error hover:opacity-80 text-[11px] font-bold transition-all"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleStatusChange(u.id, 'ACTIVE')}
                              className="px-2.5 py-1 rounded bg-secondary-container/40 text-secondary hover:opacity-80 text-[11px] font-bold transition-all"
                            >
                              Activate
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedUser(u)}
                            className="px-2.5 py-1 rounded bg-surface-container text-on-surface hover:bg-surface-container-high text-[11px] font-semibold transition-all"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* User Details Drawer / Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 border border-outline-variant/40 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[22px]">badge</span>
                  <h3 className="font-headline text-base font-bold text-on-surface">Account Forensic Dossier</h3>
                </div>
                <button onClick={() => setSelectedUser(null)} className="p-1 rounded text-on-surface-variant hover:text-on-surface">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-surface-container-low border border-outline-variant/30">
                  <div>
                    <span className="text-on-surface-variant block text-[10px]">Account ID</span>
                    <span className="font-mono text-on-surface font-semibold text-[11px] break-all">{selectedUser.id}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block text-[10px]">Email Address</span>
                    <span className="font-mono text-on-surface font-semibold text-[11px]">{selectedUser.email}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/30">
                    <span className="text-on-surface-variant block text-[10px]">System Role</span>
                    <span className="font-bold text-on-surface">{selectedUser.role}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/30">
                    <span className="text-on-surface-variant block text-[10px]">Status</span>
                    <span className="font-bold text-on-surface">{selectedUser.status}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/30">
                    <span className="text-on-surface-variant block text-[10px]">KYC Tier</span>
                    <span className="font-bold text-on-surface">{selectedUser.kycTier}</span>
                  </div>
                </div>

                {/* KYC Upgrade Action */}
                <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/30 space-y-2">
                  <span className="text-[11px] font-bold text-on-surface block">Modify KYC Compliance Tier</span>
                  <div className="flex gap-2">
                    {(['TIER_0', 'TIER_1', 'TIER_2'] as const).map((tier) => (
                      <button
                        key={tier}
                        onClick={() => handleStatusChange(selectedUser.id, selectedUser.status, tier)}
                        className={`flex-1 py-1.5 rounded text-[11px] font-bold border transition-all ${
                          selectedUser.kycTier === tier
                            ? 'bg-secondary text-on-secondary border-secondary'
                            : 'bg-surface border-outline-variant/40 text-on-surface hover:border-secondary'
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 rounded-lg bg-surface-container text-on-surface text-xs font-bold hover:bg-surface-container-high transition-colors"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
