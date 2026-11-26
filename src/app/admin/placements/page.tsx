'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/navigation/AdminLayout';

interface Placement {
  id: string;
  name: string;
  surfaceType: string;
  dimensions: string;
  status: string;
  floorCpmRupees: number;
  floorCpcRupees: number;
  minDwellSeconds: number;
  activeCampaignsCount: number;
  compliancePolicy: string;
  lastAudited: string;
}

export default function AdminPlacementsPage() {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFloorCpm, setEditFloorCpm] = useState('');
  const [editFloorCpc, setEditFloorCpc] = useState('');
  const [editDwell, setEditDwell] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  function fetchPlacements() {
    setLoading(true);
    fetch('/api/admin/placements')
      .then((res) => res.json())
      .then((data) => {
        if (data.placements) setPlacements(data.placements);
      })
      .catch(() => setMessage({ text: 'Failed to load inventory placements', type: 'error' }))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchPlacements();
  }, []);

  async function handleToggleStatus(p: Placement) {
    const newStatus = p.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      const res = await fetch('/api/admin/placements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placementId: p.id, status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ text: `${p.name} set to ${newStatus}`, type: 'success' });
        fetchPlacements();
      } else {
        setMessage({ text: data.error || 'Failed to update status', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error updating placement status', type: 'error' });
    }
  }

  async function handleSaveRates(id: string) {
    try {
      const payload: any = { placementId: id };
      if (editFloorCpm) payload.floorCpmRupees = parseFloat(editFloorCpm);
      if (editFloorCpc) payload.floorCpcRupees = parseFloat(editFloorCpc);
      if (editDwell) payload.minDwellSeconds = parseFloat(editDwell);

      const res = await fetch('/api/admin/placements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ text: 'Placement parameters updated successfully.', type: 'success' });
        setEditingId(null);
        fetchPlacements();
      } else {
        setMessage({ text: data.error || 'Failed to save parameters', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error saving placement parameters', type: 'error' });
    }
  }

  return (
    <AdminLayout>
      <div className="w-full max-w-[1280px] mx-auto px-space-lg py-space-xl space-y-space-lg">
        {/* Header */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[24px]">view_carousel</span>
              <h1 className="font-headline text-2xl font-bold text-on-surface">
                Inventory Placement & Floor Rate Management
              </h1>
            </div>
            <p className="text-sm text-on-surface-variant mt-1">
              Configure eligible advertising surfaces, viewability thresholds, minimum floor bids, and platform compliance invariants.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-secondary">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>Chrome Web Store Compliant Surfaces</span>
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

        {/* Policy Invariant Alert */}
        <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-start gap-3">
          <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5">policy</span>
          <div>
            <span className="text-xs font-bold text-on-surface block">Policy Safeguard Directive: Zero Third-Party DOM Manipulation</span>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              AdEarn AI inventory is served strictly inside owned browser extension surfaces (Popup and Side Panel) or the first-party web task feed. Third-party web page injection (including ChatGPT, Google, or YouTube) is permanently disabled to ensure 100% Chrome Web Store Single-Purpose policy compliance.
            </p>
          </div>
        </div>

        {/* Placements Cards Grid */}
        {loading ? (
          <div className="p-12 text-center text-xs text-on-surface-variant">Loading inventory surfaces...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
            {placements.map((p) => (
              <div key={p.id} className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-headline text-sm font-bold text-on-surface">{p.name}</h3>
                      <span className="text-[10px] font-mono text-on-surface-variant block mt-0.5">{p.id}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      p.status === 'ACTIVE' ? 'bg-secondary-container/40 text-secondary' : 'bg-surface-container text-on-surface-variant'
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-outline-variant/10">
                      <span className="text-on-surface-variant">Surface Type</span>
                      <span className="font-semibold text-on-surface font-mono text-[11px]">{p.surfaceType}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-outline-variant/10">
                      <span className="text-on-surface-variant">Viewport Dimensions</span>
                      <span className="font-semibold text-on-surface font-mono">{p.dimensions}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-outline-variant/10">
                      <span className="text-on-surface-variant">Floor CPM</span>
                      <span className="font-bold text-on-surface">₹{p.floorCpmRupees.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-outline-variant/10">
                      <span className="text-on-surface-variant">Floor CPC</span>
                      <span className="font-bold text-on-surface">₹{p.floorCpcRupees.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-outline-variant/10">
                      <span className="text-on-surface-variant">Min Viewability Dwell</span>
                      <span className="font-bold text-on-surface">{p.minDwellSeconds}s</span>
                    </div>
                  </div>

                  <div className="mt-3 p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20 text-[10px] text-on-surface-variant">
                    {p.compliancePolicy}
                  </div>
                </div>

                {editingId === p.id ? (
                  <div className="p-3 rounded-lg bg-surface-container space-y-2 border border-outline-variant/30 text-xs">
                    <span className="font-bold text-on-surface block text-[11px]">Edit Floor Parameters</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[9px] text-on-surface-variant block">Floor CPM (₹)</span>
                        <input
                          type="number"
                          value={editFloorCpm}
                          onChange={(e) => setEditFloorCpm(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-surface border border-outline-variant/40 text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-on-surface-variant block">Floor CPC (₹)</span>
                        <input
                          type="number"
                          value={editFloorCpc}
                          onChange={(e) => setEditFloorCpc(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-surface border border-outline-variant/40 text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-on-surface-variant block">Dwell (s)</span>
                        <input
                          type="number"
                          step="0.5"
                          value={editDwell}
                          onChange={(e) => setEditDwell(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-surface border border-outline-variant/40 text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1 rounded bg-surface text-on-surface text-[11px] font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveRates(p.id)}
                        className="px-3 py-1 rounded bg-secondary text-on-secondary text-[11px] font-bold"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20">
                    <button
                      onClick={() => {
                        setEditingId(p.id);
                        setEditFloorCpm(p.floorCpmRupees.toString());
                        setEditFloorCpc(p.floorCpcRupees.toString());
                        setEditDwell(p.minDwellSeconds.toString());
                      }}
                      className="px-3 py-1.5 rounded bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high transition-colors"
                    >
                      Configure
                    </button>
                    <button
                      onClick={() => handleToggleStatus(p)}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                        p.status === 'ACTIVE'
                          ? 'bg-error-container text-error hover:opacity-80'
                          : 'bg-secondary-container/40 text-secondary hover:opacity-80'
                      }`}
                    >
                      {p.status === 'ACTIVE' ? 'Pause Surface' : 'Activate Surface'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
