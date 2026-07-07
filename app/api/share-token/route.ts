import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { evaluationId } = await req.json();
    if (!evaluationId) return NextResponse.json({ error: 'evaluationId required' }, { status: 400 });

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (n:string) => cookieStore.get(n)?.value, set:()=>{}, remove:()=>{} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: ev } = await supabase
      .from('evaluations').select('id').eq('id', evaluationId).eq('user_id', user.id).single();
    if (!ev) return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 });

    // Check for existing share — only select id (token column may not exist)
    const { data: existing } = await supabase
      .from('shares').select('id').eq('evaluation_id', evaluationId).maybeSingle();

    let token: string;
    if (existing?.id) {
      token = existing.id;
    } else {
      // Insert new share — id is auto-generated UUID, use it as token
      const { data: created, error: insErr } = await supabase
        .from('shares').insert({ evaluation_id: evaluationId, user_id: user.id })
        .select('id').single();
      if (insErr || !created?.id) {
        console.error('[share-token] insert error:', insErr?.message, insErr?.code, insErr?.details);
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
    console.error('[share-token] catch:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
