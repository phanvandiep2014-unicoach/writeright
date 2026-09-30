import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { sendMail } from '@/lib/mailer';
import { unsubscribeUrl } from '@/lib/unsubscribe';
import { pickNurture, withUtm, type NurtureCandidate, type NurtureKind } from '@/lib/nurture';
import { nurtureHtml, nurtureSubject, nurtureText, type BandRoute, type NurtureEmailInput } from '@/lib/emails/nurture';

/**
 * Cron nurture theo hành vi — chạy MỘT LẦN MỖI NGÀY lúc 09:00 giờ VN (xem vercel.json).
 *
 * AN TOÀN MẶC ĐỊNH: chỉ GỬI THẬT khi NURTURE_ENABLED=1. Không đặt biến (hoặc dryRun=1)
 * thì chỉ liệt kê ai sẽ nhận email nào, không gửi, không ghi log.
 *
 * Chỉ người ĐÃ đồng ý (email_prefs.nurture_consent_at) và CHƯA hủy mới có trong danh sách
 * (xem sql/nurture.sql). Mỗi người tối đa một email mỗi lần chạy; mỗi loại một lần trong đời:
 * chèn email_log TRƯỚC khi gửi (UNIQUE(user_id, kind, expires_on), expires_on cố định theo người).
 *
 * Kiểm tra SMTP mà không đụng ai: ?testTo=<email>&kind=nurture_d1|nurture_d3|nurture_d7|nurture_results
 * gửi một thư mẫu tới đúng địa chỉ đó (vẫn cần CRON_SECRET), không đọc DB, không ghi log.
 *
 * Biến môi trường: CRON_SECRET, SMTP_*, NEXT_PUBLIC_SITE_URL, UNICOACH_LMS_URL,
 * NURTURE_ENABLED, và tùy chọn NURTURE_CTA_URL (mặc định https://unicoach.vn/),
 * NURTURE_CAMPAIGN (mặc định hoalac_free_test_2026q4).
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_PER_RUN = 100;
const KINDS: NurtureKind[] = ['nurture_d1', 'nurture_d3', 'nurture_d7', 'nurture_results'];

async function fetchRoute(lms: string, band: number): Promise<BandRoute | null> {
  try {
    const r = await fetch(`${lms}/api/public/band-route?band=${band}`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.label ? { route: j.route, code: j.code, label: j.label } : null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET chua duoc dat' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://writeright.unicoach.vn';
  const lms = (process.env.UNICOACH_LMS_URL || 'https://lms.unicoach.vn').replace(/\/$/, '');
  const ctaBase = process.env.NURTURE_CTA_URL || 'https://unicoach.vn/';
  const campaign = process.env.NURTURE_CAMPAIGN || 'hoalac_free_test_2026q4';
  const unsub = (userId: string) => `${unsubscribeUrl(siteUrl, userId, secret)}&k=nurture`;

  const build = (kind: NurtureKind, c: { user_id: string; full_name: string | null; band?: number | null; route?: BandRoute | null }): NurtureEmailInput => ({
    kind, fullName: c.full_name,
    practiceUrl: withUtm(`${siteUrl}/evaluate`, kind, campaign),
    ctaUrl: withUtm(ctaBase, kind, campaign),
    unsubscribeUrl: unsub(c.user_id),
    band: c.band ?? null, route: c.route ?? null,
  });

  // ── Chế độ thư mẫu để thử SMTP ─────────────────────────────────
  const testTo = req.nextUrl.searchParams.get('testTo');
  if (testTo) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testTo)) return NextResponse.json({ error: 'testTo khong hop le' }, { status: 400 });
    const kind = (req.nextUrl.searchParams.get('kind') || 'nurture_results') as NurtureKind;
    if (!KINDS.includes(kind)) return NextResponse.json({ error: 'kind khong hop le' }, { status: 400 });
    const route = await fetchRoute(lms, 5.5);
    const input = build(kind, { user_id: '00000000-0000-0000-0000-000000000000', full_name: 'Test', band: 5.5, route });
    try {
      await sendMail({
        to: testTo, subject: `[TEST] ${nurtureSubject(input)}`, html: nurtureHtml(input), text: nurtureText(input),
        headers: { 'List-Unsubscribe': `<${input.unsubscribeUrl}>` },
      });
      return NextResponse.json({ ok: true, test: true, to: testTo, kind, routeFromLms: route });
    } catch (e: any) {
      return NextResponse.json({ ok: false, test: true, error: e?.message ?? String(e) }, { status: 500 });
    }
  }

  const enabled = process.env.NURTURE_ENABLED === '1';
  const dryRun = !enabled || req.nextUrl.searchParams.get('dryRun') === '1';
  const admin = createAdminSupabase();

  const { data, error } = await admin.rpc('users_due_for_nurture', { max_rows: 300 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []) as NurtureCandidate[];

  const now = Date.now();
  const routeCache = new Map<number, BandRoute | null>();
  let daGui = 0, boQua = 0, chuaDenLuc = 0, khongCoKhoa = 0, loi = 0, xuLy = 0;
  const chiTiet: Record<string, unknown>[] = [];

  for (const c of rows) {
    const pick = pickNurture(c, now);
    if (!pick) { chuaDenLuc++; continue; }
    if (xuLy >= MAX_PER_RUN) break;

    let band: number | null = null;
    let route: BandRoute | null = null;
    if (pick.kind === 'nurture_results') {
      band = Number(c.last_band);
      if (!routeCache.has(band)) routeCache.set(band, await fetchRoute(lms, band));
      route = routeCache.get(band) ?? null;
      if (!route) { khongCoKhoa++; continue; }   // LMS không trả lời: bỏ qua, mai thử lại, KHÔNG ghi log
    }
    xuLy++;
    const input = build(pick.kind, { user_id: c.user_id, full_name: c.full_name, band, route });

    if (dryRun) { chiTiet.push({ to: c.email, kind: pick.kind, subject: nurtureSubject(input), dryRun: true }); continue; }

    const { error: logErr } = await admin.from('email_log').insert({
      user_id: c.user_id, kind: pick.kind, expires_on: pick.expiresOn, email_to: c.email,
    });
    if (logErr) {
      if (logErr.code === '23505') { boQua++; continue; }
      loi++; chiTiet.push({ to: c.email, kind: pick.kind, error: logErr.message }); continue;
    }

    try {
      await sendMail({
        to: c.email, subject: nurtureSubject(input), html: nurtureHtml(input), text: nurtureText(input),
        headers: { 'List-Unsubscribe': `<${input.unsubscribeUrl}>` },
      });
      daGui++;
      chiTiet.push({ to: c.email, kind: pick.kind, ok: true });
    } catch (e: any) {
      await admin.from('email_log').delete()
        .eq('user_id', c.user_id).eq('kind', pick.kind).eq('expires_on', pick.expiresOn);
      loi++; chiTiet.push({ to: c.email, kind: pick.kind, error: e?.message ?? String(e) });
    }
  }

  console.log(`cron/nurture: dryRun=${dryRun} ungVien=${rows.length} gui=${daGui} bo_qua=${boQua} chua_den_luc=${chuaDenLuc} khong_co_khoa=${khongCoKhoa} loi=${loi}`);
  return NextResponse.json({ ranAt: new Date().toISOString(), dryRun, enabled, ungVien: rows.length, daGui, boQua, chuaDenLuc, khongCoKhoa, loi, chiTiet });
}
