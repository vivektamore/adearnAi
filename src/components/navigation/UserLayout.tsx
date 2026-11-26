'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; kycTier: string; role?: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/extension/session')
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated && d.user) {
          if (d.user.role === 'ADMIN' || d.user.role === 'SUPER_ADMIN') {
            router.replace('/admin');
            return;
          }
          if (d.user.role === 'ADVERTISER' || d.user.role === 'BRAND') {
            router.replace('/advertiser');
            return;
          }
          setUser(d.user);
        }
      })
      .catch(() => {});
  }, [router]);

  // Close mobile menu whenever pathname changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    }
    router.push('/login');
  }

  const navLinks = [
    { label: 'Dashboard', href: '/' },
    { label: 'Sponsored content', href: '/feed' },
    { label: 'Rewards & Wallet', href: '/wallet' },
    { label: 'Withdrawals', href: '/withdrawals' },
    { label: 'Help & Disputes', href: '/support' },
  ];

  const sidebarQuickLinks = [
    { label: 'Overview', href: '/', icon: 'grid_view' },
    { label: 'Active Tasks', href: '/feed', icon: 'task_alt' },
    { label: 'Payout History', href: '/withdrawals', icon: 'receipt_long' },
    { label: 'Privacy Settings', href: '/profile', icon: 'shield' },
  ];

  const sidebarSecondaryLinks = [
    { label: 'Rewards & Wallet', href: '/wallet', icon: 'account_balance_wallet' },
    { label: 'Chrome Companion', href: '/extension', icon: 'extension' },
    { label: 'Help & Disputes', href: '/support', icon: 'support_agent' },
  ];

  function isLinkActive(href: string): boolean {
    if (href === '/') return pathname === '/';
    if (href === '/feed') return pathname === '/feed' || pathname.startsWith('/task/');
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-outline-variant/30">
        <div className="w-full px-space-md sm:px-space-lg flex items-center justify-between h-16">
          <div className="flex items-center gap-space-md lg:gap-space-lg">
            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              aria-label="Toggle navigation menu"
            >
              <span className="material-symbols-outlined text-[24px]">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>

            <Link href="/" className="flex items-center gap-space-sm">
              <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary font-headline font-bold text-lg shadow-xs">
                A
              </div>
              <span className="font-headline text-lg text-on-surface tracking-tight font-semibold">
                AdEarn <span className="text-secondary font-bold">AI</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden xl:flex items-center gap-space-xs">
              {navLinks.map((link) => {
                const isActive = isLinkActive(link.href);
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

          <div className="flex items-center gap-space-xs sm:gap-space-md">
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

            {user ? (
              <div className="flex items-center gap-2">
                <Link href="/profile" className="flex items-center gap-space-sm pl-space-xs cursor-pointer group">
                  <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-semibold text-xs ring-1 ring-surface-container-high">
                    {user.name
                      ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                      : 'U'}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-semibold text-on-surface leading-tight">{user.name}</span>
                    <span className="text-[11px] text-secondary font-medium leading-tight">Verified {user.kycTier || 'Tier 1'}</span>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="hidden sm:flex p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-lg bg-secondary text-on-secondary text-xs font-bold hover:bg-on-secondary-container transition-colors shadow-xs"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden bg-scrim/40 backdrop-blur-xs pt-16">
          <div className="bg-surface-container-lowest border-b border-outline-variant/30 shadow-lg p-space-md space-y-space-md animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/20">
              <span className="text-xs uppercase font-bold text-on-surface-variant tracking-wider">Navigation Menu</span>
              <span className="text-xs font-medium text-secondary">IN · INR ₹</span>
            </div>

            <nav className="grid grid-cols-2 gap-2 text-sm">
              {[...sidebarQuickLinks, ...sidebarSecondaryLinks].map((link) => {
                const isActive = isLinkActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-surface-container-high text-on-surface'
                        : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px] text-secondary">{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="pt-space-xs border-t border-outline-variant/20 flex items-center justify-between">
              {user ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-secondary-container flex items-center justify-center text-xs font-bold text-secondary">
                      {user.name ? user.name[0].toUpperCase() : 'U'}
                    </div>
                    <span className="text-xs font-bold text-on-surface">{user.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="px-3 py-1.5 rounded-lg bg-error-container text-on-error-container text-xs font-bold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="w-full text-center py-2 rounded-lg bg-secondary text-on-secondary text-xs font-bold"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Left Sidebar for Desktop & Tablets */}
      <aside className="fixed left-0 top-16 bottom-0 w-64 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 hidden md:flex flex-col justify-between py-space-md border-r border-outline-variant/30">
        <div className="px-space-md flex flex-col gap-space-md">
          {/* Quick Navigation Section */}
          <div className="space-y-1">
            <div className="px-space-sm py-space-xs text-[11px] text-on-surface-variant tracking-wider uppercase font-semibold">
              Quick Navigation
            </div>
            <nav className="flex flex-col gap-1">
              {sidebarQuickLinks.map((link) => {
                const isActive = isLinkActive(link.href);
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

          {/* Platform & Tools Section */}
          <div className="space-y-1 pt-space-xs border-t border-outline-variant/20">
            <div className="px-space-sm py-space-xs text-[11px] text-on-surface-variant tracking-wider uppercase font-semibold">
              Platform & Tools
            </div>
            <nav className="flex flex-col gap-1">
              {sidebarSecondaryLinks.map((link) => {
                const isActive = isLinkActive(link.href);
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
        </div>

        {/* Sidebar Footer with Compliance Badge & Sign Out */}
        <div className="px-space-md space-y-space-sm">
          <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-space-xs border border-outline-variant/30">
            <div className="flex items-center gap-space-xs text-on-surface">
              <span className="material-symbols-outlined text-[16px] text-secondary">verified_user</span>
              <span className="text-xs font-semibold">Tier 1 Creator</span>
            </div>
            <p className="text-[11px] text-on-surface-variant">Instant payouts & RBI-compliant escrow ledger active.</p>
          </div>

          {user && (
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center justify-between px-space-md py-2 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high hover:text-error transition-colors cursor-pointer border border-outline-variant/20"
            >
              <span>Sign Out Session</span>
              <span className="material-symbols-outlined text-[16px]">logout</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="md:pl-64 flex-1 pb-16 md:pb-0">
        <main className="w-full pt-16 bg-surface min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Thumb Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant/30 px-2 py-1.5 flex items-center justify-around shadow-md">
        <Link
          href="/"
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
            isLinkActive('/') ? 'text-secondary' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">grid_view</span>
          <span>Home</span>
        </Link>
        <Link
          href="/feed"
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
            isLinkActive('/feed') ? 'text-secondary' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">task_alt</span>
          <span>Tasks</span>
        </Link>
        <Link
          href="/wallet"
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
            isLinkActive('/wallet') ? 'text-secondary' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
          <span>Wallet</span>
        </Link>
        <Link
          href="/withdrawals"
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
            isLinkActive('/withdrawals') ? 'text-secondary' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">receipt_long</span>
          <span>Payouts</span>
        </Link>
        <Link
          href="/profile"
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
            isLinkActive('/profile') ? 'text-secondary' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">shield</span>
          <span>Settings</span>
        </Link>
      </nav>
    </div>
  );
}
