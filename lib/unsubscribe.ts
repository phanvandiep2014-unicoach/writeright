// Token huỷ đăng ký email: HMAC-SHA256 của user_id, khoá lấy từ CRON_SECRET.
// Không cần bảng token, không đoán được, và mỗi email chỉ huỷ được đúng một người.
import { createHmac, timingSafeEqual } from 'node:crypto';

export function unsubscribeToken(userId: string, secret: string): string {
  return createHmac('sha256', secret).update(`unsub:${userId}`).digest('hex');
}

export function verifyUnsubscribeToken(userId: string, token: string, secret: string): boolean {
  const good = Buffer.from(unsubscribeToken(userId, secret), 'hex');
  let given: Buffer;
  try { given = Buffer.from(token, 'hex'); } catch { return false; }
  return given.length === good.length && timingSafeEqual(given, good);
}

export function unsubscribeUrl(siteUrl: string, userId: string, secret: string): string {
  return `${siteUrl}/api/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId, secret)}`;
}
