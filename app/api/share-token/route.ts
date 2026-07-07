import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const { evaluationId } = await req.json();
    if (!evaluationId) return NextResponse.json({ error: 'evaluationId required' }, { status: 400 });

    const supabase = createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: ev } = await supabase
      .from('evaluations').select('id').eq('id', evaluationId).eq('user_id', user.id).single();
    if (!ev) return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 });

    // Check for existing share
    const { data: existing } = await supabase
      .from('shares').select('id').eq('evaluation_id', evaluationId).maybeSingle();

    if (existing?.id) {
      const origin = req.headers.get('origin') || 'https://writeright-w5r9.vercel.app';
      return NextResponse.json({ token: existing.id, url: `${origin}/e/${existing.id}`, scorecard_url: `${origin}/share/${existing.id}` });
    }

    // Create new share
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
