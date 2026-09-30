/**
 * Chọn email onboarding cho khách ĐÃ TRẢ TIỀN mà chưa chấm bài nào — logic thuần, kiểm thử được.
 *   - Chưa gửi onboard_paid_a → gửi a (ngay lần chạy kế tiếp sau khi trả tiền).
 *   - Đã gửi a từ ≥4 ngày, vẫn 0 bài, chưa quá 14 ngày → gửi b (một lần).
 * Mỗi kỳ gói mỗi loại một lần: email_log UNIQUE(user_id, kind, expires_on) với expires_on = ngày hết hạn gói,
 * nên gia hạn sang kỳ mới thì được onboarding lại nếu vẫn chưa dùng.
 */
export type OnboardKind = 'onboard_paid_a' | 'onboard_paid_b';

export interface OnboardCandidate {
  user_id: string;
  email: string;
  full_name: string | null;
  tier: string;
  tier_expires_at: string;
  expires_on: string;          // YYYY-MM-DD (giờ VN), từ SQL
  a_sent_at: string | null;
}

const DAY = 86_400_000;

export function pickOnboarding(c: OnboardCandidate, now: number): { kind: OnboardKind; expiresOn: string } | null {
  if (!c.expires_on) return null;
  if (!c.a_sent_at) return { kind: 'onboard_paid_a', expiresOn: c.expires_on };
  const a = Date.parse(c.a_sent_at);
  if (!Number.isFinite(a)) return null;
  const age = now - a;
  if (age >= 4 * DAY && age < 14 * DAY) return { kind: 'onboard_paid_b', expiresOn: c.expires_on };
  return null;
}
