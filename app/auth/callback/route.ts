import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const oauthError = searchParams.get('error');
  const oauthErrorDescription = searchParams.get('error_description');

  // Surface OAuth provider errors (Google denied consent, etc.)
  if (oauthError) {
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('error', 'oauth_provider');
    loginUrl.searchParams.set('msg', `${oauthError}: ${oauthErrorDescription || ''}`.slice(0, 300));
    return NextResponse.redirect(loginUrl);
  }

  if (!code) {
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('error', 'no_code');
    loginUrl.searchParams.set('msg', 'No code present in callback URL');
    return NextResponse.redirect(loginUrl);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete(name);
        },
      },
    }
  );

  const { error, data } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed:', {
      message: error.message,
      status: (error as any).status,
      code: (error as any).code,
      name: error.name,
    });
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('error', 'exchange_failed');
    // Pass through the actual error info so we can debug it from the URL
    loginUrl.searchParams.set('msg', error.message.slice(0, 300));
    loginUrl.searchParams.set('status', String((error as any).status || ''));
    loginUrl.searchParams.set('code', String((error as any).code || ''));
    return NextResponse.redirect(loginUrl);
  }

  if (!data?.session) {
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('error', 'no_session');
    loginUrl.searchParams.set('msg', 'Exchange succeeded but no session returned');
    return NextResponse.redirect(loginUrl);
  }

  // Đo đầu phễu: tài khoản vừa được tạo trong 2 phút qua = lượt đăng ký mới. Lỗi nào cũng bị nuốt.
  try {
    const u = data.session.user;
    if (u?.created_at && Date.now() - Date.parse(u.created_at) < 120_000) {
      let ft: any = {};
      try { ft = JSON.parse(decodeURIComponent(cookieStore.get('wr_ft')?.value || '{}')); } catch { /* cookie hỏng */ }
      const cut = (v: unknown, n: number) => (typeof v === 'string' && v ? v.slice(0, n) : null);
      const { createAdminSupabase } = await import('@/lib/supabase-admin');
      await createAdminSupabase().from('funnel_events').insert({
        anon_id: cut(ft.a, 64), user_id: u.id, event: 'signup', path: '/auth/callback',
        utm_source: cut(ft.s, 60), utm_medium: cut(ft.m, 60), utm_campaign: cut(ft.c, 80),
        utm_content: cut(ft.t, 80), ref_host: cut(ft.r, 80),
      });
    }
  } catch (e) { console.error('[auth/callback] funnel signup bỏ qua:', (e as Error)?.message); }

  // Quay lại nơi khách đang đứng trước khi đăng nhập (cookie do /login đặt).
  const rawNext = cookieStore.get('wr_next')?.value;
  let dest = '/evaluate';
  if (rawNext) {
    try {
      const n = decodeURIComponent(rawNext);
      if (n.startsWith('/') && !n.startsWith('//') && !n.includes('\\')) dest = n;
    } catch { /* cookie hỏng → về /evaluate */ }
  }
  const res = NextResponse.redirect(`${origin}${dest}`);
  res.cookies.set('wr_next', '', { path: '/', maxAge: 0 });
  return res;
}
