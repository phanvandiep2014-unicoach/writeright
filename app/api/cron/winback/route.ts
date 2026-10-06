import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { sendMail } from '@/lib/mailer';
import { unsubscribeUrl } from '@/lib/unsubscribe';
import { expiryKey, pickWinback, progressLine, type WinbackKind } from '@/lib/winback';
import { winbackHtml, winbackSubject, winbackText, type WinbackEmailInput } from '@/lib/emails/winback';

/**
 * Cron win-back - mỗi ngày 08:30 giờ VN (xem vercel.json). Bù chỗ trống của renewal-reminders
 * (chỉ nhắc TRƯỚC khi hết hạn): gửi cho khách trả phí đã hết hạn 2-9 ngày và 13-20 ngày mà chưa gia hạn.
 *
 * AN TOÀN MẶC ĐỊNH: chỉ GỬI THẬT khi WINBACK_ENABLED=1. Không đặt biến (hoặc ?dryRun=1)
 * thì chỉ liệt kê ai sẽ nhận email nào. ?testTo=<email>&kind=winback_3d|winback_14d gửi một thư mẫu.
 * Chèn email_log TRƯỚC khi gửi (UNIQUE chống trùng), gửi hỏng thì xoá log để lần sau thử lại.
 * Huỷ nhận: dùng chung cờ nurture (email_prefs.nurture_optout_at, link &k=nurture).
 *
 * Biến môi trường: CRON_SECRET, SMTP_*, NEXT_PUBLIC_SITE_URL, WINBACK_ENABLED,
 * tuỳ chọn WINBACK_REPLY_TO (hộp thư người thật đọc; có thì email 14 ngày mời khách trả lời lý do).
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const KINDS: WinbackKind[] = ['winback_3d', 'winback_14d'];
const DAY = 86_400_000;

const ddmmyyyy = (iso: string) => {
  const d = new Date(Date.parse(iso) + 7 * 3_600_000).toISOString().slice(0, 10).split('-');
  return `${d[2]}/${d[1]}/${d[0]}`;
};

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET chua duoc dat' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://writeright.unicoach.vn';
  const replyTo = process.env.WINBACK_REPLY_TO || undefined;
  const utm = (kind: string) => `utm_source=email&utm_medium=email&utm_campaign=winback&utm_content=${kind}`;
  const build = (kind: WinbackKind, userId: string, fullName: string | null, expIso: string, progress: string): WinbackEmailInput => ({
    kind, fullName, expiredOn: ddmmyyyy(expIso), progress,
    pricingUrl: `${siteUrl}/pricing?${utm(kind)}`,
    practiceUrl: `${siteUrl}/evaluate?${utm(kind)}`,
    unsubscribeUrl: `${unsubscribeUrl(siteUrl, userId, secret)}&k=nurture`,
    canReply: !!replyTo,
  });

  const testTo = req.nextUrl.searchParams.get('testTo');
  if (testTo) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testTo)) return NextResponse.json({ error: 'testTo khong hop le' }, { status: 400 });
    const kind = (req.nextUrl.searchParams.get('kind') || 'winback_3d') as WinbackKind;
    if (!KINDS.includes(kind)) return NextResponse.json({ error: 'kind khong hop le' }, { status: 400 });
    const input = build(kind, '00000000-0000-0000-0000-000000000000', 'Test', new Date(Date.now() - 3 * DAY).toISOString(), progressLine(12, 5.0, 5.5));
    try {
      await sendMail({ to: testTo, subject: `[TEST] ${winbackSubject(input)}`, html: winbackHtml(input), text: winbackText(input), replyTo,
        headers: { 'List-Unsubscribe': `<${input.unsubscribeUrl}>` } });
      return NextResponse.json({ ok: true, test: true, to: testTo, kind });
    } catch (e: any) {
      return NextResponse.json({ ok: false, test: true, error: e?.message ?? String(e) }, { status: 500 });
    }
  }

  const enabled = process.env.WINBACK_ENABLED === '1';
  const dryRun = !enabled || req.nextUrl.searchParams.get('dryRun') === '1';
  const admin = createAdminSupabase();
  const now = Date.now();

  // 1. Khách có hạn dùng rơi vào cửa sổ 2-21 ngày trước.
  const { data: profs, error: pErr } = await admin.from('profiles')
    .select('id, email, full_name, tier_expires_at, enrolled_override, role')
    .not('tier_expires_at', 'is', null)
    .gte('tier_expires_at', new Date(now - 21 * DAY).toISOString())
    .lte('tier_expires_at', new Date(now - 2 * DAY).toISOString());
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  const ids = (profs ?? []).map((p) => p.id);
  if (!ids.length) return NextResponse.json({ ranAt: new Date().toISOString(), dryRun, enabled, ungVien: 0, daGui: 0 });

  // 2. Số bài + band đầu/cuối, cờ huỷ nhận, các win-back đã gửi.
  const [ev, prefs, logs] = await Promise.all([
    admin.from('evaluations').select('user_id, overall_band, created_at').in('user_id', ids).order('created_at', { ascending: true }),
    admin.from('email_prefs').select('user_id, nurture_optout_at').in('user_id', ids),
    admin.from('email_log').select('user_id, kind, expires_on').in('user_id', ids).in('kind', KINDS),
  ]);
  if (ev.error || prefs.error || logs.error) {
    return NextResponse.json({ error: (ev.error || prefs.error || logs.error)!.message }, { status: 500 });
  }
  const stats = new Map<string, { n: number; first: number | null; last: number | null }>();
  for (const r of ev.data ?? []) {
    const s = stats.get(r.user_id) ?? { n: 0, first: null, last: null };
    const b = r.overall_band == null ? null : Number(r.overall_band);
    s.n++; if (s.first == null && b != null) s.first = b; if (b != null) s.last = b;
    stats.set(r.user_id, s);
  }
  const optout = new Set((prefs.data ?? []).filter((p) => p.nurture_optout_at).map((p) => p.user_id));

  let daGui = 0, boQua = 0, loi = 0, khongGui = 0, conLai = 0;
  const chiTiet: Record<string, unknown>[] = [];
  // Mỗi thư mất ~10-12 giây qua SMTP, hàm bị cắt ở maxDuration=60s. Ngừng BẮT ĐẦU thư mới sau 38s để không bị cắt
  // giữa chừng (đã ghi email_log mà chưa gửi); người còn lại sẽ được cron ngày hôm sau gửi tiếp.
  const t0 = Date.now();

  for (const p of profs ?? []) {
    const s = stats.get(p.id) ?? { n: 0, first: null, last: null };
    // Chỉ tính log của ĐÚNG kỳ hết hạn này - kỳ trước (đã gia hạn rồi lại hết) không được chặn kỳ mới.
    const cycle = expiryKey(p.tier_expires_at!);
    const sentThisCycle = (logs.data ?? [])
      .filter((l) => l.user_id === p.id && String(l.expires_on).slice(0, 10) === cycle)
      .map((l) => l.kind as WinbackKind);
    const pick = pickWinback({
      user_id: p.id, tier_expires_at: p.tier_expires_at, essays: s.n,
      enrolled_override: p.enrolled_override, role: p.role, optout: optout.has(p.id),
      sent: sentThisCycle,
    }, now);
    if (!pick || !p.email) { khongGui++; continue; }

    const input = build(pick.kind, p.id, p.full_name, p.tier_expires_at!, progressLine(s.n, s.first, s.last));
    if (dryRun) { chiTiet.push({ to: p.email, kind: pick.kind, subject: winbackSubject(input), progress: input.progress, dryRun: true }); continue; }

    if (Date.now() - t0 > 38_000) { conLai++; continue; }

    const { error: logErr } = await admin.from('email_log').insert({
      user_id: p.id, kind: pick.kind, expires_on: pick.expiresOn, email_to: p.email,
    });
    if (logErr) {
      if (logErr.code === '23505') { boQua++; continue; }
      loi++; chiTiet.push({ to: p.email, kind: pick.kind, error: logErr.message }); continue;
    }
    try {
      await sendMail({ to: p.email, subject: winbackSubject(input), html: winbackHtml(input), text: winbackText(input), replyTo,
        headers: { 'List-Unsubscribe': `<${input.unsubscribeUrl}>` } });
      daGui++; chiTiet.push({ to: p.email, kind: pick.kind, ok: true });
    } catch (e: any) {
      await admin.from('email_log').delete().eq('user_id', p.id).eq('kind', pick.kind).eq('expires_on', pick.expiresOn);
      loi++; chiTiet.push({ to: p.email, kind: pick.kind, error: e?.message ?? String(e) });
    }
  }

  console.log(`cron/winback: dryRun=${dryRun} ungVien=${ids.length} gui=${daGui} bo_qua=${boQua} khong_gui=${khongGui} loi=${loi} con_lai=${conLai}`);
  return NextResponse.json({ ranAt: new Date().toISOString(), dryRun, enabled, ungVien: ids.length, daGui, boQua, khongGui, loi, conLai, chiTiet });
}
