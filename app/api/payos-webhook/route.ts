import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { verifyWebhookSignature } from '@/lib/payos';
import { paymentPatch } from '@/lib/activation';

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
    .select('id, user_id, tier, status, billing_cycle, speak_plan')
    .eq('order_code', data.orderCode)
    .single();

  // Thiếu BẤT KỲ cột mở rộng nào (billing_cycle, speak_plan...) thì đọc lại bộ cột gốc.
  // 23/09→04/10/2026: orders.speak_plan chưa có trên production, lỗi select bị coi là
  // "không tìm thấy đơn" → khách trả tiền xong KHÔNG được nâng gói, PayOS vẫn nhận 200.
  if (findErr && /column|billing_cycle|speak_plan|plan_code/i.test(findErr.message)) {
    console.error('payos-webhook: thieu cot tren orders — doc lai bo cot goc:', findErr.message);
    ({ data: order, error: findErr } = await admin
      .from('orders')
      .select('id, user_id, tier, status')
      .eq('order_code', data.orderCode)
      .single());
  }

  if (findErr || !order) {
    console.error('PayOS webhook: order not found for orderCode', data.orderCode, findErr?.message ?? '');
    // Lỗi CSDL (khác "không có dòng") → trả 500 để PayOS gửi lại, đừng nuốt tiền của khách.
    if (findErr && findErr.code !== 'PGRST116') {
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
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

  // ── 4a. Phần NÓI (Precisely / Duo) — trục quyền riêng, hạn riêng.
  //    Chạy TRƯỚC phần viết vì đơn chỉ mua Precisely có tier = NULL và
  //    thoát sớm ở dưới.
  const speakPlan = (order as any).speak_plan as 'speak' | 'speak_plus' | null | undefined;
  if (speakPlan) {
    const { data: sp } = await admin
      .from('profiles')
      .select('speak_expires_at')
      .eq('id', order.user_id)
      .maybeSingle();
    const spExp = (sp as any)?.speak_expires_at ? new Date((sp as any).speak_expires_at) : null;
    const spBase = spExp && spExp > now ? spExp : now;
    const speakExpiresAt = new Date(spBase.getTime() + days * 24 * 60 * 60 * 1000);
    const { error: speakErr } = await admin
      .from('profiles')
      .update({ speak_plan: speakPlan, speak_expires_at: speakExpiresAt.toISOString(), updated_at: now.toISOString() })
      .eq('id', order.user_id);
    if (speakErr) {
      // 500 để PayOS gửi lại — đơn đã 'paid' nên lần sau sẽ dừng ở bước 2.
      // Vì vậy phải trả đơn về 'pending' trước, không thì khách mất quyền nói.
      console.error('PayOS webhook: KHONG cap duoc quyen noi:', speakErr.message);
      await admin.from('orders').update({ status: 'pending', paid_at: null }).eq('id', order.id);
      return NextResponse.json({ error: 'Failed to grant speaking plan' }, { status: 500 });
    }
    console.log(`payos-webhook: ${order.user_id} -> speak ${speakPlan} (het han ${speakExpiresAt.toISOString()})`);
  }

  // Đơn chỉ mua Precisely: không đụng quyền viết.
  if (!order.tier) {
    return NextResponse.json({ success: true });
  }

  // ── 5. Nâng tier + đặt hạn. Hạn tính từ BÀI CHẤM ĐẦU TIÊN (lib/activation.ts):
  //    mua mới → hạn tạm = hôm nay + 14 + N ngày, ghi tier_pending_days = N; bài chấm đầu
  //    tiên trong /api/evaluate sẽ chốt lại hạn = lúc chấm + N. Gia hạn khi còn hạn thì
  //    vẫn cộng dồn như cũ.
  //    Cột tier_pending_days chỉ có sau khi chạy sql/khoa-cot-va-han-dung.sql — chưa có
  //    thì quay về cách cũ (tính từ hôm nay). Cột tier_expires_at chưa có (chưa chạy
  //    sql/annual-billing.sql) thì vẫn nâng tier: thà cấp quyền không hạn còn hơn để
  //    khách trả tiền rồi mà không được gì.
  const patch = { tier: order.tier, updated_at: now.toISOString() };
  let expiresAt: string | null = null;
  let updateProfileErr: { message: string } | null = null;

  const { data: cur, error: curErr } = await admin
    .from('profiles')
    .select('tier_expires_at, tier_pending_days')
    .eq('id', order.user_id)
    .maybeSingle();

  if (!curErr) {
    const p = paymentPatch(cur as any, days, now.getTime());
    expiresAt = p.tier_expires_at;
    ({ error: updateProfileErr } = await admin.from('profiles').update({ ...patch, ...p }).eq('id', order.user_id));
  }

  if (curErr || (updateProfileErr && /tier_pending_days|tier_activated_at/i.test(updateProfileErr.message))) {
    console.warn('payos-webhook: chua co cot tier_pending_days — chay sql/khoa-cot-va-han-dung.sql. Tinh han tu hom nay.');
    const { data: old } = await admin.from('profiles').select('tier_expires_at').eq('id', order.user_id).maybeSingle();
    const oldExp = (old as any)?.tier_expires_at ? new Date((old as any).tier_expires_at) : null;
    const base = oldExp && oldExp > now ? oldExp : now;
    expiresAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    ({ error: updateProfileErr } = await admin.from('profiles').update({ ...patch, tier_expires_at: expiresAt }).eq('id', order.user_id));
  }

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
    `payos-webhook: ${order.user_id} -> ${order.tier} (+${days} ngay, het han tam ${expiresAt})`
  );

  return NextResponse.json({ success: true });
}

// PayOS verifies the webhook URL with a GET request when you register it.
export async function GET() {
  return NextResponse.json({ success: true });
}
