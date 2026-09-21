import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { createPaymentLink, encodeOrderCode } from '@/lib/payos';

/**
 * Mã gói mà client gửi lên → giá, nhãn, tier ghi vào DB, chu kỳ.
 *
 * `tier` LUÔN phải là một trong 'free' | 'standard' | 'premium' vì
 * profiles.tier có CHECK constraint chỉ nhận ba giá trị đó
 * (xem supabase-schema.sql). Chu kỳ tháng/năm nằm ở `cycle`, KHÔNG
 * nhét vào tier — nhét vào là vỡ constraint và hỏng mọi chỗ so sánh
 * `tier === 'premium'`.
 */
const PLANS: Record<
  string,
  { amount: number; label: string; tier: 'standard' | 'premium'; cycle: 'monthly' | 'yearly' }
> = {
  standard:       { amount: 90000,  label: 'WriteRight Standard', tier: 'standard', cycle: 'monthly' },
  premium:        { amount: 150000, label: 'WriteRight Premium',  tier: 'premium',  cycle: 'monthly' },
  premium_yearly: { amount: 790000, label: 'WriteRight nam',      tier: 'premium',  cycle: 'yearly'  },
};

export async function POST(req: NextRequest) {
  // ── 1. Require login — checkout must be tied to a real user.
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Vui lòng đăng nhập để nâng cấp.', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }

  // ── 2. Validate plan.
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const planId: string = body.tier;
  const plan = PLANS[planId];
  if (!plan) {
    return NextResponse.json({ error: 'Gói không hợp lệ.' }, { status: 400 });
  }

  // ── 3. Create the order row first (service role — bypasses RLS insert
  //    restriction, which is intentional: only server code may create
  //    orders).
  const orderCode = encodeOrderCode();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const admin = createAdminSupabase();

  const baseRow = {
    user_id: user.id,
    order_code: orderCode,
    tier: plan.tier,
    amount: plan.amount,
    status: 'pending',
  };

  // `billing_cycle` chỉ tồn tại sau khi chạy sql/annual-billing.sql.
  // Thử ghi kèm trước; nếu Supabase báo không có cột thì ghi lại không
  // kèm, để việc deploy code không phụ thuộc vào thứ tự chạy migration.
  let insertErr = (await admin.from('orders').insert({ ...baseRow, billing_cycle: plan.cycle })).error;

  if (insertErr && /billing_cycle/i.test(insertErr.message)) {
    // Gói THÁNG vẫn bán được: thiếu cột thì webhook mặc định coi là monthly,
    // đúng bằng hành vi mong muốn.
    if (plan.cycle === 'monthly') {
      console.warn(
        'checkout: cot orders.billing_cycle chua ton tai — chay sql/annual-billing.sql. ' +
        'Van ban duoc goi thang vi webhook mac dinh monthly.'
      );
      insertErr = (await admin.from('orders').insert(baseRow)).error;
    } else {
      // Gói NĂM thì KHÔNG. Thiếu cột nghĩa là webhook sẽ chỉ cộng 30 ngày —
      // khách trả 790.000đ mà nhận đúng một tháng. Thà không bán.
      console.error(
        'checkout: TU CHOI ban goi nam vi cot orders.billing_cycle chua ton tai. ' +
        'Chay sql/annual-billing.sql trong Supabase SQL Editor roi thu lai.'
      );
      return NextResponse.json(
        { error: 'Gói năm tạm thời chưa mở. Vui lòng chọn gói tháng hoặc nhắn cho chúng tôi để được hỗ trợ.' },
        { status: 503 }
      );
    }
  }

  if (insertErr) {
    console.error('checkout: khong tao duoc don hang:', insertErr.message);
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
      // PayOS giới hạn description 25 ký tự và không ưa dấu tiếng Việt.
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
