/**
 * POST /api/sso-logout — xóa phiên đăng nhập chung của UNICOACH (cookie uc_sid + dấu hiệu uc_in
 * ở Domain=.unicoach.vn do LMS đặt). Cùng Domain nên subdomain này xóa được, kể cả cookie httpOnly.
 * Gọi sau supabase.auth.signOut() để người dùng thoát luôn LMS/Precisely và không bị tự đăng nhập lại.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const host = new URL(request.url).hostname;
  const domain = host === 'unicoach.vn' || host.endsWith('.unicoach.vn') ? '.unicoach.vn' : undefined;
  const res = NextResponse.json({ ok: true });
  for (const [name, httpOnly] of [['uc_sid', true], ['uc_in', false]] as const) {
    res.cookies.set(name, '', { domain, path: '/', maxAge: 0, httpOnly, secure: true, sameSite: 'lax' });
  }
  return res;
}
