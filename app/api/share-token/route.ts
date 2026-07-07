import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

// POST /api/share-token  { evaluationId }
// Returns { token, url, scorecard_url }
// Uses shares.id as token — no extra column needed.

export async function POST(req: Request) {
  try {
    const { evaluationId } = await req.json();
    if (!evaluationId) return NextResponse.json({ error: 'evaluationId required' }, { status: 400 });

    const supabase = createServerSupabase();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify ownership
    const { data: ev } = await supabase
      .from('evaluations').select('id').eq('id', evaluationId).eq('user_id', user.id).single();
    if (!ev) return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 });

    // Check for existing share
    const { data: existing } = await supabase
      .from('shares').select('id').eq('evaluation_id', evaluationId).maybeSingle();

    let token: string;
    if (existing?.id) {
      token = existing.id;
    } else {
      const { data: created, error: insErr } = await supabase
        .from('shares').insert({ evaluation_id: evaluationId, user_id: user.id })
        .select('id').single();
      if (insErr || !created?.id) {
        console.error('[share-token]', insErr?.message, insErr?.code);
        return NextResponse.json({ error: insErr?.message || 'Insert failed' }, { status: 500 });
      }
      token = created.id;
    }

    const origin = req.headers.get('origin') || 'https://writeright-w5r9.vercel.app';
    return NextResponse.json({
      token,
      url: `${origin}/e/${token}`,
      scorecard_url: `${origin}/share/${token}`,
    });
  } catch (err: any) {
    console.error('[share-token]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
