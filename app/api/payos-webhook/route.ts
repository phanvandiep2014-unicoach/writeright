import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { verifyWebhookSignature } from '@/lib/payos';

/**
 * PayOS webhook receiver.
 *
 * PayOS sends: { code, desc, success, data: {...}, signature }
 * `signature` is HMAC-SHA256 over the sorted key=value pairs of `data`.
 *
 * Register this URL in PayOS dashboard → Kênh thanh toán → Webhook URL:
 *   https://writeright-w5r9.vercel.app/api/payos-webhook
 *
 * IMPORTANT: this route has no user session — it must use the admin
 * (service role) Supabase client to write to `orders` / `profiles`.
 */
export async function POST(req: NextRequest) {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // PayOS sends a fixed sample payload (description "VQRIO123",
  // orderCode 123, paymentLinkId "124c332...") when you register or
  // re-save the webhook URL in the dashboard. It's signed with PayOS's
  // own sample checksum key, not ours, so it will never pass
  // verifyWebhookSignature — acknowledge it before attempting to verify.
  if (payload?.data?.description === 'VQRIO123') {
    return NextResponse.json({ success: true });
  }

  // PayOS sends a test ping when you register the webhook URL in the
  // dashboard. It has no real `data.orderCode` — just acknowledge it.
  if (!payload?.data?.orderCode) {
    return NextResponse.json({ success: true });
  }

  const { data, signature } = payload;

  if (!verifyWebhookSignature(data, signature)) {
    console.error('PayOS webhook: signature verification failed for orderCode', data.orderCode);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // PayOS data.code === '00' means the transaction succeeded.
  const isPaid = data.code === '00';
  if (!isPaid) {
    // Not a success event (e.g. cancelled) — nothing to upgrade.
    return NextResponse.json({ success: true });
  }

  const admin = createAdminSupabase();

  // ── 1. Look up the order by orderCode.
  //    `billing_cycle` chỉ có sau khi chạy sql/annual-billing.sql — nếu
  //    cột chưa tồn tại thì Supabase trả lỗi, ta select lại bộ cột cũ.
  let { data: order, error: findErr } = await admin
    .from('orders')
    .select('id, user_id, tier, status, billing_cycle')
    .eq('order_code', data.orderCode)
    .single();

  if (findErr && /billing_cycle/i.test(findErr.message)) {
    console.warn('payos-webhook: cot orders.billing_cycle chua ton tai — chay sql/annual-billing.sql');
    ({ data: order, error: findErr } = await admin
      .from('orders')
      .select('id, user_id, tier, status')
      .eq('order_code', data.orderCode)
      .single());
  }

  if (findErr || !order) {
    console.error('PayOS webhook: order not found for orderCode', data.orderCode);
    // Return 200 anyway — PayOS retries on non-2xx, and a missing order
    // on our side isn't something a retry will fix.
    return NextResponse.json({ success: true });
  }

  // ── 2. Idempotency: if we've already marked this order paid, stop here.
  //    PayOS may send the same webhook more than once.
  if (order.status === 'paid') {
    return NextResponse.json({ success: true });
  }

  // ── 3. Mark the order paid.
  const { error: updateOrderErr } = await admin
    .from('orders')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', order.id);

  if (updateOrderErr) {
    console.error('PayOS webhook: failed to update order status:', updateOrderErr.message);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }

  // ── 4. Tính ngày hết hạn mới.
  //    Gói tháng cộng 30 ngày, gói năm cộng 365 ngày. Nếu người dùng gia
  //    hạn khi quyền còn hiệu lực thì CỘNG DỒN từ ngày hết hạn cũ chứ
  //    không tính lại từ hôm nay — trả tiền sớm không được phạt.
  const now = new Date();
  const days = (order as any).billing_cycle === 'yearly' ? 365 : 30;

  const { data: current } = await admin
    .from('profiles')
    .select('tier_expires_at')
    .eq('id', order.user_id)
    .maybeSingle();

  const currentExpiry = (current as any)?.tier_expires_at
    ? new Date((current as any).tier_expires_at)
    : null;
  const base = currentExpiry && currentExpiry > now ? currentExpiry : now;
  const expiresAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

  // ── 5. Upgrade the user's profile tier.
  //    `tier_expires_at` chỉ có sau khi chạy sql/annual-billing.sql. Nếu
  //    chưa có cột, vẫn phải nâng tier — thà cấp quyền không hạn còn hơn
  //    để khách trả tiền rồi mà không được gì.
  const patch = { tier: order.tier, updated_at: now.toISOString() };

  let { error: updateProfileErr } = await admin
    .from('profiles')
    .update({ ...patch, tier_expires_at: expiresAt.toISOString() })
    .eq('id', order.user_id);

  if (updateProfileErr && /tier_expires_at/i.test(updateProfileErr.message)) {
    console.warn(
      'payos-webhook: cot profiles.tier_expires_at chua ton tai — chay sql/annual-billing.sql. ' +
      'Da nang tier nhung KHONG dat duoc han dung.'
    );
    ({ error: updateProfileErr } = await admin
      .from('profiles')
      .update(patch)
      .eq('id', order.user_id));
  }

  if (updateProfileErr) {
    console.error('PayOS webhook: failed to upgrade profile tier:', updateProfileErr.message);
    return NextResponse.json({ error: 'Failed to upgrade tier' }, { status: 500 });
  }

  console.log(
    `payos-webhook: ${order.user_id} -> ${order.tier} (+${days} ngay, het han ${expiresAt.toISOString()})`
  );

  return NextResponse.json({ success: true });
}

// PayOS verifies the webhook URL with a GET request when you register it.
export async function GET() {
  return NextResponse.json({ success: true });
}
