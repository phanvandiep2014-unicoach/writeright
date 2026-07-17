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
      <header className="app-header">
        <div className="app-header-inner">
          <Link href="/" className="app-logo-link" aria-label="WriteRight home">
            <img src="/favicon.svg" alt="" width={30} height={30} />
            <span className="app-logo-wordmark">Write<span className="gold-foil">Right</span></span>
          </Link>
          <span style={{ flex: 1 }} /><span className="app-nav-link" style={{ cursor: 'default', opacity: .7 }}>Phiếu chấm điểm</span><Link href="/dashboard" className="app-nav-link">Dashboard →</Link>
        </div>
      </header>
      <EvalDetailView row={row} />
    </div>
  );
}
