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
  /**
   * BMS bật cờ này khi học viên CHƯA dùng lượt chấm Writing miễn phí đầu tiên
   * (server/free-credit.js → freeFlags). BMS không thu phí và không biết giá —
   * nó chỉ giữ trạng thái "đã dùng chưa", còn áp dụng thế nào là việc của WriteRight.
   * `speaking_free` cũng có trong token nhưng dành cho Precisely, ở đây bỏ qua.
   */
  writing_free?: boolean;
  speaking_free?: boolean;
  /**
   * Có giá trị khi đây là chặng Writing trong bài thi thử 4 kỹ năng điều phối
   * bởi `ielts-module` (Listening → Reading → Writing → nghỉ → Speaking).
   * Xem `BAN-GIAO-DOI-TAC.md` phía LMS. Token vẫn cùng khóa, cùng iss/aud,
   * cùng hạn 5 phút — chỉ thêm ba trường này, nên verifyLmsToken() ở trên
   * không cần sửa gì để chấp nhận token thi thử.
   */
  mock_session?: string;
  minutes?: number;
  callback?: string;
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
  // Mặc định trỏ về LMS đang chạy trên Railway; đặt env UNICOACH_LMS_URL để đổi
  // (vd sang https://lms.unicoach.vn khi DNS đã trỏ xong).
  const base = (process.env.UNICOACH_LMS_URL || 'https://unicoach-bms-production.up.railway.app').replace(/\/+$/, '');
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

/**
 * Trả band Writing về một PHIÊN THI THỬ 4 KỸ NĂNG (Listening/Reading/Writing/
 * Speaking điều phối bởi `ielts-module` trong LMS) — khác hẳn pushResultToLms()
 * ở trên, vốn ghi điểm vào bảng theo dõi khóa học bình thường:
 *
 *              pushResultToLms          pushBandToLms
 *   Định danh   studentCode              mock_session (mã phiên thi thử)
 *   Endpoint    /api/v1/results          /api/ielts-callback/results
 *   Xác thực    header X-API-Key         chữ ký HMAC trong body
 *   Idempotent  không quan trọng         BẮT BUỘC — LMS tự chặn ghi đè,
 *                                        gọi lại nhiều lần vẫn an toàn
 *
 * Xem `BAN-GIAO-DOI-TAC.md` phía LMS, mục 3. KHÔNG đổi cách tính chữ ký nếu
 * không đồng thời đổi bên `ielts-mock.js#verifyResult` — hai bên phải khớp
 * TỪNG KÝ TỰ chuỗi được ký.
 */
export async function pushBandToLms(
  mockSession: string,
  skill: 'writing' | 'speaking',
  band: number,
  feedback?: string,
  detail?: unknown,
): Promise<{ ok: true; duplicate?: boolean; sessionStatus?: string; overallBand?: number | null }> {
  const base = (process.env.UNICOACH_LMS_URL || 'https://lms.unicoach.vn').replace(/\/+$/, '');
  const secret = process.env.UNICOACH_SSO_SECRET;
  if (!secret) throw new Error('WriteRight chưa cấu hình UNICOACH_SSO_SECRET.');

  // Band phải là bội của 0.5 — LMS cũng tự làm tròn, nhưng làm sẵn cho khớp
  // chữ ký. QUAN TRỌNG: dùng đúng biến `b` (số, không toFixed) cho CẢ chữ ký
  // LẪN body — lệch định dạng ("6.50" so với "6.5") là lỗi hay gặp nhất.
  const b = Math.round(band * 2) / 2;
  const signature = crypto.createHmac('sha256', secret).update(`${mockSession}.${skill}.${b}`).digest('hex');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  let res: Response;
  try {
    res = await fetch(`${base}/api/ielts-callback/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app: 'writeright', token: mockSession, skill, band: b, feedback, detail, signature }),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `LMS trả về ${res.status}`);
  return { ok: true, duplicate: data?.duplicate, sessionStatus: data?.session_status, overallBand: data?.overall_band ?? null };
}
