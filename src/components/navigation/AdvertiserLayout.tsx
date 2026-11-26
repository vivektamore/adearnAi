'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { formatINR } from '@/lib/currency';

export default function AdvertiserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [escrowBalancePaise, setEscrowBalancePaise] = useState<bigint | number>(0);
  const [orgName, setOrgName] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    fetch('/api/advertiser/overview')
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          window.location.href = '/login';
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.organization?.name) {
          setOrgName(data.organization.name);
        }
        if (data.user?.name) {
          setUserName(data.user.name);
        }
        if (data.metrics?.escrowBalancePaise !== undefined) {
          setEscrowBalancePaise(data.metrics.escrowBalancePaise);
        }
      })
      .catch(() => {});
  }, []);

  const navLinks = [
    { label: 'Overview', href: '/advertiser', icon: 'grid_view' },
    { label: 'Campaigns', href: '/advertiser/campaigns', icon: 'campaign' },
    { label: 'ChatGPT Ads', href: '/advertiser/chatgpt-ads', icon: 'smart_toy' },
    { label: 'Create Campaign', href: '/advertiser/campaigns/new', icon: 'add_circle' },
    { label: 'Team Members', href: '/advertiser/members', icon: 'group' },
    { label: 'Analytics & Attribution', href: '/advertiser/analytics', icon: 'insights' },
    { label: 'Billing & Escrow', href: '/advertiser/billing', icon: 'account_balance_wallet' },
  ];

  return (
    <div className="min-h-screen bg-surface">
      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between border-r border-outline-variant/30 transition-transform duration-200 md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col">
          {/* Logo & Portal Identity */}
          <div className="h-16 px-space-md flex items-center justify-between bg-surface-container-lowest border-b border-outline-variant/20">
            <div className="flex items-center gap-space-sm">
              <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary font-headline text-lg font-bold">
                A
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-space-xs">
                  <span className="font-headline text-base text-on-surface tracking-tight font-semibold">
                    AdEarn<span className="text-secondary font-bold">AI</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant text-[10px] uppercase font-semibold">
                    Brand
                  </span>
                </div>
                <span className="text-[11px] text-on-surface-variant font-medium">Brand Studio Escrow</span>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 rounded text-on-surface-variant md:hidden hover:bg-surface-container"
              aria-label="Close menu"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Nodal Status Badge */}
          <div className="px-space-md py-space-xs my-2">
            <div className="px-space-sm py-space-xs rounded bg-surface-container-low flex items-center justify-between text-on-surface-variant border border-outline-variant/30">
              <div className="flex items-center gap-space-xs">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                <span className="text-[11px] uppercase tracking-wide font-semibold text-on-surface">
                  Nodal v2.4 Live
                </span>
              </div>
              <span className="material-symbols-outlined text-[14px] text-secondary">lock</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-space-sm space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-space-sm px-space-md py-space-sm rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-container text-on-primary font-semibold shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Escrow Compliance Widget */}
        <div className="p-space-md space-y-space-sm border-t border-outline-variant/20">
          <div className="p-space-sm rounded-lg bg-surface-container-low border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-on-surface-variant uppercase font-semibold">
                Regulatory Reserve
              </span>
              <span className="text-xs text-secondary font-bold">100%</span>
            </div>
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div className="bg-secondary h-full rounded-full w-full"></div>
            </div>
            <p className="text-[11px] text-on-surface-variant mt-1.5 font-medium">Committed Advertising Reserve</p>
          </div>

          <div className="pt-2 border-t border-outline-variant/20">
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = '/login';
              }}
              className="w-full flex items-center justify-between px-space-sm py-1.5 rounded text-on-surface-variant hover:bg-surface-container-high hover:text-error transition-colors text-xs font-medium cursor-pointer"
            >
              <span>Sign Out Brand Session</span>
              <span className="material-symbols-outlined text-[16px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Top Header */}
      <div className="pl-0 md:pl-64">
        <header className="fixed top-0 left-0 md:left-64 right-0 h-16 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 border-b border-outline-variant/30">
          <div className="h-16 w-full px-space-md md:px-space-lg flex items-center justify-between gap-space-md">
            {/* Mobile Hamburger + Organization Selector */}
            <div className="flex items-center gap-space-sm">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container md:hidden"
                aria-label="Toggle navigation"
              >
                <span className="material-symbols-outlined text-[24px]">menu</span>
              </button>

              <div className="flex items-center gap-space-sm px-2.5 md:px-space-md py-1.5 rounded-lg bg-surface-container-lowest shadow-xs border border-outline-variant/30 text-left">
                <span className="material-symbols-outlined text-secondary text-[20px] hidden sm:inline">domain</span>
                <div className="flex flex-col">
                  <div className="flex items-center gap-space-xs">
                    <span className="text-xs font-semibold text-on-surface truncate max-w-[160px] sm:max-w-[280px]">
                      {orgName || 'Active Advertiser Organization'}
                    </span>
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant hidden sm:inline">verified</span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-on-surface-variant font-medium">Active Verified Brand Partner</span>
                </div>
              </div>
            </div>

            {/* Right Telemetry & Profile */}
            <div className="flex items-center gap-space-xs sm:gap-space-md">
              {/* Escrow Balance Pill */}
              <div className="flex items-center gap-space-xs px-2.5 sm:px-space-md py-1.5 rounded-full bg-surface-container-lowest shadow-xs border border-outline-variant/30">
                <span className="text-[10px] sm:text-[11px] text-on-surface-variant uppercase font-semibold hidden sm:inline">Escrow Balance</span>
                <span className="text-xs sm:text-sm font-bold text-secondary tabular-nums">
                  {formatINR(escrowBalancePaise)}
                </span>
                <span className="material-symbols-outlined text-secondary text-[16px]">check_circle</span>
              </div>

              <div className="flex items-center gap-space-sm pl-space-xs sm:pl-space-sm">
                <div className="flex flex-col text-right hidden lg:flex">
                  <span className="text-xs font-semibold text-on-surface">
                    {userName || 'Brand Director'}
                  </span>
                  <span className="text-[11px] text-on-surface-variant">Authorized Brand Account</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary text-xs font-bold">
                  {userName
                    ? userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                    : 'BA'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="relative pt-16 bg-surface min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
