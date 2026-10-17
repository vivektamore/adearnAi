'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import UserLayout from '@/components/navigation/UserLayout';
import { formatINR } from '@/lib/currency';

interface CampaignItem {
  id: string;
  title: string;
  description: string;
  category: string;
  actionType: string;
  targetUrl: string;
  costPerOutcomePaise: string;
  targetOutcomes: number;
  verifiedOutcomes: number;
  organization: {
    name: string;
    isVerified: boolean;
  };
  creativeAssets: Array<{ assetUrl: string }>;
}

export default function SponsoredAdFeedPage() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedAction, setSelectedAction] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, [selectedCategory, selectedAction, searchTerm]);

  function fetchCampaigns() {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedCategory !== 'All') params.append('category', selectedCategory);
    if (selectedAction !== 'All') params.append('actionType', selectedAction);
    if (searchTerm) params.append('search', searchTerm);

    fetch(`/api/campaigns?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setCampaigns(data.campaigns || []);
        if (data.categories) setCategories(data.categories);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }

  return (
    <UserLayout>
      <div className="w-full max-w-[1280px] mx-auto px-space-lg py-space-xl flex flex-col gap-space-lg">
        {/* Feed Header matching Stitch Screen 02 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs">
          <div>
            <div className="flex items-center gap-space-sm flex-wrap">
              <h1 className="font-headline text-2xl font-bold text-on-surface">Sponsored Content Feed</h1>
              <span className="px-2 py-0.5 rounded-full bg-secondary-container/40 text-on-secondary-fixed-variant text-xs font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-secondary">verified</span>
                ASCI Compliant · Voluntary Engagement Only
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mt-1">
              Discover audited brand activities. Complete the defined task with voluntary engagement to receive guaranteed escrow-backed rewards.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-on-surface-variant font-medium shrink-0 bg-surface-container-low px-3 py-2 rounded-lg border border-outline-variant/20">
            <span className="material-symbols-outlined text-[16px] text-secondary">lock</span>
            <span>Escrow Guaranteed Payouts</span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-sm">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[20px] text-on-surface-variant">
              search
            </span>
            <input
              type="text"
              placeholder="Search campaigns, brands, or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-sm focus:border-secondary outline-none shadow-xs transition-colors"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-primary-container text-on-primary shadow-xs'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface border border-outline-variant/30'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Campaigns Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-64 rounded-xl bg-surface-container-lowest animate-pulse border border-outline-variant/30" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/30">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant">search_off</span>
            <h3 className="font-headline text-lg font-bold text-on-surface mt-2">No matching campaigns found</h3>
            <p className="text-sm text-on-surface-variant mt-1">Try adjusting your filters or search keywords.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
            {campaigns.map((camp) => (
              <div
                key={camp.id}
                className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
              >
                {/* Header & Brand */}
                <div className="p-space-lg space-y-space-sm">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-semibold uppercase tracking-wider">
                      {camp.category}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-secondary">
                      <span className="material-symbols-outlined text-[14px]">verified</span>
                      SPONSORED
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-on-surface-variant font-medium">by {camp.organization.name}</span>
                    <h3 className="font-headline text-base font-bold text-on-surface line-clamp-2 mt-0.5">
                      {camp.title}
                    </h3>
                  </div>

                  <p className="text-xs text-on-surface-variant line-clamp-3">
                    {camp.description}
                  </p>
                </div>

                {/* Footer with Reward & CTA */}
                <div className="px-space-lg py-space-sm bg-surface-container-low/50 border-t border-outline-variant/20 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-on-surface-variant uppercase font-semibold block">
                      Qualifying Reward
                    </span>
                    <span className="font-headline text-lg font-bold text-secondary tabular-nums">
                      +{formatINR(camp.costPerOutcomePaise)}
                    </span>
                  </div>

                  <Link
                    href={`/task/${camp.id}`}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-secondary text-on-secondary text-xs font-bold hover:bg-on-secondary-container transition-colors shadow-xs"
                  >
                    <span>Start Task</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </UserLayout>
  );
}
