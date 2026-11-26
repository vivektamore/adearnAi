'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleLogin(e?: React.FormEvent, customEmail?: string, customPass?: string) {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const targetEmail = customEmail || email;
    const targetPass = customPass || password;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: targetPass }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.user.role === 'ADMIN' || data.user.role === 'SUPER_ADMIN') {
          router.push('/admin');
        } else if (data.user.role === 'ADVERTISER' || data.user.role === 'BRAND') {
          router.push('/advertiser');
        } else {
          router.push('/');
        }
      } else {
        setErrorMsg(data.error || 'Authentication failed.');
      }
    } catch {
      setErrorMsg('Network error while authenticating.');
    } finally {
      setLoading(false);
    }
  }

  function quickLogin(role: 'USER' | 'ADVERTISER' | 'ADMIN') {
    if (role === 'USER') {
      setEmail('arun@creator.in');
      setPassword('User@12345');
      handleLogin(undefined, 'arun@creator.in', 'User@12345');
    } else if (role === 'ADVERTISER') {
      setEmail('advertiser@zerodha.in');
      setPassword('Advertiser@12345');
      handleLogin(undefined, 'advertiser@zerodha.in', 'Advertiser@12345');
    } else {
      setEmail('admin@adearn.ai');
      setPassword('Admin@12345');
      handleLogin(undefined, 'admin@adearn.ai', 'Admin@12345');
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/30 shadow-md space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary flex items-center justify-center font-headline text-2xl font-bold mx-auto shadow-xs">
            A
          </div>
          <h1 className="font-headline text-2xl font-bold text-on-surface">Sign in to AdEarn AI</h1>
          <p className="text-xs text-on-surface-variant">
            India&apos;s Institutional Sponsored-Content & Voluntary Reward Platform
          </p>
        </div>

        {/* Quick Demo Role Fillers for Development & Staging */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-2">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold block">
              Staging / Dev Test Access:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => quickLogin('USER')}
                className="py-1.5 px-2 rounded-lg bg-surface-container text-xs font-semibold hover:bg-surface-container-high transition-colors text-on-surface"
              >
                Creator
              </button>
              <button
                type="button"
                onClick={() => quickLogin('ADVERTISER')}
                className="py-1.5 px-2 rounded-lg bg-surface-container text-xs font-semibold hover:bg-surface-container-high transition-colors text-on-surface"
              >
                Brand
              </button>
              <button
                type="button"
                onClick={() => quickLogin('ADMIN')}
                className="py-1.5 px-2 rounded-lg bg-surface-container text-xs font-semibold hover:bg-surface-container-high transition-colors text-on-surface"
              >
                Admin
              </button>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs flex items-center gap-2 font-semibold">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-on-surface">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-sm focus:border-secondary outline-none"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-on-surface">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-sm focus:border-secondary outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-secondary text-on-secondary font-bold text-sm hover:bg-on-secondary-container transition-colors shadow-xs"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center pt-2 space-y-2">
          <p className="text-xs text-on-surface-variant">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-secondary font-bold hover:underline">
              Create a new account here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
