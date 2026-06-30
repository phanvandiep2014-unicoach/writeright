import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabase } from '@/lib/supabase-server';

const PAYOS_CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY ?? '';

function computePayOSSignature(data: Record<string, unknown>): string {
  const payload = Object.keys(data).sort().map(k => `${k}=${data[k]}`).join('&');
  return crypto.createHmac('sha256', PAYOS_CHECKSUM_KEY).update(payload).digest('hex');
}

export async function POST(req: NextRequest) {
  if (!PAYOS_CHECKSUM_KEY) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { code, data, signature } = body;

  if (code !== '00' || !data || !signature) {
    return NextResponse.json({ message: 'ignored' });
  }

  // Verify HMAC-SHA256 signature (timing-safe comparison)
  const expectedSig = computePayOSSignature(data as Record<string, unknown>);
  try {
    const sigMatch = crypto.timingSafeEqual(
      Buffer.from(signature as string, 'hex'),
      Buffer.from(expectedSig, 'hex')
    );
    if (!sigMatch) throw new Error('mismatch');
  } catch {
    console.warn('PayOS webhook: signature mismatch');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const { orderCode } = data as { orderCode: string; amount: number };
  const supabase = createServerSupabase();

  // Idempotency: skip already-processed orders
  const { data: existing } = await supabase
    .from('subscriptions').select('id').eq('payos_order_id', String(orderCode)).maybeSingle();
  if (existing) return NextResponse.json({ message: 'already processed' });

  // Parse order code format: "STD-<userId>" or "PRM-<userId>"
  const parts = String(orderCode).split('-');
  const planCode = parts[0];
  const userId = parts.slice(1).join('-');
  const plan = planCode === 'STD' ? 'standard' : planCode === 'PRM' ? 'premium' : null;

  if (!plan || !userId) {
    return NextResponse.json({ error: 'Unknown order format' }, { status: 422 });
  }

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 30);

  const { error } = await supabase.from('subscriptions').insert({
    user_id: userId,
    plan,
    status: 'active',
    started_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    payos_order_id: String(orderCode),
  });

  if (error) {
    console.error('PayOS webhook: DB error', error.message);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  console.log(`PayOS: activated ${plan} for user ${userId}`);
  return NextResponse.json({ message: 'ok' });
}
