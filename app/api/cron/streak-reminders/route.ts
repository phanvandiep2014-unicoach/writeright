import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { sendMail } from '@/lib/mailer';
import { computeStreak, ictDay } from '@/lib/practice-insights';
import { unsubscribeUrl } from '@/lib/unsubscribe';
import { streakHtml, streakSubject, streakText } from '@/lib/emails/streak-reminder';

/**
 * Cron nhắc giữ chuỗi luyện tập — chạy MỘT LẦN MỖI NGÀY lúc 19:00 giờ VN (xem vercel.json).
 *
 * AN TOÀN MẶC ĐỊNH: chỉ GỬI THẬT khi biến môi trường STREAK_REMINDERS_ENABLED=1.
 * Không đặt biến (hoặc dryRun=1) thì chỉ liệt kê ai sẽ được nhắc, không gửi, không ghi log.
 *
 * Chỉ nhắc người đã có chuỗi từ MIN_STREAK ngày trở lên (chuỗi tính đến hôm qua) và chưa
 * luyện hôm nay. Tối đa một email mỗi người mỗi ngày: chèn email_log TRƯỚC khi gửi
 * (UNIQUE(user_id, kind, expires_on) với kind='streak', expires_on = ngày hôm nay).
 * Mỗi email có link huỷ đăng ký (lib/unsubscribe.ts → /api/unsubscribe).
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MIN_STREAK = 3;
const MAX_PER_RUN = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET chua duoc dat' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const enabled = process.env.STREAK_REMINDERS_ENABLED === '1';
  const dryRun = !enabled || req.nextUrl.searchParams.get('dryRun') === '1';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://writeright.unicoach.vn';
  const today = ictDay(Date.now());
  const admin = createAdminSupabase();

  const { data, error } = await admin.rpc('users_due_for_streak_reminder', { max_rows: MAX_PER_RUN });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type Row = { user_id: string; email: string; full_name: string | null; active_days: string[] };
  const rows = (data ?? []) as Row[];

  let daGui = 0, boQua = 0, loi = 0, khongDuChuoi = 0;
  const chiTiet: Record<string, unknown>[] = [];

  for (const r of rows) {
    // Chuỗi tính đến hôm qua (hôm nay chưa luyện thì computeStreak vẫn giữ chuỗi đến hôm qua).
    const streak = computeStreak(r.active_days ?? [], today).current;
    if (streak < MIN_STREAK) { khongDuChuoi++; continue; }

    const input = {
      fullName: r.full_name,
      streak,
      practiceUrl: `${siteUrl}/practice/skills`,
      unsubscribeUrl: unsubscribeUrl(siteUrl, r.user_id, secret),
    };

    if (dryRun) { chiTiet.push({ to: r.email, streak, subject: streakSubject(input), dryRun: true }); continue; }

    const { error: logErr } = await admin.from('email_log').insert({
      user_id: r.user_id, kind: 'streak', expires_on: today, email_to: r.email,
    });
    if (logErr) {
      if (logErr.code === '23505') { boQua++; continue; }
      loi++; chiTiet.push({ to: r.email, error: logErr.message }); continue;
    }

    try {
      await sendMail({
        to: r.email, subject: streakSubject(input), html: streakHtml(input), text: streakText(input),
        headers: { 'List-Unsubscribe': `<${input.unsubscribeUrl}>` },
      });
      daGui++;
    } catch (e: any) {
      await admin.from('email_log').delete().eq('user_id', r.user_id).eq('kind', 'streak').eq('expires_on', today);
      loi++; chiTiet.push({ to: r.email, error: e?.message ?? String(e) });
    }
  }

  console.log(`cron/streak-reminders: dryRun=${dryRun} gui=${daGui} bo_qua=${boQua} khong_du_chuoi=${khongDuChuoi} loi=${loi}`);
  return NextResponse.json({ ranAt: new Date().toISOString(), dryRun, enabled, ungVien: rows.length, daGui, boQua, khongDuChuoi, loi, chiTiet });
}
