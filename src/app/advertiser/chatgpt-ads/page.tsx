'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AdvertiserLayout from '@/components/navigation/AdvertiserLayout';

interface OpenaiCampaignData {
  id: string;
  name: string;
  objective: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  budgetType: string;
  budgetMicros: string;
  currency: string;
  countries: string[];
  platforms: string[];
  createdAt: string;
  adGroups: Array<{
    id: string;
    name: string;
    status: string;
    contextHints: string[];
    bidStrategy: string;
    billingEvent: string;
    ads: Array<{
      id: string;
      name: string;
      status: string;
      headline: string;
      description: string;
      imageUrl: string;
      landingPageUrl: string;
    }>;
  }>;
  insightReports: Array<{
    impressions: number;
    clicks: number;
    spendMicros: string;
    ctrPercent: number;
    avgCpcMicros: string;
    avgCpmMicros: string;
    conversions: number;
    cpaMicros: string;
    attributedSalesMicros: string;
    roas: number;
    dataFreshness: string;
    isStale: boolean;
    source: string;
    fetchedAt: string;
  }>;
}

export default function ChatGptAdsDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [accountInfo, setAccountInfo] = useState<any | null>(null);
  const [campaigns, setCampaigns] = useState<OpenaiCampaignData[]>([]);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'adgroups' | 'ads' | 'conversions'>('campaigns');
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [pixelModalOpen, setPixelModalOpen] = useState(false);
  const [pixelSnippet, setPixelSnippet] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/advertiser/openai');
      if (res.ok) {
        const data = await res.json();
        setAccountInfo(data.account);
        setCampaigns(data.campaigns || []);
      }
    } catch (err) {
      console.error('Failed to load OpenAI ads data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSyncMetrics = async () => {
    try {
      setSyncing(true);
      const res = await fetch('/api/advertiser/openai/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncNotice(`Synced ${data.syncedCount} campaigns from OpenAI Insights API.`);
        await loadData();
        setTimeout(() => setSyncNotice(null), 5000);
      } else {
        alert('Sync error: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Failed to sync metrics: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleStatus = async (campaignId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      const res = await fetch(`/api/advertiser/openai/${campaignId}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        await loadData();
      } else {
        const d = await res.json();
        alert('State transition failed: ' + (d.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Error updating campaign state: ' + err.message);
    }
  };

  const openPixelModal = async () => {
    try {
      const res = await fetch('/api/advertiser/openai/conversions');
      if (res.ok) {
        const d = await res.json();
        setPixelSnippet(d.jsSnippet);
        setPixelModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to fetch conversion snippet:', err);
    }
  };

  // Aggregated totals
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalSpendMicros = BigInt(0);
  let totalConversions = 0;

  campaigns.forEach((c) => {
    const latest = c.insightReports?.[0];
    if (latest) {
      totalImpressions += latest.impressions || 0;
      totalClicks += latest.clicks || 0;
      totalSpendMicros += BigInt(latest.spendMicros || 0);
      totalConversions += latest.conversions || 0;
    }
  });

  const totalSpendINR = Number(totalSpendMicros) / 1_000_000;
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';
  const avgCpc = totalClicks > 0 ? (totalSpendINR / totalClicks).toFixed(2) : '0.00';

  return (
    <AdvertiserLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* OpenAI Ads Manager Beta Header & Timezone Indicator (Screenshot 2) */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-gray-200">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-gray-900">ChatGPT Ads Manager</h1>
              <span className="text-xs bg-gray-100 text-gray-700 font-semibold px-2 py-0.5 rounded">Beta</span>
              {accountInfo?.isSandbox && (
                <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">
                  Sandbox Simulation Mode
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
              <span>Timezone: {accountInfo?.timezone || 'India Standard Time'}</span>
              <span>•</span>
              <span>Billing uses UTC</span>
              <span>•</span>
              <span>Currency: {accountInfo?.currency || 'INR (₹)'}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={openPixelModal}
              className="px-3.5 py-1.5 border border-gray-300 hover:bg-gray-50 rounded-lg text-xs font-semibold text-gray-700 flex items-center space-x-1.5"
            >
              <span className="material-symbols-outlined text-sm text-purple-600">code</span>
              <span>Conversion Pixel</span>
            </button>

            <button
              onClick={handleSyncMetrics}
              disabled={syncing}
              className="px-3.5 py-1.5 border border-gray-300 hover:bg-gray-50 rounded-lg text-xs font-semibold text-gray-700 flex items-center space-x-1.5"
            >
              <span className={`material-symbols-outlined text-sm ${syncing ? 'animate-spin' : ''}`}>
                sync
              </span>
              <span>{syncing ? 'Syncing...' : 'Sync with OpenAI'}</span>
            </button>

            <Link
              href="/advertiser/chatgpt-ads/new"
              className="px-4 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>+ Create</span>
            </Link>
          </div>
        </div>

        {/* Sync notification banner */}
        {syncNotice && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-lg flex items-center space-x-2">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            <span>{syncNotice}</span>
          </div>
        )}

        {/* Official OpenAI Ads Manager Notice Banners (Screenshot 2) */}
        <div className="space-y-3">
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-amber-900">
            <span className="material-symbols-outlined text-amber-700 text-base mt-0.5">campaign</span>
            <div className="flex-1">
              <span className="font-semibold">Conversion reporting is delayed. </span>
              Recent conversion data in Ads Manager may be incomplete. We&apos;re working to resolve the delay. Conversion counts and related metrics may change as more data comes in.{' '}
              <a href="#" className="underline font-semibold hover:text-black">
                About conversion reporting
              </a>
            </div>
          </div>

          <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-amber-900">
            <span className="material-symbols-outlined text-amber-700 text-base mt-0.5">warning</span>
            <div className="flex-1 flex justify-between items-center">
              <div>
                <span className="font-semibold">Channel Separation Guarantee: </span>
                OpenAI ChatGPT native ads are delivered exclusively by OpenAI API. AdEarn never serves ads directly inside ChatGPT DOM. Creator ledger balances are not affected by external OpenAI metrics.
              </div>
            </div>
          </div>
        </div>

        {/* Aggregated KPI Cards (Source labeled: OpenAI Insights API) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-gray-500 uppercase font-semibold">Total Spend</div>
            <div className="text-xl font-bold text-gray-900 mt-1">₹{totalSpendINR.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <div className="text-[10px] text-gray-400 mt-1">Source: OpenAI Insights API</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-gray-500 uppercase font-semibold">Impressions</div>
            <div className="text-xl font-bold text-gray-900 mt-1">{totalImpressions.toLocaleString()}</div>
            <div className="text-[10px] text-gray-400 mt-1">Verified OpenAI Auction Delivery</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-gray-500 uppercase font-semibold">Clicks & CTR</div>
            <div className="text-xl font-bold text-gray-900 mt-1">
              {totalClicks.toLocaleString()} <span className="text-xs font-normal text-gray-500">({avgCtr}%)</span>
            </div>
            <div className="text-[10px] text-gray-400 mt-1">Avg CPC: ₹{avgCpc}</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-gray-500 uppercase font-semibold">Conversions</div>
            <div className="text-xl font-bold text-gray-900 mt-1">{totalConversions}</div>
            <div className="text-[10px] text-gray-400 mt-1">Permitted 1st-party pixel events</div>
          </div>
        </div>

        {/* Sub-Navigation Tabs (Campaigns / Ad groups / Ads) */}
        <div className="border-b border-gray-200 flex space-x-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`pb-2 border-b-2 transition-colors ${
              activeTab === 'campaigns'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Campaigns ({campaigns.length})
          </button>
          <button
            onClick={() => setActiveTab('adgroups')}
            className={`pb-2 border-b-2 transition-colors ${
              activeTab === 'adgroups'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Ad groups
          </button>
          <button
            onClick={() => setActiveTab('ads')}
            className={`pb-2 border-b-2 transition-colors ${
              activeTab === 'ads'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Ads
          </button>
        </div>

        {/* Content Table */}
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-sm text-gray-500">
            Loading OpenAI campaigns...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center space-y-4 shadow-sm">
            <span className="material-symbols-outlined text-4xl text-gray-400">smart_toy</span>
            <div className="text-base font-bold text-gray-800">
              Start with a suggested campaign or build your own.
            </div>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Launch autonomous, high-relevance native advertisements displayed below ChatGPT conversational responses via the official OpenAI Advertiser API.
            </p>
            <Link
              href="/advertiser/chatgpt-ads/new"
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Create ChatGPT Campaign</span>
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50 border-b border-gray-200 uppercase font-semibold text-[11px] text-gray-500">
                  <tr>
                    <th className="px-4 py-3">State</th>
                    <th className="px-4 py-3">Campaign Name</th>
                    <th className="px-4 py-3">Objective</th>
                    <th className="px-4 py-3">Budget</th>
                    <th className="px-4 py-3">Spend</th>
                    <th className="px-4 py-3">Impressions</th>
                    <th className="px-4 py-3">Clicks</th>
                    <th className="px-4 py-3">CTR</th>
                    <th className="px-4 py-3">Conversions</th>
                    <th className="px-4 py-3">Data Freshness</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {campaigns.map((c) => {
                    const insights = c.insightReports?.[0];
                    const budgetINR = (Number(c.budgetMicros) / 1_000_000).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    });
                    const spendINR = insights
                      ? (Number(insights.spendMicros) / 1_000_000).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })
                      : '0.00';

                    return (
                      <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleStatus(c.id, c.status)}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            title="Click to toggle status"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                c.status === 'ACTIVE' ? 'bg-emerald-600' : 'bg-gray-400'
                              }`}
                            />
                            {c.status}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span>{c.name}</span>
                            <span className="text-[10px] font-mono text-gray-400">{c.id}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap capitalize">{c.objective.toLowerCase()}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          ₹{budgetINR} <span className="text-[10px] text-gray-400">/{c.budgetType.toLowerCase()}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">₹{spendINR}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{insights?.impressions?.toLocaleString() || 0}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{insights?.clicks?.toLocaleString() || 0}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{insights?.ctrPercent ? `${insights.ctrPercent.toFixed(2)}%` : '0.00%'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{insights?.conversions || 0}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-[11px] text-gray-400">
                          {insights?.dataFreshness || 'Up to date'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleToggleStatus(c.id, c.status)}
                            className="text-xs text-gray-700 hover:text-black font-semibold underline mr-3"
                          >
                            {c.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pixel Snippet Modal */}
        {pixelModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-xl">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="material-symbols-outlined text-purple-600">code</span>
                  <h3 className="font-bold text-sm text-gray-900">OpenAI Conversion Tracking Pixel</h3>
                </div>
                <button
                  onClick={() => setPixelModalOpen(false)}
                  className="text-gray-400 hover:text-gray-700 text-lg font-bold"
                >
                  &times;
                </button>
              </div>

              <p className="text-xs text-gray-600">
                Install this snippet on your website landing pages to measure conversions from ChatGPT sponsored cards. AdEarn strictly enforces privacy: only permitted first-party standard events are tracked; user chat conversations are never recorded.
              </p>

              <pre className="bg-gray-900 text-purple-200 p-4 rounded-lg text-xs font-mono overflow-x-auto">
                {pixelSnippet}
              </pre>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(pixelSnippet);
                    alert('Copied tracking pixel snippet to clipboard!');
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold"
                >
                  Copy Snippet
                </button>
                <button
                  onClick={() => setPixelModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdvertiserLayout>
  );
}
