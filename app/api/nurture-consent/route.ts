import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminSupabase } from '@/lib/supabase-admin';

/**
 * Đồng ý nhận email hướng dẫn/tư vấn (Giai đoạn 1 phễu).
 * GET  → { needed: boolean }  (chưa đồng ý và chưa hủy)
 * POST { band?, utm? } → ghi email_prefs.nurture_consent_at + đẩy lead về LMS (nếu có LMS_LEADS_API_KEY).
 * Ô đồng ý ở giao diện KHÔNG được tick sẵn; route này chỉ chạy khi người dùng bấm xác nhận.
 */
export const dynamic = 'force-dynamic';

async function currentUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, opts: CookieOptions) { try { cookieStore.set({ name, value, ...opts }); } catch {} },
        remove(name: string, opts: CookieOptions) { try { cookieStore.set({ name, value: '', ...opts }); } catch {} },
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ needed: false });
  const { data } = await createAdminSupabase().from('email_prefs')
    .select('nurture_consent_at, nurture_optout_at').eq('user_id', user.id).maybeSingle();
  return NextResponse.json({ needed: !(data?.nurture_consent_at || data?.nurture_optout_at) });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || !user.email) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
  let body: any = {};
  try { body = await req.json(); } catch {}
  const now = new Date().toISOString();

  const { error } = await createAdminSupabase().from('email_prefs').upsert({
    user_id: user.id, nurture_consent_at: now, nurture_consent_source: 'writeright_result',
    nurture_optout_at: null, updated_at: now,
  });
  if (error) return NextResponse.json({ error: 'save_failed' }, { status: 500 });

  // Đẩy lead về LMS — không làm hỏng việc lưu đồng ý nếu LMS lỗi/chưa cấu hình.
  let lms: 'sent' | 'skipped' | 'failed' = 'skipped';
  const key = process.env.LMS_LEADS_API_KEY;
  if (key) {
    const base = (process.env.LMS_BASE_URL || 'https://lms.unicoach.vn').replace(/\/$/, '');
    const band = Number(body.band);
    const utm = body.utm && typeof body.utm === 'object' ? body.utm : {};
    try {
      const r = await fetch(base + '/api/v1/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key },
        body: JSON.stringify({
          name: (user.user_metadata?.full_name || user.user_metadata?.name || '').toString().slice(0, 100) || null,
          email: user.email,
          interest: 'WriteRight',
          band_overall: Number.isFinite(band) && band >= 0 && band <= 9 ? band : undefined,
          utm: { utm_source: 'writeright', utm_medium: 'results', ...utm },
          landing_site: 'writeright',
          consent: true,
          consent_source: 'writeright_result',
          external_ref: 'wr:' + user.id,
        }),
        signal: AbortSignal.timeout(8000),
      });
      lms = r.ok ? 'sent' : 'failed';
    } catch { lms = 'failed'; }
  }
  return NextResponse.json({ ok: true, lms });
}
