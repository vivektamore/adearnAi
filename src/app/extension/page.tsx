'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import UserLayout from '@/components/navigation/UserLayout';
import { formatINR } from '@/lib/currency';

export default function ChromeExtensionCompanionPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/extension/session')
      .then((res) => res.json())
      .then((data) => {
        setSession(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <UserLayout>
      <div className="w-full max-w-[1080px] mx-auto px-space-lg py-space-xl space-y-space-lg">
        {/* Header matching Stitch Screen 20 */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div>
            <h1 className="font-headline text-2xl font-bold text-on-surface">Chrome Extension & Browser Companion</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Screen 20: Lightweight, zero-invasive browser companion. Provides quick balance telemetry and eligible task alerts without inject ads or capturing browsing history.
            </p>
          </div>
          <span className="px-3 py-1.5 rounded-lg bg-secondary-container/40 text-secondary text-xs font-semibold">
            Manifest V3 Compliant
          </span>
        </div>

        {/* Extension Interactive Simulator Container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg items-start">
          {/* Simulated 400px Popup Window */}
          <div className="mx-auto w-full max-w-[400px] bg-surface-container-lowest rounded-2xl border-2 border-outline-variant shadow-lg overflow-hidden">
            {/* Extension Window Top Bar */}
            <div className="bg-surface-container-low px-4 py-3 border-b border-outline-variant/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-primary-container text-on-primary flex items-center justify-center font-bold text-xs">
                  A
                </div>
                <span className="font-headline text-sm font-bold text-on-surface">AdEarn Companion</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" title="Connected to local node"></span>
            </div>

            {/* Popup Body */}
            <div className="p-4 space-y-4">
              {/* Creator Card */}
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-xs font-bold text-secondary">
                    {session?.user?.name
                      ? session.user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                      : '??'}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-on-surface block">
                      {session?.user?.name || (session?.authenticated ? 'Authenticated User' : 'Guest / Sign In Required')}
                    </span>
                    <span className="text-[10px] text-secondary font-semibold">
                      {session?.user?.kycTier ? `Verified ${session.user.kycTier}` : 'Creator Tier'}
                    </span>
                  </div>
                </div>
                {session?.authenticated ? (
                  <span className="material-symbols-outlined text-secondary text-[18px]">verified</span>
                ) : (
                  <Link href="/login" className="text-[10px] text-secondary font-bold hover:underline">
                    Sign In
                  </Link>
                )}
              </div>

              {/* Balance Box */}
              <div className="p-4 rounded-xl bg-primary-container text-on-primary space-y-1">
                <span className="text-[10px] text-on-primary-container uppercase font-semibold block tracking-wider">
                  Available Withdrawable Balance
                </span>
                <div className="font-headline text-2xl font-bold tabular-nums">
                  {formatINR(session?.wallet?.availablePaise ?? 0)}
                </div>
                <div className="flex justify-between items-center text-[11px] pt-1 border-t border-on-primary-container/20">
                  <span className="text-on-primary-container">Pending Hold: {formatINR(session?.wallet?.pendingPaise ?? 0)}</span>
                  <Link href="/withdrawals" className="text-secondary-fixed font-bold hover:underline">
                    Withdraw →
                  </Link>
                </div>
              </div>

              {/* Eligible Tasks Indicator */}
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-on-surface block">
                    {session?.companionTelemetry?.eligibleCampaignsCount ?? 0} Sponsored Activities
                  </span>
                  <span className="text-[11px] text-on-surface-variant">Eligible for voluntary participation</span>
                </div>
                <Link
                  href="/campaigns"
                  className="px-3 py-1.5 rounded-lg bg-secondary text-on-secondary text-xs font-bold shadow-xs hover:bg-on-secondary-container"
                >
                  View Feed
                </Link>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.open('/extension', 'AdEarnCompanionPopup', 'width=420,height=620,menubar=no,toolbar=no,status=no');
                    }
                  }}
                  className="w-full py-2 rounded-lg bg-secondary/15 text-secondary text-xs font-bold hover:bg-secondary/25 transition-colors flex items-center justify-center gap-1.5 border border-secondary/30"
                >
                  <span className="material-symbols-outlined text-[16px]">picture_in_picture</span>
                  <span>Pop Out Extension Window</span>
                </button>
                <Link
                  href="/"
                  className="w-full py-2.5 rounded-lg bg-surface-container text-on-surface text-xs font-bold hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1.5 border border-outline-variant/30"
                >
                  <span>Open Full AdEarn Web Platform</span>
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Policy & Source Description */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-md text-xs">
            <h2 className="font-headline text-base font-bold text-on-surface">Browser Companion Principles</h2>
            <div className="space-y-3 text-on-surface-variant">
              <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20">
                <strong className="block text-on-surface font-semibold">Zero-Invasive Privacy Guarantee</strong>
                The extension does not track general browsing history, inject advertisements onto external websites, or collect unrelated user queries.
              </div>
              <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20">
                <strong className="block text-on-surface font-semibold">Manifest V3 Source Available</strong>
                The full extension codebase is provided in the repository under <code className="bg-surface-container px-1 py-0.5 rounded font-mono">/extension</code> for review and developer mode loading in Google Chrome.
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
