import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { verifyUnsubscribeToken } from '@/lib/unsubscribe';

export const dynamic = 'force-dynamic';

const page = (title: string, msg: string, status = 200) =>
  new NextResponse(
    `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>` +
    `<body style="margin:0;background:#11183A;color:#F4ECD8;font-family:Georgia,serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;text-align:center">` +
    `<div><h1 style="color:#E7CE8E;font-size:22px">${title}</h1><p>${msg}</p><p><a style="color:#C8A14B" href="/">Về WriteRight</a></p></div></body></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8' } },
  );

/** Huỷ nhận email nhắc luyện tập. Token HMAC nên chỉ link trong email của chính người đó mới có hiệu lực. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const u = req.nextUrl.searchParams.get('u') ?? '';
  const t = req.nextUrl.searchParams.get('t') ?? '';
  if (!secret || !/^[0-9a-f-]{36}$/i.test(u) || !verifyUnsubscribeToken(u, t, secret)) {
    return page('Liên kết không hợp lệ', 'Liên kết huỷ đăng ký không đúng hoặc đã hết hạn.', 400);
  }
  const { error } = await createAdminSupabase().from('email_prefs')
    .upsert({ user_id: u, practice_reminders: false, updated_at: new Date().toISOString() });
  if (error) return page('Chưa thực hiện được', 'Có lỗi xảy ra, vui lòng thử lại sau.', 500);
  return page('Đã huỷ nhận email nhắc luyện tập', 'Bạn sẽ không nhận email nhắc luyện tập từ WriteRight nữa.');
}
