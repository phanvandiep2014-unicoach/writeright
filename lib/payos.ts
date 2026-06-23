import crypto from 'crypto';

/**
 * Minimal PayOS REST client — no SDK dependency, just fetch + HMAC-SHA256
 * checksum, per PayOS's official signing spec:
 * https://payos.vn/docs/du-lieu-tra-ve/chu-ky-du-lieu/
 *
 * Why not @payos/node: keeps the bundle small and avoids pinning to an
 * SDK version; the checkout + webhook surface we need is tiny.
 */

const PAYOS_BASE_URL = 'https://api-merchant.payos.vn';

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set in environment variables`);
  return v;
}

/**
 * PayOS requires the checksum to be computed over a specific, alphabetically
 * sorted subset of fields, joined as key=value&key=value, signed with
 * HMAC-SHA256 using the Checksum Key.
 */
function signPaymentRequest(data: {
  amount: number;
  cancelUrl: string;
  description: string;
  orderCode: number;
  returnUrl: string;
}): string {
  const checksumKey = getEnv('PAYOS_CHECKSUM_KEY');
  const raw = `amount=${data.amount}&cancelUrl=${data.cancelUrl}&description=${data.description}&orderCode=${data.orderCode}&returnUrl=${data.returnUrl}`;
  return crypto.createHmac('sha256', checksumKey).update(raw).digest('hex');
}

export interface CreatePaymentLinkParams {
  orderCode: number;
  amount: number; // VND, integer, no decimals
  description: string; // max 25 chars per PayOS
  returnUrl: string;
  cancelUrl: string;
  buyerName?: string;
  buyerEmail?: string;
}

export interface CreatePaymentLinkResult {
  checkoutUrl: string;
  paymentLinkId: string;
  qrCode: string;
}

export async function createPaymentLink(
  params: CreatePaymentLinkParams
): Promise<CreatePaymentLinkResult> {
  const clientId = getEnv('PAYOS_CLIENT_ID');
  const apiKey = getEnv('PAYOS_API_KEY');

  const signature = signPaymentRequest({
    amount: params.amount,
    cancelUrl: params.cancelUrl,
    description: params.description,
    orderCode: params.orderCode,
    returnUrl: params.returnUrl,
  });

  const res = await fetch(`${PAYOS_BASE_URL}/v2/payment-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': clientId,
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      orderCode: params.orderCode,
      amount: params.amount,
      description: params.description,
      returnUrl: params.returnUrl,
      cancelUrl: params.cancelUrl,
      buyerName: params.buyerName,
      buyerEmail: params.buyerEmail,
      signature,
    }),
  });

  const text = await res.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`PayOS returned non-JSON response (${res.status}): ${text}`);
  }

  if (!res.ok || body.code !== '00') {
    throw new Error(`PayOS error (${res.status}): ${body.desc || text}`);
  }

  return {
    checkoutUrl: body.data.checkoutUrl,
    paymentLinkId: body.data.paymentLinkId,
    qrCode: body.data.qrCode,
  };
}

/**
 * Verifies the `signature` field PayOS sends in webhook payloads.
 * PayOS signs the `data` object the same way as the request: sorted
 * key=value pairs of the data object's own fields, HMAC-SHA256.
 */
export function verifyWebhookSignature(data: Record<string, any>, signature: string): boolean {
  const checksumKey = getEnv('PAYOS_CHECKSUM_KEY');

  const sortedKeys = Object.keys(data).sort();
  const raw = sortedKeys
    .map((key) => `${key}=${data[key] === null || data[key] === undefined ? '' : data[key]}`)
    .join('&');

  const expected = crypto.createHmac('sha256', checksumKey).update(raw).digest('hex');

  // Constant-time comparison to avoid timing attacks.
  const a = Buffer.from(expected);
  const b = Buffer.from(signature || '');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Maps a PayOS orderCode back to the (tier, userId) it was created for. */
export function encodeOrderCode(): number {
  // PayOS orderCode must be a unique positive integer (max safe int).
  // We don't encode tier/user in it directly — that mapping lives in
  // the `orders` table — but we do need it monotonic-ish and unique.
  return Math.floor(Date.now() / 1000) * 1000 + Math.floor(Math.random() * 1000);
}
