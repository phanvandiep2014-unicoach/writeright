import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { createAdminSupabase } from '@/lib/supabase-admin';

/**
 * Danh sách cảnh báo sớm cho trang /admin/retention - CHỈ admin.
 * Bốn nhóm: sắp hết hạn (≤7 ngày) · đã hết hạn ≤30 ngày chưa gia hạn · trả tiền chưa chấm bài ·
 * bấm thanh toán nhưng đơn treo "pending" (≤14 ngày, chưa có đơn paid nào sau đó).
 * Học viên đang học (enrolled_override) và tài khoản admin/giáo viên bị loại.
 */
export const dynamic = 'force-dynamic';
const DAY = 86_400_000;

export async function GET() {
  const sb = await createServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  const admin = createAdminSupabase();
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'admin') return NextResponse.json({ error: 'Chỉ admin xem được' }, { status: 403 });

  const now = Date.now();
  const iso = (d: number) => new Date(now + d * DAY).toISOString();

  const [profs, orders] = await Promise.all([
    admin.from('profiles')
      .select('id, email, full_name, tier, tier_expires_at, tier_pending_days, tier_activated_at, enrolled_override, role')
      .or(`tier_expires_at.gte.${iso(-30)},tier_pending_days.not.is.null`),
    admin.from('orders').select('user_id, status, amount, created_at, paid_at, plan_code, tier')
      .gte('created_at', iso(-45)).order('created_at', { ascending: true }),
  ]);
  if (profs.error || orders.error) {
    return NextResponse.json({ error: (profs.error || orders.error)!.message }, { status: 500 });
  }
  const people = (profs.data ?? []).filter((p) => !p.enrolled_override && p.role !== 'admin' && p.role !== 'teacher');

  // Đơn treo: lấy cả user không nằm trong `people` (khách free bấm mua lần đầu).
  const pendingUsers = new Map<string, { attempts: number; last: string; amount: number; plan: string }>();
  const paidAfter = new Map<string, string>();
  for (const o of orders.data ?? []) {
    if (o.status === 'paid') { paidAfter.set(o.user_id, o.paid_at || o.created_at); continue; }
    if (o.status !== 'pending' || Date.parse(o.created_at) < now - 14 * DAY) continue;
    const cur = pendingUsers.get(o.user_id) ?? { attempts: 0, last: o.created_at, amount: o.amount, plan: o.plan_code || o.tier };
    cur.attempts++; cur.last = o.created_at; cur.amount = o.amount; cur.plan = o.plan_code || o.tier;
    pendingUsers.set(o.user_id, cur);
  }
  Array.from(pendingUsers.entries()).forEach(([uid, p]) => {
    const paid = paidAfter.get(uid);
    if (paid && Date.parse(paid) >= Date.parse(p.last)) pendingUsers.delete(uid);
  });

  const extraIds = Array.from(pendingUsers.keys()).filter((id) => !people.some((p) => p.id === id));
  const extra = extraIds.length
    ? (await admin.from('profiles').select('id, email, full_name, role').in('id', extraIds)).data ?? []
    : [];
  const allIds = [...people.map((p) => p.id), ...extraIds];
  const ev = allIds.length
    ? (await admin.from('evaluations').select('user_id, overall_band, created_at').in('user_id', allIds)
        .order('created_at', { ascending: true })).data ?? []
    : [];
  const stats = new Map<string, { essays: number; last_essay: string | null; last_band: number | null }>();
  for (const r of ev) {
    const s = stats.get(r.user_id) ?? { essays: 0, last_essay: null, last_band: null };
    s.essays++; s.last_essay = r.created_at;
    if (r.overall_band != null) s.last_band = Number(r.overall_band);
    stats.set(r.user_id, s);
  }
  const st = (id: string) => stats.get(id) ?? { essays: 0, last_essay: null, last_band: null };
  const who = (p: { id: string; email: string | null; full_name: string | null }) =>
    ({ id: p.id, email: p.email, name: p.full_name || (p.email ? p.email.split('@')[0] : '—'), ...st(p.id) });

  const exp = (p: { tier_expires_at: string | null }) => (p.tier_expires_at ? Date.parse(p.tier_expires_at) : NaN);

  const expiringSoon = people
    .filter((p) => exp(p) > now && exp(p) <= now + 7 * DAY && !p.tier_pending_days)
    .map((p) => ({ ...who(p), tier: p.tier, expires_at: p.tier_expires_at }))
    .sort((a, b) => Date.parse(a.expires_at!) - Date.parse(b.expires_at!));

  const lapsed = people
    .filter((p) => exp(p) <= now && exp(p) >= now - 30 * DAY)
    .map((p) => ({ ...who(p), tier: p.tier, expires_at: p.tier_expires_at,
      wrote_after_expiry: !!st(p.id).last_essay && Date.parse(st(p.id).last_essay!) > exp(p) }))
    .sort((a, b) => (b.last_essay ? Date.parse(b.last_essay) : 0) - (a.last_essay ? Date.parse(a.last_essay) : 0));

  const paidNotStarted = people
    .filter((p) => p.tier_pending_days && !p.tier_activated_at && st(p.id).essays === 0)
    // Khi chưa kích hoạt, tier_expires_at = ngày tự bắt đầu + số ngày của gói (xem lib/activation.ts).
    .map((p) => ({ ...who(p), tier: p.tier,
      auto_start: p.tier_expires_at ? new Date(exp(p) - Number(p.tier_pending_days) * DAY).toISOString() : null }));

  const byId = new Map<string, { id: string; email: string | null; full_name: string | null; role?: string | null }>();
  for (const p of [...people, ...extra]) byId.set(p.id, p);
  const abandonedCheckouts = Array.from(pendingUsers.entries())
    .filter(([id]) => { const r = byId.get(id)?.role; return r !== 'admin' && r !== 'teacher'; })
    .map(([id, o]) => ({ ...who(byId.get(id) ?? { id, email: null, full_name: null }), attempts: o.attempts, last_attempt: o.last, amount: o.amount, plan: o.plan }))
    .sort((a, b) => Date.parse(b.last_attempt) - Date.parse(a.last_attempt));

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    counts: { expiringSoon: expiringSoon.length, lapsed: lapsed.length, paidNotStarted: paidNotStarted.length, abandonedCheckouts: abandonedCheckouts.length },
    expiringSoon, lapsed, paidNotStarted, abandonedCheckouts,
  });
}
