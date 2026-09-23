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
type SpeakPlan = 'speak' | 'speak_plus';
type Plan = {
  amount: number;
  label: string;
  /** Quyền viết. NULL = đơn không đổi quyền WriteRight (mua riêng Precisely). */
  tier: 'standard' | 'premium' | null;
  /** Quyền nói (Precisely). NULL = đơn không chứa phần nói. */
  speak: SpeakPlan | null;
  cycle: 'monthly' | 'yearly';
};

/**
 * BẢNG GIÁ DUY NHẤT của cả WriteRight lẫn Precisely — đổi giá ở đây.
 * Chiến lược: UNICOACH LMS/KE-HOACH-VAN-HANH-PRECISELY.md (23/09/2026).
 * Số phút nói của từng gói nằm ở gotcha-web/api/_lib/quota-rules.js.
 */
const PLANS: Record<string, Plan> = {
  standard:        { amount: 90000,   label: 'WriteRight Standard', tier: 'standard', speak: null,         cycle: 'monthly' },
  premium:         { amount: 150000,  label: 'WriteRight Premium',  tier: 'premium',  speak: null,         cycle: 'monthly' },
  premium_yearly:  { amount: 790000,  label: 'WriteRight nam',      tier: 'premium',  speak: null,         cycle: 'yearly'  },
  precisely_speak: { amount: 129000,  label: 'Precisely Speak',     tier: null,       speak: 'speak',      cycle: 'monthly' },
  precisely_plus:  { amount: 219000,  label: 'Precisely Speak Plus',tier: null,       speak: 'speak_plus', cycle: 'monthly' },
  duo:             { amount: 169000,  label: 'UNICOACH Duo',        tier: 'standard', speak: 'speak',      cycle: 'monthly' },
  duo_pro:         { amount: 269000,  label: 'UNICOACH Duo Pro',    tier: 'premium',  speak: 'speak_plus', cycle: 'monthly' },
  duo_yearly:      { amount: 1590000, label: 'UNICOACH Duo nam',    tier: 'standard', speak: 'speak',      cycle: 'yearly'  },
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
  const buyerEmail = user.email ?? undefined;
  // Mua riêng Precisely thì trả khách về Precisely, không bắt đi vòng qua dashboard viết.
  const preciselyUrl = process.env.PRECISELY_URL || 'https://precisely.unicoach.vn';
  const returnUrl = plan.speak && !plan.tier
    ? `${preciselyUrl}/try?upgraded=1`
    : `${siteUrl}/dashboard?upgraded=1`;

  const baseRow = {
    user_id: user.id,
    order_code: orderCode,
    tier: plan.tier,
    amount: plan.amount,
    status: 'pending',
  };

  // Đơn có phần nói (Precisely / Duo) cần cột orders.speak_plan + plan_code từ
  // sql/precisely-duo.sql. Thiếu cột thì TỪ CHỐI bán: webhook sẽ không biết cấp
  // phút nói, khách trả tiền mà không nhận được gì.
  if (plan.speak) {
    const { error: speakErr } = await admin
      .from('orders')
      .insert({ ...baseRow, billing_cycle: plan.cycle, plan_code: planId, speak_plan: plan.speak });
    if (speakErr) {
      console.error('checkout: khong tao duoc don co phan noi (da chay sql/precisely-duo.sql chua?):', speakErr.message);
      return NextResponse.json(
        { error: 'Gói có phần luyện nói tạm thời chưa mở. Vui lòng thử lại sau ít phút hoặc nhắn cho chúng tôi.' },
        { status: 503 }
      );
    }
    return await payLink();
  }

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

  return await payLink();

  async function payLink() {
    // ── 4. Create the PayOS payment link.
    try {
      const link = await createPaymentLink({
        orderCode,
        amount: plan.amount,
        // PayOS giới hạn description 25 ký tự và không ưa dấu tiếng Việt.
        description: plan.label.slice(0, 25),
        returnUrl,
        cancelUrl: `${siteUrl}/pricing?cancelled=1`,
        buyerEmail,
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
}
