/**
 * Đổi token_hash (magic link) lấy phiên đăng nhập và đặt cookie.
 * Dùng bởi luồng SSO từ LMS (/sso). Tách riêng khỏi /auth/callback vì
 * callback xử lý mã OAuth của Google, còn đây xử lý magic link.
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const next = searchParams.get('next') || '/evaluate';

  if (!tokenHash) {
    const url = new URL('/login', origin);
    url.searchParams.set('error', 'sso');
    url.searchParams.set('msg', 'Thiếu mã xác nhận phiên.');
    return NextResponse.redirect(url);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }); },
        remove(name: string, options: CookieOptions) { cookieStore.delete(name); },
      },
    }
  );

  const { error } = await supabase.auth.verifyOtp({ type: 'magiclink', token_hash: tokenHash });
  if (error) {
    console.error('[auth/confirm] verifyOtp:', error.message);
    const url = new URL('/login', origin);
    url.searchParams.set('error', 'sso');
    url.searchParams.set('msg', error.message.slice(0, 200));
    return NextResponse.redirect(url);
  }

  // Chỉ cho phép chuyển hướng nội bộ — chặn open redirect
  const dest = next.startsWith('/') && !next.startsWith('//') ? next : '/evaluate';
  return NextResponse.redirect(`${origin}${dest}`);
}
