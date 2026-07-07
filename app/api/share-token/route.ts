import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// POST /api/share-token  { evaluationId }
// Returns { token, url, scorecard_url }
// Uses shares.id as the token — no extra column needed.

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

    // Verify ownership
    const { data: ev } = await supabase
      .from('evaluations')
      .select('id')
      .eq('id', evaluationId)
      .eq('user_id', user.id)
      .single();
    if (!ev) return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 });

    // Check for existing share (using evaluation_id)
    const { data: existing } = await supabase
      .from('shares')
      .select('id, token')
      .eq('evaluation_id', evaluationId)
      .maybeSingle();

    let token: string;
    if (existing) {
      // Use token column if it exists, otherwise fall back to id
      token = existing.token || existing.id;
    } else {
      // Create new share row
      const insertPayload: any = { evaluation_id: evaluationId, user_id: user.id };
      const { data: created, error: insErr } = await supabase
        .from('shares')
        .insert(insertPayload)
        .select('id, token')
        .single();

      if (insErr || !created) {
        console.error('[share-token] insert error:', insErr?.message, insErr?.code);
        return NextResponse.json({ error: insErr?.message || 'Insert failed' }, { status: 500 });
      }
      // Use token column if exists, otherwise use id as token
      token = created.token || created.id;
    }

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://writeright-w5r9.vercel.app';
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
