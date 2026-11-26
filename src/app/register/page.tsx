'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<'USER' | 'ADVERTISER'>('USER');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [gstin, setGstin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload: any = {
        name,
        email,
        password,
        role,
      };

      if (role === 'ADVERTISER') {
        payload.organizationName = orgName || `${name}'s Company`;
        payload.gstin = gstin || undefined;
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg('Account created successfully! Redirecting...');
        setTimeout(() => {
          if (role === 'ADVERTISER') {
            router.push('/advertiser');
          } else {
            router.push('/');
          }
        }, 1000);
      } else {
        setErrorMsg(data.error || 'Failed to create account.');
      }
    } catch {
      setErrorMsg('Network error while registering. Please check connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-lg bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/30 shadow-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary flex items-center justify-center font-headline text-2xl font-bold mx-auto shadow-xs">
            A
          </div>
          <h1 className="font-headline text-2xl font-bold text-on-surface">Create a Fresh Account</h1>
          <p className="text-xs text-on-surface-variant">
            Register a clean, live Creator or Brand account with zero pre-existing dummy balances.
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container-low rounded-xl border border-outline-variant/30">
          <button
            type="button"
            onClick={() => setRole('USER')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              role === 'USER'
                ? 'bg-surface text-secondary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Digital Creator (User)
          </button>
          <button
            type="button"
            onClick={() => setRole('ADVERTISER')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              role === 'ADVERTISER'
                ? 'bg-surface text-secondary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Institutional Brand (Advertiser)
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs flex items-center gap-2 font-semibold">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-secondary-container/40 text-secondary text-xs flex items-center gap-2 font-semibold">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-on-surface">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={role === 'USER' ? 'e.g. Rahul Sharma' : 'e.g. Priya Patel'}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-sm focus:border-secondary outline-none"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-on-surface">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={role === 'USER' ? 'rahul@creator.in' : 'priya@brand.in'}
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
              minLength={8}
              required
            />
            <p className="text-[11px] text-on-surface-variant">Must be at least 8 characters with letters and numbers or symbols.</p>
          </div>

          {role === 'ADVERTISER' && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface">Organization / Company Name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Apex FinTech Solutions Pvt. Ltd."
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-sm focus:border-secondary outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface">GSTIN (Optional)</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="29AAACZ1234A1Z5"
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant/40 text-sm focus:border-secondary outline-none"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-secondary text-on-secondary font-bold text-sm hover:bg-on-secondary-container transition-colors shadow-xs"
          >
            {loading ? 'Creating Account in Database...' : `Register as ${role === 'USER' ? 'Creator' : 'Brand'}`}
          </button>
        </form>

        <div className="text-center pt-2 space-y-2">
          <p className="text-xs text-on-surface-variant">
            Already have an account?{' '}
            <Link href="/login" className="text-secondary font-bold hover:underline">
              Sign In here
            </Link>
          </p>
          <div>
            <Link href="/login" className="text-xs text-on-surface-variant hover:text-on-surface">
              ← Return to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
