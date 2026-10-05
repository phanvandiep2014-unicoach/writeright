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

  // ── 3. CẤP quyền cho học viên đã được xếp lớp SAU lần đăng nhập SSO gần nhất.
  // Lỗi thực tế 05/10/2026: học viên tự đăng ký Google (token lúc đó is_active_student=false),
  // sau đó mới được xếp lớp → chỉ cấp ở /sso thì họ mãi ở gói free nếu không mở lại từ LMS.
  // Khớp CHÍNH XÁC theo lms_student_code (không đoán); chỉ cấp cho tài khoản đang ở gói free
  // hoặc đã hết hạn — không đè lên khách đang trả tiền còn hạn.
  let granted = 0;
  if (activeCodes.size > 0) {
    const { data: cands, error: candErr } = await admin
      .from('profiles')
      .select('id, email, lms_student_code, tier, tier_expires_at, enrolled_override')
      .in('lms_student_code', Array.from(activeCodes))
      .or('enrolled_override.is.null,enrolled_override.eq.false');
    if (candErr) {
      console.error('[cron/sync-active-students] đọc ứng viên cấp quyền lỗi:', candErr.message);
    } else {
      const now = Date.now();
      for (const p of cands ?? []) {
        const paidActive = p.tier && p.tier !== 'free' && p.tier_expires_at && Date.parse(p.tier_expires_at) > now;
        if (paidActive) continue;
        chiTiet.push({ email: p.email, code: p.lms_student_code, action: dryRun ? 'would_grant' : 'grant' });
        if (dryRun) continue;
        const { error: gErr } = await admin
          .from('profiles')
          .update({
            tier: 'standard', tier_expires_at: null,
            speak_plan: 'speak', speak_expires_at: null,
            enrolled_override: true,
          })
          .eq('id', p.id);
        if (gErr) console.error('[cron/sync-active-students] cấp quyền lỗi:', p.email, gErr.message);
        else granted++;
      }
    }
  }

  // ── 3b. Tài khoản CHƯA có mã học viên (tự đăng ký Google trên WriteRight, chưa từng đi qua SSO):
  // hỏi LMS theo email (POST /api/v1/lookup-user — API có sẵn, chỉ trả mã). Có mã và mã đó
  // đang xếp lớp → ghi mã + cấp Standard. Giới hạn 100 tài khoản/lần để không vượt maxDuration.
  let linkedByEmail = 0;
  if (activeCodes.size > 0) {
    const { data: noCode } = await admin
      .from('profiles')
      .select('id, email, tier, tier_expires_at, role')
      .is('lms_student_code', null)
      .not('email', 'is', null)
      .or('enrolled_override.is.null,enrolled_override.eq.false')
      .limit(100);
    const now2 = Date.now();
    for (const p of noCode ?? []) {
      if (p.role === 'admin' || p.role === 'teacher') continue;
      const paidActive = p.tier && p.tier !== 'free' && p.tier_expires_at && Date.parse(p.tier_expires_at) > now2;
      if (paidActive) continue;
      let code: string | null = null;
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const r = await fetch(`${base}/api/v1/lookup-user`, {
          method: 'POST',
          headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: String(p.email).trim().toLowerCase() }),
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (r.ok) code = ((await r.json()) as { student_code?: string | null }).student_code?.trim() || null;
      } catch { /* lỗi mạng một người → bỏ qua, lần sau thử lại */ }
      if (!code || !activeCodes.has(code)) continue;
      chiTiet.push({ email: p.email, code, action: dryRun ? 'would_link_and_grant' : 'link_and_grant' });
      if (dryRun) continue;
      const { error: lErr } = await admin
        .from('profiles')
        .update({
          lms_student_code: code,
          tier: 'standard', tier_expires_at: null,
          speak_plan: 'speak', speak_expires_at: null,
          enrolled_override: true,
        })
        .eq('id', p.id);
      if (lErr) console.error('[cron/sync-active-students] liên kết theo email lỗi:', p.email, lErr.message);
      else { linkedByEmail++; granted++; }
    }
  }

  console.log(`cron/sync-active-students: linkedByEmail=${linkedByEmail} granted=${granted} revoked=${revoked} kept=${kept} skippedNoCode=${skippedNoCode} dryRun=${dryRun}`);

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    dryRun,
    activeCodesCount: activeCodes.size,
    overriddenCount: rows.length,
    granted, revoked, kept, skippedNoCode,
    chiTiet,
  });
}
