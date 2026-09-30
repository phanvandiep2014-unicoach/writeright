/**
 * Chọn email nurture cho từng người — logic thuần, không đụng DB/mạng nên kiểm thử được.
 *
 * Nguyên tắc: MỖI NGƯỜI MỖI LẦN CHẠY TỐI ĐA MỘT EMAIL, và mỗi loại chỉ gửi một lần trong đời
 * (email_log UNIQUE(user_id, kind, expires_on) với expires_on cố định theo người).
 *   - Chưa chấm bài nào: mốc 1–2 ngày → d1, 3–6 ngày → d3, 7–9 ngày → d7 (theo tuổi tài khoản).
 *     Chọn theo khoảng thay vì đúng ngày để lỡ một hôm cron vẫn gửi, nhưng không dồn 3 email cùng lúc.
 *   - Đã có bài chấm: sau ≥ 24h kể từ bài đầu tiên → results (gợi ý khóa theo band), một lần.
 */

export type NurtureKind = 'nurture_d1' | 'nurture_d3' | 'nurture_d7' | 'nurture_results';

export interface NurtureCandidate {
  user_id: string;
  email: string;
  full_name: string | null;
  tier: string;
  signup_at: string;
  essays_count: number | string;      // bigint từ Postgres có thể về dạng chuỗi
  last_band: number | string | null;
  first_eval_at: string | null;
  last_eval_at: string | null;
}

const DAY = 86_400_000;
const ICT_OFFSET = 7 * 3_600_000;

/** Ngày YYYY-MM-DD theo giờ Việt Nam. */
export function ictDate(ms: number): string {
  return new Date(ms + ICT_OFFSET).toISOString().slice(0, 10);
}

export function pickNurture(c: NurtureCandidate, now: number): { kind: NurtureKind; expiresOn: string } | null {
  const essays = Number(c.essays_count) || 0;
  const signup = Date.parse(c.signup_at);
  if (!Number.isFinite(signup)) return null;

  if (essays === 0) {
    const age = Math.floor((now - signup) / DAY);
    const expiresOn = ictDate(signup);
    if (age >= 1 && age < 3) return { kind: 'nurture_d1', expiresOn };
    if (age >= 3 && age < 7) return { kind: 'nurture_d3', expiresOn };
    if (age >= 7 && age < 10) return { kind: 'nurture_d7', expiresOn };
    return null;
  }

  const band = c.last_band == null ? NaN : Number(c.last_band);
  const first = c.first_eval_at ? Date.parse(c.first_eval_at) : NaN;
  const last = c.last_eval_at ? Date.parse(c.last_eval_at) : NaN;
  if (!Number.isFinite(band) || !Number.isFinite(first) || !Number.isFinite(last)) return null;
  if (now - first < DAY) return null;          // để người dùng xem kết quả xong đã
  if (now - last > 14 * DAY) return null;      // quá cũ, không còn đúng thời điểm
  return { kind: 'nurture_results', expiresOn: ictDate(first) };
}

/** Gắn UTM chuẩn (chữ thường, không dấu, gạch dưới — xem GIAI-DOAN-0 mục 4). */
export function withUtm(url: string, kind: NurtureKind, campaign: string): string {
  const u = new URL(url);
  u.searchParams.set('utm_source', 'writeright');
  u.searchParams.set('utm_medium', 'email');
  u.searchParams.set('utm_campaign', campaign);
  u.searchParams.set('utm_content', kind);
  return u.toString();
}
