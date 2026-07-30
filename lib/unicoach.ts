/**
 * Nối WriteRight ↔ UNICOACH LMS.
 *
 * Hai chiều:
 *   ① LMS phát token SSO (JWT HS256, hết hạn 5 phút) → route /sso xác thực bằng verifyLmsToken()
 *   ② Chấm xong → pushResultToLms() gọi POST {LMS}/api/v1/results kèm X-API-Key
 *
 * Cố ý KHÔNG dùng thư viện jwt: chỉ cần verify HS256 nên tự viết bằng node:crypto,
 * tránh thêm dependency và tránh rủi ro lockfile khi build trên Vercel.
 */
import crypto from 'node:crypto';

export type LmsSsoPayload = {
  iss: string; aud: string;
  sub: string;                 // mã học viên phía LMS, vd "HV001"
  lms_student_id?: number;
  name?: string; email?: string; skill?: string;
  iat?: number; exp?: number;
};

const b64url = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

/**
 * Xác thực token SSO do LMS phát. Ném lỗi (tiếng Việt) nếu không hợp lệ.
 * Kiểm đủ: định dạng, thuật toán, chữ ký (so sánh timing-safe), hạn dùng, iss, aud.
 */
export function verifyLmsToken(token: string, secret: string): LmsSsoPayload {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('Token không đúng định dạng.');
  const [h, p, sig] = parts;

  let header: any;
  try { header = JSON.parse(b64url(h).toString('utf8')); }
  catch { throw new Error('Token không đọc được.'); }

  // Chặn alg=none và mọi thuật toán khác — nếu không, ai cũng ký được token giả.
  if (header?.alg !== 'HS256') throw new Error('Thuật toán ký không được chấp nhận.');

  const expected = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest();
  const got = b64url(sig);
  if (expected.length !== got.length || !crypto.timingSafeEqual(expected, got))
    throw new Error('Chữ ký token không hợp lệ.');

  let payload: LmsSsoPayload;
  try { payload = JSON.parse(b64url(p).toString('utf8')); }
  catch { throw new Error('Nội dung token không đọc được.'); }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && now > payload.exp) throw new Error('Token đã hết hạn. Hãy bấm mở lại từ LMS.');
  if (payload.iss !== 'unicoach-lms') throw new Error('Token không do UNICOACH LMS phát hành.');
  if (payload.aud !== 'writeright') throw new Error('Token không dành cho WriteRight.');
  if (!payload.sub) throw new Error('Token thiếu mã học viên.');
  return payload;
}

/** Email dùng cho tài khoản Supabase của học viên đến từ LMS. */
export function lmsEmailFor(payload: LmsSsoPayload): string {
  const real = String(payload.email || '').trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(real)) return real;
  // Học viên chưa có email (hoặc LMS chỉ lưu email phụ huynh) → email nội bộ ổn định theo mã HV
  return `${String(payload.sub).toLowerCase()}@lms.unicoach.vn`;
}

type PushArgs = {
  studentCode: string;
  externalId: string;      // id bản ghi evaluations — dùng để chống trùng
  band: number | null;
  title?: string;
  feedback?: string;
  detail?: Record<string, unknown>;
};

/**
 * Đẩy điểm về LMS. KHÔNG bao giờ ném lỗi ra ngoài: chấm bài phải chạy được
 * kể cả khi LMS sập hoặc chưa cấu hình. Trả về true nếu đẩy thành công.
 */
export async function pushResultToLms(a: PushArgs): Promise<boolean> {
  const base = (process.env.UNICOACH_LMS_URL || '').replace(/\/+$/, '');
  const apiKey = process.env.UNICOACH_API_KEY;
  if (!base || !apiKey || !a.studentCode || a.band == null) return false;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);   // đừng để học viên chờ vì LMS chậm
    const res = await fetch(`${base}/api/v1/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({
        app: 'writeright', student_code: a.studentCode, external_id: a.externalId,
        skill: 'writing', band: a.band, title: a.title, feedback: a.feedback, detail: a.detail,
        submitted_at: new Date().toISOString().slice(0, 10),
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) { console.error('[unicoach] đẩy điểm thất bại:', res.status, (await res.text()).slice(0, 200)); return false; }
    return true;
  } catch (e: any) {
    console.error('[unicoach] đẩy điểm lỗi:', e?.message);
    return false;
  }
}
