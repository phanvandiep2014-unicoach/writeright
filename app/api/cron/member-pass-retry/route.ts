import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { CYCLE_DAYS, grantLmsPass, isMemberPlan } from '@/lib/membership';

/**
 * Cron hằng ngày: thử lại việc mở Pass tự học LMS cho đơn hội viên Scholar / Laureate đã trả tiền
 * nhưng lúc webhook gọi LMS bị lỗi (orders.pass_granted_at còn NULL). LMS chống trùng theo `ref`.
 * Chỉ xét đơn trả tiền trong 30 ngày qua để không mở Pass cho đơn quá cũ.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET chua duoc dat' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const admin = createAdminSupabase();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows, error } = await admin.from('orders')
    .select('id, order_code, user_id, member_plan, billing_cycle')
    .eq('status', 'paid').not('member_plan', 'is', null).is('pass_granted_at', null)
    .gte('paid_at', since).limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let granted = 0;
  for (const o of rows ?? []) {
    if (!isMemberPlan(o.member_plan)) continue;
    const { data: who } = await admin.from('profiles').select('email').eq('id', o.user_id).maybeSingle();
    const ok = await grantLmsPass({
      email: (who as any)?.email || '', plan: o.member_plan,
      days: CYCLE_DAYS[o.billing_cycle as string] ?? 30, ref: `wr-${o.order_code ?? o.id}`,
    });
    if (ok) {
      granted++;
      await admin.from('orders').update({ pass_granted_at: new Date().toISOString() }).eq('id', o.id);
    }
  }
  return NextResponse.json({ checked: rows?.length ?? 0, granted });
}
