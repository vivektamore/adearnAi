'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navLinks = [
    { label: 'Dashboard', href: '/' },
    { label: 'Sponsored content', href: '/feed' },
    { label: 'Rewards & Wallet', href: '/wallet' },
    { label: 'Withdrawals', href: '/withdrawals' },
    { label: 'Help & Disputes', href: '/support' },
  ];

  const sidebarLinks = [
    { label: 'Overview', href: '/', icon: 'grid_view' },
    { label: 'Active Tasks', href: '/feed', icon: 'task_alt' },
    { label: 'Payout History', href: '/withdrawals', icon: 'receipt_long' },
    { label: 'Privacy Settings', href: '/profile', icon: 'shield' },
  ];

  return (
    <div className="min-h-screen bg-surface">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="w-full px-space-lg flex items-center justify-between h-16">
          <div className="flex items-center gap-space-lg">
            <Link href="/" className="flex items-center gap-space-sm">
              <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary font-headline font-bold text-lg">
                A
              </div>
              <span className="font-headline text-lg text-on-surface tracking-tight font-semibold">
                AdEarn <span className="text-secondary font-bold">AI</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden xl:flex items-center gap-space-xs">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-space-md py-space-xs text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-on-surface font-semibold bg-surface-container-high rounded-lg'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-space-md">
            {/* Quick Portal Switcher */}
            <div className="hidden md:flex items-center gap-1.5 p-1 rounded-lg bg-surface-container-low border border-outline-variant/30 text-xs">
              <span className="px-1.5 text-on-surface-variant font-medium">Portal:</span>
              <Link href="/" className="px-2 py-0.5 rounded bg-surface-container-lowest font-semibold text-secondary shadow-xs">
                User
              </Link>
              <Link href="/advertiser" className="px-2 py-0.5 rounded text-on-surface-variant hover:text-on-surface">
                Brand
              </Link>
              <Link href="/admin" className="px-2 py-0.5 rounded text-on-surface-variant hover:text-on-surface">
                Admin
              </Link>
            </div>

            <div className="hidden sm:inline-flex items-center gap-space-xs px-space-sm py-0.5 rounded-full bg-surface-container text-on-surface-variant text-xs font-medium">
              <span className="material-symbols-outlined text-[16px] text-secondary">public</span>
              <span>IN · INR ₹</span>
            </div>

            <Link
              href="/extension"
              className="hidden lg:flex items-center gap-1 px-space-sm py-1 rounded bg-secondary-container/40 text-on-secondary-fixed-variant text-xs font-semibold hover:bg-secondary-container transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">extension</span>
              <span>Chrome Companion</span>
            </Link>

            <Link href="/profile" className="flex items-center gap-space-sm pl-space-xs cursor-pointer group">
              <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-semibold text-xs ring-1 ring-surface-container-high">
                AK
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold text-on-surface leading-tight">Arun Kumar</span>
                <span className="text-[11px] text-secondary font-medium leading-tight">Verified Tier 1</span>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Left Sidebar */}
      <aside className="fixed left-0 top-16 bottom-0 w-64 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 hidden md:flex flex-col justify-between py-space-md">
        <div className="px-space-md flex flex-col gap-space-sm">
          <div className="px-space-sm py-space-xs text-[11px] text-on-surface-variant tracking-wider uppercase font-semibold">
            Quick Navigation
          </div>
          <nav className="flex flex-col gap-1">
            {sidebarLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-space-sm px-space-md py-space-sm rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-surface-container-high text-on-surface font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="px-space-md">
          <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-space-xs border border-outline-variant/30">
            <div className="flex items-center gap-space-xs text-on-surface">
              <span className="material-symbols-outlined text-[16px] text-secondary">verified_user</span>
              <span className="text-xs font-semibold">Tier 1 Creator</span>
            </div>
            <p className="text-[11px] text-on-surface-variant">Instant payouts & standard Indian tax compliance active.</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="md:pl-64">
        <main className="w-full pt-16 bg-surface min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
