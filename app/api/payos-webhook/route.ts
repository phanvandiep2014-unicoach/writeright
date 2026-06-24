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

  // Temp debug: log raw payload before any early returns.
  console.log('PayOS webhook raw payload:', JSON.stringify(payload));

  // PayOS sends a test ping when you register the webhook URL in the
  // dashboard. It has no real `data.orderCode` — just acknowledge it.
  if (!payload?.data?.orderCode) {
    return NextResponse.json({ success: true });
  }

  const { data, signature } = payload;

  console.log('PayOS webhook data keys (sorted):', Object.keys(data).sort());
  console.log('PayOS webhook signature received:', signature);

  if (!verifyWebhookSignature(data, signature)) {
    console.log('PayOS webhook: signature verification FAILED');
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
  const { data: order, error: findErr } = await admin
    .from('orders')
    .select('id, user_id, tier, status')
    .eq('order_code', data.orderCode)
    .single();

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

  // ── 4. Upgrade the user's profile tier.
  const { error: updateProfileErr } = await admin
    .from('profiles')
    .update({ tier: order.tier, updated_at: new Date().toISOString() })
    .eq('id', order.user_id);

  if (updateProfileErr) {
    console.error('PayOS webhook: failed to upgrade profile tier:', updateProfileErr.message);
    return NextResponse.json({ error: 'Failed to upgrade tier' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// PayOS verifies the webhook URL with a GET request when you register it.
export async function GET() {
  return NextResponse.json({ success: true });
}
