'use client';
import { useState } from 'react';
import Link from 'next/link';
import { PricingRoyal } from '@/components/PricingRoyal';

/**
 * /pricing — dedicated pricing page.
 * Paid tiers now call /api/checkout to create a real PayOS payment link.
 * Free tier still routes straight to /evaluate.
 */
export default function PricingPage() {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleChoose = async (tierId: string) => {
    if (tierId === 'free') {
      window.location.href = '/evaluate';
      return;
    }

    setErrorMsg(null);
    setLoadingTier(tierId);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tierId }),
      });
      const body = await res.json();

      if (!res.ok) {
        if (body.code === 'AUTH_REQUIRED') {
          // Not logged in — send to login, then back to pricing.
          window.location.href = '/login?next=/pricing';
          return;
        }
        setErrorMsg(body.error || 'Có lỗi xảy ra. Vui lòng thử lại.');
        setLoadingTier(null);
        return;
      }

      // Redirect to PayOS hosted checkout page.
      window.location.href = body.checkoutUrl;
    } catch {
      setErrorMsg('Không thể kết nối tới máy chủ. Vui lòng thử lại.');
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="app-header">
        <div className="app-header-inner">
          <Link href="/" className="app-logo-link" aria-label="WriteRight home">
            <img src="/favicon.svg" alt="" width={30} height={30} />
            <span className="app-logo-wordmark">Write<span className="gold-foil">Right</span></span>
          </Link>
          <span style={{ flex: 1 }} /><Link href="/evaluate" className="app-nav-link">Chấm bài</Link><Link href="/dashboard" className="app-nav-link">Dashboard</Link>
        </div>
      </header>

      <main>
        {errorMsg && (
          <div className="max-w-3xl mx-auto px-4 pt-6">
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-sm px-4 py-3">
              {errorMsg}
            </div>
          </div>
        )}
        <PricingRoyal
          onChoose={handleChoose}
        />
        {loadingTier && (
          <div className="text-center pb-10 -mt-4 text-sm text-navy-400 font-mono">
            Đang tạo link thanh toán…
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-navy-700 py-8">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-xs text-navy-500 font-mono">
          <span>© 2026 WriteRight · UNICOACH</span>
          <span>Powered by Claude AI</span>
        </div>
      </footer>
    </div>
  );
}
