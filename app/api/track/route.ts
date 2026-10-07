import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { createAdminSupabase } from '@/lib/supabase-admin';

// Chi nhan cac su kien nay; moi gia tri khac bi bo (khong ghi, khong bao loi).
const EVENTS = new Set(['page_view', 'evaluate_submit', 'auth_required', 'evaluate_done']);
const PATHS = new Set(['/', '/evaluate', '/login', '/pricing', '/mock']);

const cut = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null);

export async function POST(req: NextRequest) {
  try {
    const b = await req.json().catch(() => null);
    if (!b || typeof b !== 'object') return new NextResponse(null, { status: 204 });
    const event = cut(b.event, 40);
    const path = cut(b.path, 60);
    const anon = cut(b.anon_id, 64);
    if (!event || !EVENTS.has(event) || !anon) return new NextResponse(null, { status: 204 });
    if (path && !PATHS.has(path)) return new NextResponse(null, { status: 204 });

    let user_id: string | null = null;
    try {
      const sb = await createServerSupabase();
      const { data: { user } } = await sb.auth.getUser();
      user_id = user?.id ?? null;
    } catch { /* khach an danh */ }

    await createAdminSupabase().from('funnel_events').insert({
      anon_id: anon, user_id, event, path,
      utm_source: cut(b.utm_source, 60), utm_medium: cut(b.utm_medium, 60),
      utm_campaign: cut(b.utm_campaign, 80), utm_content: cut(b.utm_content, 80),
      ref_host: cut(b.ref_host, 80),
    });
  } catch (e) {
    console.error('[track] bo qua loi:', (e as Error)?.message);
  }
  return new NextResponse(null, { status: 204 });
}
