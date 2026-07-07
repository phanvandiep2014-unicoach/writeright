import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// POST /api/share-token  { evaluationId }
// → { token, url: /e/[token], scorecard_url: /share/[token] }
// Get-or-create share token; token column has default gen_random_uuid() in DB.

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

    // Check ownership
    const { data: ev, error: evErr } = await supabase
      .from('evaluations')
      .select('id, user_id')
      .eq('id', evaluationId)
      .eq('user_id', user.id)
      .single();
    if (evErr || !ev) return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 });

    // Try to get existing token
    const { data: existing } = await supabase
      .from('shares')
      .select('token')
      .eq('evaluation_id', evaluationId)
      .maybeSingle();
    if (existing?.token) {
      const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || '';
      return NextResponse.json({ token: existing.token, url: `${origin}/e/${existing.token}`, scorecard_url: `${origin}/share/${existing.token}` });
    }

    // Insert new share row — token has DEFAULT gen_random_uuid() in DB
    const { data: created, error: insErr } = await supabase
      .from('shares')
      .insert({ evaluation_id: evaluationId, user_id: user.id })
      .select('token')
      .single();

    if (insErr || !created?.token) {
      console.error('[share-token] insert error:', insErr?.message, insErr?.code, insErr?.details);
      return NextResponse.json({ error: insErr?.message || 'Failed to create share token' }, { status: 500 });
    }

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || '';
    return NextResponse.json({
      token: created.token,
      url: `${origin}/e/${created.token}`,
      scorecard_url: `${origin}/share/${created.token}`,
    });
  } catch (err: any) {
    console.error('[share-token] catch:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
