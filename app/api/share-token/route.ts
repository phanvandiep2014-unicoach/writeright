import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// POST /api/share-token
// Body: { evaluationId: string }
// Header: Authorization: Bearer <supabase_access_token>
// Returns { token, url, scorecard_url }

export async function POST(req: Request) {
  try {
    const { evaluationId } = await req.json();
    if (!evaluationId) return NextResponse.json({ error: 'evaluationId required' }, { status: 400 });

    // Get JWT from Authorization header (sent by EvalCard component)
    const authHeader = req.headers.get('authorization');
    const jwt = authHeader?.replace('Bearer ', '').trim();
    if (!jwt) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Create Supabase client with user JWT passed via Authorization header
    // Do NOT pass jwt as argument to getUser() — pass it via global header instead
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    // Verify user — no argument needed; JWT is in the header above
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      console.error('[share-token] auth error:', authErr?.message);
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
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
      return NextResponse.json({ token: existing.id, url: `${origin}/e/${existing.id}`, scorecard_url: `${origin}/share/${existing.id}` });
    }

    // Create new share record
    const { data: created, error: insErr } = await supabase
      .from('shares').insert({ evaluation_id: evaluationId, user_id: user.id }).select('id').single();
    if (insErr || !created?.id) {
      console.error('[share-token] insert error:', insErr?.message, insErr?.code);
      return NextResponse.json({ error: insErr?.message || 'Insert failed' }, { status: 500 });
    }

    const origin = req.headers.get('origin') || 'https://writeright-w5r9.vercel.app';
    return NextResponse.json({ token: created.id, url: `${origin}/e/${created.id}`, scorecard_url: `${origin}/share/${created.id}` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
