import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { createPaymentLink, encodeOrderCode } from '@/lib/payos';

const TIER_PRICES: Record<string, { amount: number; label: string }> = {
  standard: { amount: 90000, label: 'WriteRight Standard' },
  premium: { amount: 150000, label: 'WriteRight Premium' },
};

export async function POST(req: NextRequest) {
  // ── 1. Require login — checkout must be tied to a real user.
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Vui lòng đăng nhập để nâng cấp.', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }

  // ── 2. Validate tier.
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const tier = body.tier;
  const plan = TIER_PRICES[tier];
  if (!plan) {
    return NextResponse.json({ error: 'Gói không hợp lệ.' }, { status: 400 });
  }

  // ── 3. Create the order row first (service role — bypasses RLS insert
  //    restriction, which is intentional: only server code may create
  //    orders).
  const orderCode = encodeOrderCode();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const admin = createAdminSupabase();
  const { error: insertErr } = await admin.from('orders').insert({
    user_id: user.id,
    order_code: orderCode,
    tier,
    amount: plan.amount,
    status: 'pending',
  });

  if (insertErr) {
    return NextResponse.json(
      { error: 'Không thể tạo đơn hàng. Vui lòng thử lại.' },
      { status: 500 }
    );
  }

  // ── 4. Create the PayOS payment link.
  try {
    const link = await createPaymentLink({
      orderCode,
      amount: plan.amount,
      description: plan.label.slice(0, 25),
      returnUrl: `${siteUrl}/dashboard?upgraded=1`,
      cancelUrl: `${siteUrl}/pricing?cancelled=1`,
      buyerEmail: user.email ?? undefined,
    });

    // Store the PayOS paymentLinkId for reference/debugging.
    await admin
      .from('orders')
      .update({ payos_payment_link_id: link.paymentLinkId })
      .eq('order_code', orderCode);

    return NextResponse.json({ checkoutUrl: link.checkoutUrl });
  } catch (err: any) {
    // Mark the order as cancelled so it doesn't linger as "pending" forever.
    await admin.from('orders').update({ status: 'cancelled' }).eq('order_code', orderCode);
    return NextResponse.json(
      { error: 'Không thể tạo link thanh toán: ' + err.message },
      { status: 500 }
    );
  }
}
