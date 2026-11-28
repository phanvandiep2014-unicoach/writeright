/**
 * Quy tắc gói MIỄN PHÍ của WriteRight (28/11/2026) — dùng chung cho server (lib/grading.ts)
 * và giao diện (hooks/useEntitlement.ts). Không import gì phía server để client dùng được.
 *
 * 1. GÓI CHÀO MỪNG (một lần, tính từ lúc tạo tài khoản = profiles.created_at):
 *    WELCOME_CREDITS lượt chấm ĐẦY ĐỦ (xem cả 4 tiêu chí, lỗi sai, viết lại) trong WELCOME_DAYS ngày.
 *    Giới hạn cả lượt lẫn thời gian: hết ngày thì lượt chưa dùng cũng mất.
 * 2. SAU ĐÓ: FREE_PER_30D lượt mỗi 30 ngày gần nhất, chỉ thấy band tổng + nhận xét ngắn
 *    (phần chi tiết bị <DetailGate> làm mờ, mời nâng cấp Scholar / Laureate).
 *
 * Lượt LMS (free_full_credits) và học viên đang học (tier standard) đi đường riêng, không đổi.
 * Đổi con số qua biến môi trường NEXT_PUBLIC_* trên Vercel (cần deploy lại), không cần sửa code.
 */
function envInt(v: string | undefined, fallback: number): number {
  const n = parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export const WELCOME_CREDITS = envInt(process.env.NEXT_PUBLIC_FREE_WELCOME_CREDITS, 5);
export const WELCOME_DAYS = envInt(process.env.NEXT_PUBLIC_FREE_WELCOME_DAYS, 14);
export const FREE_PER_30D = envInt(process.env.NEXT_PUBLIC_FREE_PER_30D, 2);

const DAY = 24 * 60 * 60 * 1000;

/** Các mốc để nơi gọi chạy đúng 2 truy vấn count trên `evaluations`. */
export function freeCountRanges(createdAt: string | null | undefined, now = Date.now()) {
  const created = createdAt ? new Date(createdAt).getTime() : NaN;
  const since30 = now - 30 * DAY;
  if (!Number.isFinite(created)) {
    return { welcomeFrom: null, welcomeTo: null, monthlyFrom: new Date(since30).toISOString() };
  }
  const welcomeTo = created + WELCOME_DAYS * DAY;
  return {
    /** A = số bài chấm trong [welcomeFrom, welcomeTo) */
    welcomeFrom: new Date(created).toISOString(),
    welcomeTo: new Date(welcomeTo).toISOString(),
    /** B = số bài chấm từ monthlyFrom tới nay (sau cửa sổ chào mừng, trong 30 ngày qua) */
    monthlyFrom: new Date(Math.max(since30, welcomeTo)).toISOString(),
  };
}

export type FreeState = {
  /** Còn lượt chào mừng dùng được ngay → bài chấm tiếp theo được xem đầy đủ. */
  inWelcome: boolean;
  welcomeLeft: number;
  /** Mốc hết gói chào mừng (ISO), null nếu không biết ngày tạo tài khoản. */
  welcomeEndsAt: string | null;
  /** Còn trong cửa sổ chào mừng (dù đã hết lượt) → vẫn xem đầy đủ các bài đã chấm. */
  welcomeWindowOpen: boolean;
  /** Lượt miễn phí thường còn lại trong 30 ngày gần nhất. */
  monthlyLeft: number;
  /** Tổng lượt còn chấm được ngay bây giờ. */
  left: number;
};

/**
 * @param createdAt   profiles.created_at
 * @param inWindow    A — số bài đã chấm trong cửa sổ chào mừng
 * @param afterWindow B — số bài đã chấm sau cửa sổ, trong 30 ngày qua
 * @param pending     bài đang xếp hàng chấm nền (tính như đã dùng, chống xếp nhiều bài lách hạn mức)
 */
export function freeState(createdAt: string | null | undefined, inWindow: number, afterWindow: number, pending = 0, now = Date.now()): FreeState {
  const r = freeCountRanges(createdAt, now);
  const windowOpen = !!r.welcomeTo && now < new Date(r.welcomeTo).getTime();
  // Chỉ những bài trong cửa sổ mà vẫn còn nằm trong 30 ngày qua mới có thể ăn vào hạn mức tháng.
  const windowInLast30 = !!r.welcomeTo && new Date(r.welcomeTo).getTime() > now - 30 * DAY;

  const used = inWindow + (windowOpen ? pending : 0);
  const welcomeLeft = windowOpen ? Math.max(0, WELCOME_CREDITS - used) : 0;
  // Bài vượt quá gói chào mừng (dùng hết lượt sớm rồi chấm tiếp) tính vào hạn mức tháng.
  const overflow = windowInLast30 ? Math.max(0, used - WELCOME_CREDITS) : 0;
  const monthlyUsed = afterWindow + overflow + (windowOpen ? 0 : pending);
  const monthlyLeft = Math.max(0, FREE_PER_30D - monthlyUsed);

  return {
    inWelcome: welcomeLeft > 0,
    welcomeLeft,
    welcomeEndsAt: r.welcomeTo,
    welcomeWindowOpen: windowOpen,
    monthlyLeft,
    left: welcomeLeft > 0 ? welcomeLeft : monthlyLeft,
  };
}

/** Đếm A và B bằng một client Supabase bất kỳ (phiên người dùng hoặc service role). */
export async function countFreeUsage(supabase: any, userId: string, createdAt: string | null | undefined, now = Date.now()) {
  const r = freeCountRanges(createdAt, now);
  const base = () => supabase.from('evaluations').select('*', { count: 'exact', head: true }).eq('user_id', userId);
  const [a, b] = await Promise.all([
    r.welcomeFrom && r.welcomeTo ? base().gte('created_at', r.welcomeFrom).lt('created_at', r.welcomeTo) : Promise.resolve({ count: 0 }),
    base().gte('created_at', r.monthlyFrom),
  ]);
  return { inWindow: (a as any)?.count ?? 0, afterWindow: (b as any)?.count ?? 0 };
}
