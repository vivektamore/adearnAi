'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LegacyChatGptWizardRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to the unified campaign studio
    router.replace('/advertiser/campaigns/new');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-2xl animate-spin">progress_activity</span>
        </div>
        <h2 className="text-base font-bold text-gray-900">Redirecting to Unified Campaign Studio</h2>
        <p className="text-xs text-gray-600">
          AdEarn has upgraded to a single, omnichannel campaign creation hub with autonomous ChatGPT context generation and compliance review.
        </p>
        <Link
          href="/advertiser/campaigns/new"
          className="inline-block text-xs font-semibold text-purple-700 hover:text-purple-800 underline"
        >
          Click here if you are not redirected automatically
        </Link>
      </div>
    </div>
  );
}
