import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// POST /api/share-token
// Body: { evaluationId: string }
// Auth: via Supabase SSR cookie (same session as browser)
// Returns { token, url, scorecard_url }

export async function POST(req: Request) {
  try {
    const { evaluationId } = await req.json();
    if (!evaluationId) return NextResponse.json({ error: 'evaluationId required' }, { status: 400 });

    // Use SSR cookie-based auth — same pattern as other API routes
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, opts: CookieOptions) {
            try { cookieStore.set({ name, value, ...opts }); } catch {}
          },
          remove(name: string, opts: CookieOptions) {
            try { cookieStore.set({ name, value: '', ...opts }); } catch {}
          },
        },
      }
    );

    // Verify user from session cookie
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'AUTH_REQUIRED', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    // Verify ownership of the evaluation
    const { data: ev } = await supabase
      .from('evaluations').select('id').eq('id', evaluationId).eq('user_id', user.id).single();
    if (!ev) return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 });

    // Return existing share if already created
    const { data: existing } = await supabase
      .from('shares').select('id').eq('evaluation_id', evaluationId).maybeSingle();
    if (existing?.id) {
      const origin = req.headers.get('origin') || 'https://writeright-w5r9.vercel.app';
      return NextResponse.json({
        token: existing.id,
        url: `${origin}/e/${existing.id}`,
        scorecard_url: `${origin}/share/${existing.id}`,
      });
    }

    // Create new share record
    const { data: created, error: insErr } = await supabase
      .from('shares').insert({ evaluation_id: evaluationId, user_id: user.id }).select('id').single();
    if (insErr || !created?.id) {
      console.error('[share-token] insert error:', insErr?.message);
      return NextResponse.json({ error: insErr?.message || 'Insert failed' }, { status: 500 });
    }

    const origin = req.headers.get('origin') || 'https://writeright-w5r9.vercel.app';
    return NextResponse.json({
      token: created.id,
      url: `${origin}/e/${created.id}`,
      scorecard_url: `${origin}/share/${created.id}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
