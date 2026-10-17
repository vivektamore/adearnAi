'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navLinks = [
    { label: 'Operations Dashboard', href: '/admin', icon: 'dashboard' },
    { label: 'Moderation Queue', href: '/admin/moderation', icon: 'fact_check' },
    { label: 'Fraud & Kinematics Lab', href: '/admin/fraud-lab', icon: 'fingerprint' },
    { label: 'Payout Clearing & Nodal Pool', href: '/admin/payouts', icon: 'payments' },
    { label: 'Immutable Audit Logs', href: '/admin/audit-logs', icon: 'history_edu' },
    { label: 'Unit Economics & Margins', href: '/admin/analytics', icon: 'monitoring' },
    { label: 'Platform Settings & Access', href: '/admin/settings', icon: 'admin_panel_settings' },
  ];

  return (
    <div className="min-h-screen bg-surface">
      {/* Left Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between border-r border-outline-variant/30">
        <div className="flex flex-col">
          {/* Identity Header */}
          <div className="h-16 px-space-md flex items-center gap-space-sm bg-surface-container-lowest border-b border-outline-variant/20">
            <div className="w-8 h-8 rounded-lg bg-error-container flex items-center justify-center text-on-error-container font-headline text-lg font-bold">
              <span className="material-symbols-outlined text-[20px] text-error">security</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-space-xs">
                <span className="font-headline text-base text-on-surface tracking-tight font-semibold">
                  AdEarn<span className="text-secondary font-bold">AI</span>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-error/10 text-error text-[10px] uppercase font-bold">
                  Admin
                </span>
              </div>
              <span className="text-[11px] text-on-surface-variant font-medium">Operations & Forensic Desk</span>
            </div>
          </div>

          {/* Core System Telemetry */}
          <div className="px-space-md py-space-xs my-2">
            <div className="px-space-sm py-space-xs rounded bg-surface-container-low flex items-center justify-between text-on-surface-variant border border-outline-variant/30">
              <div className="flex items-center gap-space-xs">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                <span className="text-[11px] uppercase tracking-wide font-semibold text-on-surface">
                  All Systems Normal
                </span>
              </div>
              <span className="text-[10px] font-mono text-secondary font-bold">99.98% SLA</span>
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
                  className={`flex items-center gap-space-sm px-space-md py-space-sm rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-container text-on-primary font-semibold shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{link.icon}</span>
                  <span className="truncate">{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Switcher */}
        <div className="p-space-md space-y-2 border-t border-outline-variant/20">
          <Link
            href="/"
            className="flex items-center justify-between px-space-sm py-1.5 rounded text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors text-xs font-medium"
          >
            <span>← User Portal</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
          <Link
            href="/advertiser"
            className="flex items-center justify-between px-space-sm py-1.5 rounded text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors text-xs font-medium"
          >
            <span>Brand Portal</span>
            <span className="material-symbols-outlined text-[16px]">domain</span>
          </Link>
        </div>
      </aside>

      {/* Top Header */}
      <div className="pl-64">
        <header className="fixed top-0 left-64 right-0 h-16 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 border-b border-outline-variant/30">
          <div className="h-16 w-full px-space-lg flex items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-sm">
              <span className="text-sm font-semibold text-on-surface">Super Admin Operations Management</span>
              <span className="px-2 py-0.5 rounded-full bg-secondary-container/40 text-on-secondary-fixed-variant text-xs font-semibold">
                Tier-0 Master Control
              </span>
            </div>

            <div className="flex items-center gap-space-md">
              <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-secondary">verified_user</span>
                <span>Cryptographic Digest: SHA256 Live</span>
              </div>

              <div className="flex items-center gap-space-sm pl-space-sm">
                <div className="flex flex-col text-right hidden sm:flex">
                  <span className="text-xs font-semibold text-on-surface">Compliance Officer</span>
                  <span className="text-[11px] text-secondary font-medium">SecOps Administrator</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-xs font-bold">
                  SA
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
