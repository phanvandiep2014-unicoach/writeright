import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase-admin';

/**
 * Cron đồng bộ quyền Standard cấp cho học viên "đang học" (enrolled_override).
 * Chạy hàng ngày (xem vercel.json) — KHÔNG phụ thuộc học viên có mở lại
 * WriteRight/Precisely hay không, khác với việc cấp/hạ tức thời ở app/sso/route.ts.
 *
 * VÌ SAO CẦN FILE NÀY: app/sso/route.ts chỉ đồng bộ quyền vào lúc học viên
 * MỞ app từ LMS. Học viên nghỉ học và không mở app nữa thì tier/speak_plan
 * cũ vẫn còn nguyên vô hạn. Cron này chủ động hỏi lại BMS xem ai còn active,
 * rồi hạ quyền những người enrolled_override=true nhưng không còn trong danh
 * sách đó — không cần đợi họ mở app lại.
 *
 * KHÔNG cấp quyền mới ở đây (chỉ hạ) — việc cấp vẫn xảy ra ngay khi học viên
 * mở app từ LMS (app/sso/route.ts), không cần chờ cron.
 *
 * An toàn khi BMS không gọi được: KHÔNG hạ quyền của ai — lỗi mạng/API không
 * được phép biến thành mất quyền của học viên còn đang học thật.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type ActiveStudentsResponse = { count: number; codes: string[] };

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET chua duoc dat' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const base = (process.env.UNICOACH_LMS_URL || 'https://unicoach-bms-production.up.railway.app').replace(/\/+$/, '');
  const apiKey = process.env.UNICOACH_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'UNICOACH_API_KEY chua duoc dat' }, { status: 500 });

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';

  // ── 1. Hỏi BMS ai còn đang học. Lỗi ở bước này → dừng, KHÔNG hạ quyền ai.
  let activeCodes: Set<string>;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(`${base}/api/v1/active-students`, {
      headers: { 'X-API-Key': apiKey }, signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) throw new Error(`BMS trả về ${r.status}`);
    const data = (await r.json()) as ActiveStudentsResponse;
    activeCodes = new Set((data.codes || []).map((c) => String(c).trim()));
  } catch (e: any) {
    console.error('[cron/sync-active-students] không lấy được danh sách từ BMS:', e?.message);
    return NextResponse.json({ error: 'bms_unreachable', detail: e?.message ?? String(e) }, { status: 502 });
  }

  const admin = createAdminSupabase();

  // ── 2. Ai đang được cơ chế này cấp quyền.
  const { data: overridden, error: selErr } = await admin
    .from('profiles')
    .select('id, email, lms_student_code')
    .eq('enrolled_override', true);

  if (selErr) {
    console.error('[cron/sync-active-students]', selErr.message);
    return NextResponse.json({ error: 'db_error', detail: selErr.message }, { status: 500 });
  }

  const rows = overridden ?? [];
  let revoked = 0, kept = 0, skippedNoCode = 0;
  const chiTiet: Record<string, unknown>[] = [];

  for (const p of rows) {
    const code = (p.lms_student_code || '').trim();
    if (!code) {
      // Chưa có mã (tài khoản được cấp trước khi có cột lms_student_code, hoặc
      // chưa đăng nhập lại lần nào từ đợt deploy này) — KHÔNG đoán, bỏ qua an toàn.
      skippedNoCode++;
      chiTiet.push({ email: p.email, action: 'skip_no_code' });
      continue;
    }
    if (activeCodes.has(code)) { kept++; continue; }

    chiTiet.push({ email: p.email, code, action: dryRun ? 'would_revoke' : 'revoke' });
    if (dryRun) continue;

    const { error: revokeErr } = await admin
      .from('profiles')
      .update({
        tier: 'free', tier_expires_at: null,
        speak_plan: 'free', speak_expires_at: null,
        enrolled_override: false,
      })
      .eq('id', p.id)
      .eq('enrolled_override', true);   // tránh đè lên nếu vừa được /sso cấp lại đúng lúc cron chạy

    if (revokeErr) {
      console.error('[cron/sync-active-students] hạ quyền lỗi:', p.email, revokeErr.message);
      chiTiet.push({ email: p.email, code, error: revokeErr.message });
    } else {
      revoked++;
    }
  }

  console.log(`cron/sync-active-students: revoked=${revoked} kept=${kept} skippedNoCode=${skippedNoCode} dryRun=${dryRun}`);

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    dryRun,
    activeCodesCount: activeCodes.size,
    overriddenCount: rows.length,
    revoked, kept, skippedNoCode,
    chiTiet,
  });
}
