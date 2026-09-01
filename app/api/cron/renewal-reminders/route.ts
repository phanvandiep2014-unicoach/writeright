import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { sendMail } from '@/lib/mailer';
import {
  renewalHtml, renewalSubject, renewalText, type RenewalEmailInput,
} from '@/lib/emails/renewal-reminder';

/**
 * Cron nhắc gia hạn — chạy MỘT LẦN MỖI NGÀY (xem vercel.json).
 *
 * Hệ thống không có auto-renew, nên đây là thứ duy nhất chủ động báo cho
 * người dùng biết họ sắp mất quyền. Nhắc ở hai mốc: còn 7 ngày và còn 1 ngày.
 *
 * Chống gửi trùng nằm ở DB: `email_log` có UNIQUE(user_id, kind, expires_on).
 * Cron chạy lại, Vercel gọi lặp, hay ai đó gọi tay đều không gửi lần hai.
 * Ta CHÈN LOG TRƯỚC rồi mới gửi — thà lỡ một email còn hơn spam khách.
 *
 * Biến môi trường: CRON_SECRET, SMTP_* (xem lib/mailer.ts), NEXT_PUBLIC_SITE_URL.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MOC_NHAC: { days: number; kind: string }[] = [
  { days: 7, kind: 'renewal_7d' },
  { days: 1, kind: 'renewal_1d' },
];

type DueRow = {
  user_id: string;
  email: string;
  full_name: string | null;
  tier: string;
  expires_on: string;   // 'YYYY-MM-DD'
  expires_at: string;
};

function ddmmyyyy(isoDate: string) {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

export async function GET(req: NextRequest) {
  // ── 1. Chỉ Vercel Cron (hoặc người có secret) được gọi.
  //    Vercel gửi header `Authorization: Bearer <CRON_SECRET>`.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET chua duoc dat' }, { status: 500 });
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminSupabase();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://writeright.unicoach.vn';
  const pricingUrl = `${siteUrl}/pricing`;

  // `dryRun=1` để thử: tìm người cần nhắc nhưng KHÔNG gửi, KHÔNG ghi log.
  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';

  const ketQua: Record<string, unknown>[] = [];
  let daGui = 0, boQua = 0, loi = 0;

  for (const moc of MOC_NHAC) {
    const { data, error } = await admin.rpc('users_due_for_renewal', {
      days_ahead: moc.days,
    });

    if (error) {
      loi++;
      ketQua.push({ moc: moc.kind, error: error.message });
      continue;
    }

    const rows = (data ?? []) as DueRow[];

    for (const r of rows) {
      const input: RenewalEmailInput = {
        fullName: r.full_name,
        tier: r.tier,
        expiresOn: ddmmyyyy(r.expires_on),
        daysLeft: moc.days,
        pricingUrl,
      };

      if (dryRun) {
        ketQua.push({ moc: moc.kind, to: r.email, subject: renewalSubject(input), dryRun: true });
        continue;
      }

      // ── 2. Chèn log TRƯỚC khi gửi.
      //    UNIQUE(user_id, kind, expires_on) sẽ chặn nếu đã gửi rồi.
      //    Thứ tự này cố ý: nếu tiến trình chết giữa chừng thì khách mất
      //    một email — chấp nhận được. Nếu làm ngược lại, một lần cron
      //    lỗi có thể gửi hai ba email cho cùng một người.
      const { error: logErr } = await admin.from('email_log').insert({
        user_id: r.user_id,
        kind: moc.kind,
        expires_on: r.expires_on,
        email_to: r.email,
      });

      if (logErr) {
        // 23505 = unique_violation → đã gửi rồi, bỏ qua trong im lặng.
        if (logErr.code === '23505') { boQua++; continue; }
        loi++;
        ketQua.push({ moc: moc.kind, to: r.email, error: logErr.message });
        continue;
      }

      // ── 3. Gửi.
      try {
        await sendMail({
          to: r.email,
          subject: renewalSubject(input),
          html: renewalHtml(input),
          text: renewalText(input),
        });
        daGui++;
        ketQua.push({ moc: moc.kind, to: r.email, ok: true });
      } catch (e: any) {
        // Gửi hỏng → xoá log để lần chạy sau thử lại.
        await admin.from('email_log').delete()
          .eq('user_id', r.user_id).eq('kind', moc.kind).eq('expires_on', r.expires_on);
        loi++;
        ketQua.push({ moc: moc.kind, to: r.email, error: e?.message ?? String(e) });
      }
    }
  }

  console.log(`cron/renewal-reminders: gui=${daGui} bo_qua=${boQua} loi=${loi}`);

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    dryRun,
    daGui,
    boQua,   // đã gửi từ trước
    loi,
    chiTiet: ketQua,
  });
}
