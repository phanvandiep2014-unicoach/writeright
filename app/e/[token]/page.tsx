import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import EvalDetailView from '@/components/EvalDetailView';

// /e/[token] — Full evaluation detail page (read-only, shareable)
// Uses security definer RPC so public can view without auth

async function getEval(token: string) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set() {},
        remove() {},
      },
    }
  );

  // Validate UUID format before querying
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) return null;

  // Use security definer RPC — allows public access without auth
  const { data, error } = await supabase
    .rpc('get_evaluation_by_share', { p_share_id: token });

  if (error) {
    console.error('[e/token] RPC error:', error.message);
    return null;
  }
  return data?.[0] ?? null;
}

export default async function EvalDetailPage({ params }: { params: { token: string } }) {
  const row = await getEval(params.token);
  if (!row) return notFound();

  return (
    <div className="min-h-screen bg-navy-900">
      <header className="sticky top-0 z-50 bg-navy-900/95 backdrop-blur border-b border-navy-700">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/50 flex items-center justify-center text-brand-400 font-bold text-sm">W</div>
            <span className="text-white text-lg font-semibold" style={{ fontFamily: 'var(--font-wordmark)' }}>Write<span className="text-brand-400">Right</span></span>
          </Link>
          <span className="text-sm text-navy-400 font-mono">Phiếu chấm điểm</span>
        </div>
      </header>
      <EvalDetailView row={row} />
    </div>
  );
}
