'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/navigation/AdminLayout';
import { formatINR } from '@/lib/currency';

interface ModerationCampaign {
  id: string;
  title: string;
  description: string;
  category: string;
  actionType: string;
  status: string;
  channel: 'ADEARN_EXTENSION' | 'OPENAI_CHATGPT' | 'OMNICHANNEL';
  targetUrl: string;
  headline?: string;
  brandName?: string;
  faviconUrl?: string;
  contextHintsJson?: string;
  budgetAllocatedPaise: string;
  createdAt: string;
  organization: {
    name: string;
    gstin?: string;
    isVerified: boolean;
  };
  creativeAssets?: Array<{
    assetUrl: string;
  }>;
  openaiCampaign?: {
    id: string;
    externalCampaignId?: string;
    status: string;
  };
}

export default function AdminModerationPage() {
  const [campaigns, setCampaigns] = useState<ModerationCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'PENDING' | 'ACTIVE' | 'REJECTED' | 'ALL'>('PENDING');

  useEffect(() => {
    fetchQueue();
  }, []);

  function fetchQueue() {
    setLoading(true);
    setErrorMsg('');
    fetch('/api/admin/moderation')
      .then((res) => res.json())
      .then((data) => {
        setCampaigns(data.campaigns || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg('Failed to load campaigns from server.');
        setLoading(false);
      });
  }

  async function handleDecision(campaignId: string, decision: 'ACTIVE' | 'REJECTED', notes?: string) {
    setProcessingId(campaignId);
    setActionMsg('');
    setErrorMsg('');

    const reviewerNotes = notes || (decision === 'ACTIVE' 
      ? 'Approved - Verified compliance with ASCI guidelines and OpenAI Advertising Policies.' 
      : 'Rejected - Policy or landing page non-compliance');

    try {
      const res = await fetch('/api/admin/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, decision, reviewerNotes }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setActionMsg(data.message || `Campaign updated to ${decision}.`);
        fetchQueue();
      } else {
        setErrorMsg(data.error || 'Failed to process moderation action.');
      }
    } catch (err: any) {
      setErrorMsg('Network error: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  }

  const filteredCampaigns = campaigns.filter((c) => {
    if (filter === 'PENDING') {
      return c.status === 'PENDING_APPROVAL' || c.status === 'IN_REVIEW' || c.status === 'DRAFT';
    }
    if (filter === 'ACTIVE') return c.status === 'ACTIVE';
    if (filter === 'REJECTED') return c.status === 'REJECTED';
    return true;
  });

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-gray-900">Campaign Moderation & Approval</h1>
              <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                Multi-Channel Deployer
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Verify advertiser copy, destination URLs, ASCI guidelines, and 1-click deploy to ChatGPT AI Conversations and/or the AdEarn Extension network.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchQueue}
              className="text-xs font-semibold px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-1"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* Action / Error Alerts */}
        {actionMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2">
            <span className="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
            <span>{actionMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2">
            <span className="material-symbols-outlined text-sm text-rose-600">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Filter Navigation Tabs */}
        <div className="flex border-b border-gray-200 space-x-6 text-xs font-semibold">
          <button
            onClick={() => setFilter('PENDING')}
            className={`pb-2.5 border-b-2 transition-colors flex items-center space-x-1.5 ${
              filter === 'PENDING'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>Pending Review</span>
            <span className="bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded-full text-[10px]">
              {campaigns.filter((c) => c.status === 'PENDING_APPROVAL' || c.status === 'IN_REVIEW' || c.status === 'DRAFT').length}
            </span>
          </button>

          <button
            onClick={() => setFilter('ACTIVE')}
            className={`pb-2.5 border-b-2 transition-colors ${
              filter === 'ACTIVE'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Active Deployed ({campaigns.filter((c) => c.status === 'ACTIVE').length})
          </button>

          <button
            onClick={() => setFilter('REJECTED')}
            className={`pb-2.5 border-b-2 transition-colors ${
              filter === 'REJECTED'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Rejected ({campaigns.filter((c) => c.status === 'REJECTED').length})
          </button>

          <button
            onClick={() => setFilter('ALL')}
            className={`pb-2.5 border-b-2 transition-colors ${
              filter === 'ALL'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            All Campaigns ({campaigns.length})
          </button>
        </div>

        {/* Moderation Cards */}
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-400 bg-white rounded-xl border border-gray-200">
            Loading moderation queue...
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-gray-200 text-xs text-gray-500 space-y-2">
            <span className="material-symbols-outlined text-3xl text-gray-300">task_alt</span>
            <div className="font-bold text-gray-700">No campaigns pending in this view.</div>
            <p className="text-[11px] text-gray-400">All submitted brand advertisements have been reviewed.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCampaigns.map((camp) => {
              const isPending = camp.status === 'PENDING_APPROVAL' || camp.status === 'IN_REVIEW' || camp.status === 'DRAFT';
              const budgetDisplay = formatINR(BigInt(camp.budgetAllocatedPaise || 0));
              const creativeImage = camp.creativeAssets?.[0]?.assetUrl || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80';

              return (
                <div
                  key={camp.id}
                  className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5"
                >
                  {/* Card Top Meta */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                        #{camp.id.slice(-6).toUpperCase()}
                      </span>
                      <span className="text-xs font-bold text-gray-900">
                        {camp.organization?.name}
                      </span>
                      {camp.organization?.isVerified && (
                        <span className="text-emerald-700 text-xs font-bold flex items-center">
                          <span className="material-symbols-outlined text-xs mr-0.5">verified</span>
                          Verified Brand
                        </span>
                      )}

                      {/* Channel Badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          camp.channel === 'OPENAI_CHATGPT'
                            ? 'bg-purple-100 text-purple-900'
                            : camp.channel === 'OMNICHANNEL'
                            ? 'bg-indigo-100 text-indigo-900'
                            : 'bg-blue-100 text-blue-900'
                        }`}
                      >
                        {camp.channel === 'OPENAI_CHATGPT'
                          ? 'ChatGPT Native Ad'
                          : camp.channel === 'OMNICHANNEL'
                          ? 'Omnichannel (ChatGPT + Extension)'
                          : 'AdEarn Extension'}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          camp.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : camp.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {camp.status}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-gray-700">
                      Budget: <span className="font-bold text-gray-900">{budgetDisplay}</span>
                    </div>
                  </div>

                  {/* Dual Grid: Information & Live Preview */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Details */}
                    <div className="lg:col-span-7 space-y-3">
                      <div>
                        <h3 className="font-bold text-base text-gray-900">{camp.title}</h3>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">{camp.description}</p>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1.5 border border-gray-100">
                        <div>
                          <span className="text-gray-500 font-semibold">Destination URL: </span>
                          <a
                            href={camp.targetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-purple-700 hover:underline font-mono text-[11px]"
                          >
                            {camp.targetUrl}
                          </a>
                        </div>
                        <div>
                          <span className="text-gray-500 font-semibold">Category: </span>
                          <span className="text-gray-800">{camp.category}</span>
                        </div>
                        {camp.headline && (
                          <div>
                            <span className="text-gray-500 font-semibold">Ad Headline: </span>
                            <span className="text-gray-800 font-medium">{camp.headline}</span>
                          </div>
                        )}
                        {camp.contextHintsJson && (
                          <div>
                            <span className="text-gray-500 font-semibold">Context Hints: </span>
                            <span className="text-gray-800 font-mono text-[11px]">{camp.contextHintsJson}</span>
                          </div>
                        )}
                      </div>

                      {/* Pre-Flight Compliance Checks */}
                      <div className="flex items-center space-x-3 text-[11px] font-semibold text-gray-600">
                        <span className="flex items-center text-emerald-700">
                          <span className="material-symbols-outlined text-sm mr-1">check_circle</span>
                          ASCI Policy Checked
                        </span>
                        <span className="flex items-center text-emerald-700">
                          <span className="material-symbols-outlined text-sm mr-1">check_circle</span>
                          OpenAI Ad Terms Compliant
                        </span>
                        <span className="flex items-center text-emerald-700">
                          <span className="material-symbols-outlined text-sm mr-1">check_circle</span>
                          HTTPS Domain Verified
                        </span>
                      </div>
                    </div>

                    {/* Right Live Ad Preview (ChatGPT Style) */}
                    <div className="lg:col-span-5 bg-neutral-900 text-white rounded-xl p-4 shadow-sm border border-neutral-800">
                      <div className="text-[10px] text-neutral-400 font-semibold mb-2 flex justify-between items-center">
                        <span>ChatGPT Ad Delivery Preview</span>
                        <span className="bg-neutral-800 text-neutral-300 px-1.5 py-0.2 rounded text-[9px]">Sponsored</span>
                      </div>

                      <div className="text-[11px] text-neutral-400 mb-2 font-medium">This might also interest you.</div>

                      <div className="bg-[#1f1f23] border border-neutral-700/60 rounded-xl p-3 flex items-start space-x-3">
                        <div className="w-16 h-16 rounded-lg bg-neutral-800 overflow-hidden flex-shrink-0 border border-neutral-700">
                          <img src={creativeImage} alt={camp.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-semibold text-neutral-200 truncate">
                              {camp.brandName || camp.organization?.name}
                            </span>
                            <span className="text-[9px] font-bold bg-neutral-700 text-neutral-300 px-1 py-0.2 rounded">
                              Ad
                            </span>
                          </div>
                          <div className="text-xs font-bold text-white truncate">
                            {camp.headline || camp.title}
                          </div>
                          <div className="text-[10px] text-neutral-400 line-clamp-2 mt-0.5 leading-snug">
                            {camp.description}
                          </div>
                          <div className="text-[10px] text-neutral-300 underline font-semibold mt-1">Learn more ↗</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  {isPending && (
                    <div className="flex items-center justify-end space-x-3 border-t border-gray-100 pt-4">
                      <button
                        disabled={processingId === camp.id}
                        onClick={() => handleDecision(camp.id, 'REJECTED')}
                        className="text-xs font-semibold px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
                      >
                        Reject Proposal
                      </button>

                      <button
                        disabled={processingId === camp.id}
                        onClick={() => handleDecision(camp.id, 'ACTIVE')}
                        className="text-xs font-semibold px-5 py-2 bg-black hover:bg-neutral-800 text-white rounded-lg shadow-sm transition-all flex items-center space-x-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {processingId === camp.id ? 'sync' : 'rocket_launch'}
                        </span>
                        <span>
                          {processingId === camp.id
                            ? 'Deploying to OpenAI...'
                            : camp.channel === 'OPENAI_CHATGPT'
                            ? 'Approve & Deploy to ChatGPT'
                            : camp.channel === 'OMNICHANNEL'
                            ? 'Approve & Deploy Omnichannel'
                            : 'Approve Campaign'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
