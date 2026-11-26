'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/overview')
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          window.location.href = '/login';
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.sessionUser) {
          setAdminUser(data.sessionUser);
        }
      })
      .catch(() => {});
  }, []);

  const navLinks = [
    { label: 'Operations Dashboard', href: '/admin', icon: 'dashboard' },
    { label: 'User Directory', href: '/admin/users', icon: 'manage_accounts' },
    { label: 'Inventory Placements', href: '/admin/placements', icon: 'view_carousel' },
    { label: 'Moderation Queue', href: '/admin/moderation', icon: 'fact_check' },
    { label: 'Fraud & Kinematics Lab', href: '/admin/fraud-lab', icon: 'fingerprint' },
    { label: 'Payout Clearing & Nodal Pool', href: '/admin/payouts', icon: 'payments' },
    { label: 'Immutable Audit Logs', href: '/admin/audit-logs', icon: 'history_edu' },
    { label: 'Unit Economics & Margins', href: '/admin/analytics', icon: 'monitoring' },
    { label: 'Platform Settings & Access', href: '/admin/settings', icon: 'admin_panel_settings' },
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
          {/* Identity Header */}
          <div className="h-16 px-space-md flex items-center justify-between bg-surface-container-lowest border-b border-outline-variant/20">
            <div className="flex items-center gap-space-sm">
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

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 rounded text-on-surface-variant md:hidden hover:bg-surface-container"
              aria-label="Close menu"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
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
              <span className="text-[10px] font-mono text-secondary font-bold">Operational</span>
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
                  <span className="truncate">{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Session Management */}
        <div className="p-space-md border-t border-outline-variant/20">
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            }}
            className="w-full flex items-center justify-between px-space-sm py-1.5 rounded text-on-surface-variant hover:bg-surface-container-high hover:text-error transition-colors text-xs font-medium cursor-pointer"
          >
            <span>Terminate Admin Session</span>
            <span className="material-symbols-outlined text-[16px]">logout</span>
          </button>
        </div>
      </aside>

      {/* Top Header */}
      <div className="pl-0 md:pl-64">
        <header className="fixed top-0 left-0 md:left-64 right-0 h-16 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 border-b border-outline-variant/30">
          <div className="h-16 w-full px-space-md md:px-space-lg flex items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-sm">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container md:hidden"
                aria-label="Toggle navigation"
              >
                <span className="material-symbols-outlined text-[24px]">menu</span>
              </button>
              <span className="text-sm font-semibold text-on-surface hidden sm:inline">Super Admin Operations Management</span>
              <span className="px-2 py-0.5 rounded-full bg-secondary-container/40 text-on-secondary-fixed-variant text-xs font-semibold">
                Tier-0 Master Control
              </span>
            </div>

            <div className="flex items-center gap-space-md">
              <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant hidden lg:flex">
                <span className="material-symbols-outlined text-[16px] text-secondary">verified_user</span>
                <span>Cryptographic Digest: SHA256 Live</span>
              </div>

              <div className="flex items-center gap-space-sm pl-space-sm">
                <div className="flex flex-col text-right hidden sm:flex">
                  <span className="text-xs font-semibold text-on-surface">
                    {adminUser?.name || 'Compliance Officer'}
                  </span>
                  <span className="text-[11px] text-secondary font-medium">SecOps Administrator</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-xs font-bold">
                  {adminUser?.name ? adminUser.name.slice(0, 2).toUpperCase() : 'SA'}
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
