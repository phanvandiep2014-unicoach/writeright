/**
 * Hạn dùng gói trả phí WriteRight TÍNH TỪ BÀI CHẤM ĐẦU TIÊN — logic thuần, kiểm thử được.
 *
 * Phan chốt 30/09/2026: hạn tính từ bài chấm đầu tiên, không từ lúc thanh toán.
 * Phan chốt 01/10/2026: 14 ngày sau thanh toán vẫn chưa chấm bài nào thì hạn tự bắt đầu.
 * (Lý do: 3/7 khách rời đi trong đợt 14/09 trả tiền rồi chấm 0–2 bài — tính giờ từ lúc
 *  trả tiền là phạt người bận.)
 *
 * Cách làm KHÔNG đụng tới nơi nào đang đọc tier_expires_at (view user_entitlements,
 * /api/entitlement, dashboard, cron nhắc gia hạn, email onboarding):
 *   • Lúc thanh toán (gói mới, hoặc gói cũ đã hết hạn):
 *       tier_expires_at   = bây giờ + 14 ngày + N ngày    ← chính là mốc "tự bắt đầu sau 14 ngày"
 *       tier_pending_days = N                              ← "còn N ngày chưa bắt đầu đếm"
 *   • Bài chấm đầu tiên sau đó:
 *       tier_expires_at   = min(hạn hiện tại, lúc chấm + N ngày)
 *       tier_activated_at = lúc chấm;  tier_pending_days = null
 *   • Không chấm bài nào → hạn tạm ở trên tự đúng là "trả tiền + 14 + N".
 * Gia hạn khi quyền còn hiệu lực vẫn CỘNG DỒN như trước; nếu kỳ trước còn đang chờ
 * kích hoạt thì cộng luôn vào số ngày chờ.
 */

export const DAY_MS = 86_400_000;
export const AUTO_START_DAYS = 14;

export interface ExpiryState {
  tier_expires_at: string | null;
  tier_pending_days: number | null;
}

export interface PaymentPatch {
  tier_expires_at: string;
  tier_pending_days: number | null;
  tier_activated_at?: null;
}

/** Hạn mới khi webhook PayOS báo thanh toán thành công `days` ngày (30 hoặc 365). */
export function paymentPatch(cur: ExpiryState | null, days: number, now: number): PaymentPatch {
  const exp = cur?.tier_expires_at ? Date.parse(cur.tier_expires_at) : NaN;
  const alive = Number.isFinite(exp) && exp > now;
  const pending = cur?.tier_pending_days ?? null;

  if (alive) {
    // Gia hạn sớm: cộng dồn từ hạn cũ. Nếu kỳ trước còn chờ kích hoạt thì số ngày chờ tăng theo.
    return {
      tier_expires_at: new Date(exp + days * DAY_MS).toISOString(),
      tier_pending_days: pending != null ? pending + days : null,
    };
  }
  // Mua mới hoặc mua lại sau khi đã hết hạn: bắt đầu một kỳ chờ kích hoạt mới.
  return {
    tier_expires_at: new Date(now + (AUTO_START_DAYS + days) * DAY_MS).toISOString(),
    tier_pending_days: days,
    tier_activated_at: null,
  };
}

/**
 * Gọi sau khi một bài chấm được lưu thành công. Trả về patch cần ghi, hoặc null nếu
 * không có gì để làm (không có kỳ chờ, hoặc gói đã hết hạn).
 */
export function activationPatch(cur: ExpiryState | null, now: number):
  { tier_expires_at: string; tier_activated_at: string; tier_pending_days: null } | null {
  const pending = cur?.tier_pending_days;
  if (pending == null || pending <= 0) return null;
  const exp = cur?.tier_expires_at ? Date.parse(cur.tier_expires_at) : NaN;
  if (!Number.isFinite(exp) || exp <= now) return null;      // đã tự bắt đầu và chạy hết rồi
  return {
    tier_expires_at: new Date(Math.min(exp, now + pending * DAY_MS)).toISOString(),
    tier_activated_at: new Date(now).toISOString(),
    tier_pending_days: null,
  };
}

/** Ngày hạn sẽ tự bắt đầu đếm nếu khách chưa chấm bài (để hiện trên dashboard). */
export function autoStartDate(cur: ExpiryState | null): Date | null {
  if (cur?.tier_pending_days == null || !cur.tier_expires_at) return null;
  return new Date(Date.parse(cur.tier_expires_at) - cur.tier_pending_days * DAY_MS);
}
