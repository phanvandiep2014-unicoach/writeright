import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// POST /api/share-token
// Body: { evaluationId: string }
// Returns: { token: string, url: string }
// Gets or creates a share token for the given evaluation.
// The token can be used to access /e/[token] (full detail) or /share/[token] (scorecard).

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

    // Auth check — must be the owner
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check ownership
    const { data: ev } = await supabase
      .from('evaluations')
      .select('id, user_id')
      .eq('id', evaluationId)
      .eq('user_id', user.id)
      .single();
    if (!ev) return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 });

    // Get or create share token
    const { data: existing } = await supabase
      .from('shares')
      .select('token')
      .eq('evaluation_id', evaluationId)
      .maybeSingle();

    let token = existing?.token;
    if (!token) {
      const { data: created } = await supabase
        .from('shares')
        .insert({ evaluation_id: evaluationId, user_id: user.id })
        .select('token')
        .single();
      token = created?.token;
    }
    if (!token) return NextResponse.json({ error: 'Failed to create share token' }, { status: 500 });

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || '';
    return NextResponse.json({
      token,
      url: `${origin}/e/${token}`,
      scorecard_url: `${origin}/share/${token}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
