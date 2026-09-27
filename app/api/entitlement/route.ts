import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createAdminSupabase } from '@/lib/supabase-admin';

/**
 * GET /api/entitlement?email=<email>
 * Header: x-unicoach-key: <PRECISELY_ENTITLEMENT_SECRET>
 *
 * Precisely hỏi ở đây xem một email đang có gói NÓI nào. WriteRight là nơi
 * thu tiền duy nhất cho cả hai app (xem sql/precisely-duo.sql), nên đây là
 * nguồn sự thật về quyền lợi.
 *
 * Chỉ máy chủ Precisely gọi được (khoá bí mật dùng chung, so sánh hằng thời gian).
 * Thiếu biến môi trường → 503, không bao giờ mở cửa mặc định.
 * Trả về gói ĐÃ TÍNH HẠN: hết hạn thì 'free', để Precisely không phải tự so ngày.
 */
export const dynamic = 'force-dynamic';

function keyOk(given: string | null): boolean {
  const want = process.env.PRECISELY_ENTITLEMENT_SECRET || '';
  if (!want || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!process.env.PRECISELY_ENTITLEMENT_SECRET) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }
  if (!keyOk(req.headers.get('x-unicoach-key'))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const email = (req.nextUrl.searchParams.get('email') || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'bad_email' }, { status: 400 });
  }

  const { data, error } = await createAdminSupabase()
    .from('profiles')
    .select('speak_plan, speak_expires_at, tier, tier_expires_at, enrolled_override')
    // ilike để không phân biệt hoa thường — nhưng '_' và '%' là ký tự đại diện
    // của LIKE, mà email hay có '_' → phải thoát, không thì a_b@x khớp cả axb@x.
    .ilike('email', email.replace(/[\\%_]/g, (c) => '\\' + c))
    .order('speak_expires_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[entitlement]', error.message);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  const now = Date.now();
  const alive = (d: string | null | undefined) => !!d && new Date(d).getTime() > now;
  // enrolled_override = true → học viên đang học, LMS cấp Standard liên tục
  // (xem sql/enrolled-standard.sql); coi như không bao giờ hết hạn ở CẢ HAI trục.
  const overridden = !!data?.enrolled_override;
  const speakPlan = data && data.speak_plan !== 'free' && (overridden || alive(data.speak_expires_at)) ? data.speak_plan : 'free';
  const tier = data && data.tier !== 'free' && (overridden || !data.tier_expires_at || alive(data.tier_expires_at)) ? data.tier : 'free';

  return NextResponse.json(
    {
      found: !!data,
      speak_plan: speakPlan,
      speak_expires_at: speakPlan === 'free' ? null : data?.speak_expires_at ?? null,
      writing_tier: tier,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
