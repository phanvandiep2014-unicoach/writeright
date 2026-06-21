'use client';
import Link from 'next/link';
import { PricingRoyal } from '@/components/PricingRoyal';

/**
 * /pricing — dedicated pricing page.
 * NOTE: Payment integration (PayOS) is not wired up yet. Selecting a paid
 * tier currently routes to /login to start the signup funnel; swap this
 * for a real checkout call once PayOS is integrated.
 */
export default function PricingPage() {
  const handleChoose = (tierId: string) => {
    if (tierId === 'free') {
      window.location.href = '/evaluate';
      return;
    }
    // TODO: replace with real PayOS checkout once available.
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-navy-900/95 backdrop-blur border-b border-navy-700">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/50 flex items-center justify-center text-brand-400 font-bold text-sm">W</div>
            <span className="font-['DM_Serif_Display'] text-lg text-white">Write<span className="text-brand-400">Right</span></span>
          </Link>
          <Link href="/dashboard" className="text-sm text-navy-400 hover:text-white transition font-mono">Dashboard →</Link>
        </div>
      </header>

      <main>
        <PricingRoyal onChoose={handleChoose} />
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
