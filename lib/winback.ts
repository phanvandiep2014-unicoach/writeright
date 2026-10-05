/**
 * Email "kéo khách quay lại" (win-back) cho khách TRẢ PHÍ đã hết hạn mà chưa gia hạn - logic thuần, kiểm thử được.
 *
 * Bối cảnh (05/10/2026): 8 khách đang viết đều đặn trong tháng 9 hết hạn 27/09-03/10 và không ai gia hạn;
 * cron nhắc gia hạn chỉ bắn TRƯỚC ngày hết hạn và SMTP mới chạy từ 02/10, nên gần như không ai được nhắc.
 *
 *   - winback_3d : hết hạn 2-9 ngày trước  -> nhắc nhẹ + tiến bộ của chính họ.
 *   - winback_14d: hết hạn 13-20 ngày trước -> email cuối cùng của kỳ này, hỏi lý do dừng.
 * Chỉ gửi cho người ĐÃ CHẤM ÍT NHẤT 1 BÀI (người 0 bài là nhóm "trả tiền chưa bắt đầu", xử lý tay / onboarding).
 * Mỗi kỳ hết hạn mỗi loại một lần: email_log UNIQUE(user_id, kind, expires_on) với expires_on = ngày hết hạn gói.
 */
export type WinbackKind = 'winback_3d' | 'winback_14d';

export interface WinbackCandidate {
  user_id: string;
  tier_expires_at: string | null;   // ISO
  essays: number;
  enrolled_override?: boolean | null;
  role?: string | null;
  optout?: boolean;                 // email_prefs.nurture_optout_at có giá trị
  sent?: WinbackKind[];             // các loại đã gửi cho kỳ hết hạn này
}

const DAY = 86_400_000;

/** Ngày hết hạn theo giờ VN (YYYY-MM-DD) - khoá chống gửi trùng mỗi kỳ. */
export function expiryKey(iso: string): string {
  return new Date(Date.parse(iso) + 7 * 3_600_000).toISOString().slice(0, 10);
}

export function pickWinback(c: WinbackCandidate, now: number): { kind: WinbackKind; expiresOn: string } | null {
  if (!c.tier_expires_at || c.enrolled_override || c.optout) return null;
  if (c.role === 'admin' || c.role === 'teacher') return null;
  if (!(c.essays > 0)) return null;
  const exp = Date.parse(c.tier_expires_at);
  if (!Number.isFinite(exp) || exp > now) return null;          // còn hạn hoặc đã gia hạn
  const ago = (now - exp) / DAY;
  const sent = c.sent ?? [];
  const expiresOn = expiryKey(c.tier_expires_at);
  // Cửa sổ đầu rộng tới ngày 10 để lần chạy đầu (hoặc cron lỡ vài ngày) vẫn bắt được người vừa hết hạn.
  if (ago >= 2 && ago < 10 && !sent.includes('winback_3d')) return { kind: 'winback_3d', expiresOn };
  if (ago >= 13 && ago < 21 && !sent.includes('winback_14d')) return { kind: 'winback_14d', expiresOn };
  return null;
}

/** Tóm tắt tiến bộ để đưa vào email - chỉ nói điều có thật, không bịa. */
export function progressLine(essays: number, firstBand: number | null, lastBand: number | null): string {
  const base = `Bạn đã chấm ${essays} bài trên WriteRight`;
  if (firstBand == null || lastBand == null || essays < 2) return `${base}.`;
  const d = Math.round((lastBand - firstBand) * 10) / 10;
  if (d > 0) return `${base}, band đi từ ${firstBand.toFixed(1)} lên ${lastBand.toFixed(1)} (+${d.toFixed(1)}).`;
  return `${base}, bài gần nhất đạt band ${lastBand.toFixed(1)}.`;
}
