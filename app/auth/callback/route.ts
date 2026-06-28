import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const cookieStore = cookies();
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

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      // Don't silently pretend this worked — send the user back to login
      // with a reason so failures are visible instead of looking like a
      // random "kicked back to login" bug later on.
      console.error('[auth/callback] exchangeCodeForSession failed:', error.message);
      const loginUrl = new URL('/login', origin);
      loginUrl.searchParams.set('error', 'auth_callback_failed');
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.redirect(`${origin}/evaluate`);
}
