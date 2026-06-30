'use client';
import { Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

const CALLBACK_URL = 'https://writeright-w5r9.vercel.app/auth/callback';

function LoginContent() {
  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: CALLBACK_URL },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-navy-800 border border-navy-700 rounded-2xl p-8 w-full max-w-md animate-fade-up">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-500/20 border border-brand-500/50 flex items-center justify-center text-brand-400 font-bold text-xl mx-auto mb-4">W</div>
          <h1 className="font-['DM_Serif_Display'] text-2xl text-white mb-2">ÄÄng nháº­p WriteRight</h1>
          <p className="text-navy-400 text-sm">ÄÄng nháº­p Äá» lÆ°u lá»ch sá»­ cháº¥m Äiá»m vÃ  theo dÃµi tiáº¿n bá»</p>
        </div>
        <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 py-3 rounded-xl font-medium hover:bg-gray-100 transition text-sm">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          ÄÄng nháº­p vá»i Google
        </button>
        <p className="text-center text-xs text-navy-500 mt-6 leading-relaxed">
          Báº±ng viá»c ÄÄng nháº­p, báº¡n Äá»ng Ã½ vá»i{' '}
          <Link href="/terms" className="text-brand-400/70 hover:text-brand-400 transition underline underline-offset-2">Äiá»u khoáº£n dá»ch vá»¥</Link>{' '}
          vÃ {' '}
          <Link href="/privacy" className="text-brand-400/70 hover:text-brand-400 transition underline underline-offset-2">ChÃ­nh sÃ¡ch báº£o máº­t</Link>{' '}
          cá»§a WriteRight.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#C8A14B', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
