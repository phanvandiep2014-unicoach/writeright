/**
 * Xác thực lệnh gọi máy-chủ-tới-máy-chủ từ UNICOACH LMS (bài thi thử 4 kỹ năng).
 * Chữ ký: hex HMAC-SHA256(UNICOACH_SSO_SECRET, `${timestamp}.${rawBody}`), gửi kèm
 * hai header `x-unicoach-timestamp` (giây) và `x-unicoach-signature`.
 * Ký cả thân request nên không ai đổi được bài viết hay mã đề trên đường đi;
 * timestamp chặn phát lại quá 10 phút. Cùng khóa với SSO — không thêm bí mật mới.
 */
import crypto from 'node:crypto';

export function verifyLmsRequest(req: Request, rawBody: string): string | null {
  const secret = process.env.UNICOACH_SSO_SECRET;
  if (!secret) return 'WriteRight chưa cấu hình UNICOACH_SSO_SECRET.';
  const ts = Number(req.headers.get('x-unicoach-timestamp'));
  const sig = String(req.headers.get('x-unicoach-signature') || '');
  if (!ts || Math.abs(Date.now() / 1000 - ts) > 600) return 'Yêu cầu quá hạn hoặc thiếu timestamp.';
  const expect = crypto.createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest('hex');
  const a = Buffer.from(expect), b = Buffer.from(sig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return 'Chữ ký không hợp lệ.';
  return null;
}
