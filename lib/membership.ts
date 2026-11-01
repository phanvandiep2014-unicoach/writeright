/**
 * Gói hội viên Scholar / Laureate (từ 02/11/2026): WriteRight + Precisely + Pass tự học LMS.
 *
 *  - Hạn mức Writing tính theo 30 ngày gần nhất, không cộng dồn.
 *  - profiles.member_plan = NULL → khách gói cũ hoặc học viên trung tâm: giữ hành vi cũ (không giới hạn).
 *  - Phút nói nằm ở gotcha-web/api/_lib/quota-rules.js (scholar 45, laureate 90).
 *  - Pass tự học do LMS giữ (course_access). WriteRight gọi POST /api/v1/member-pass sau khi khách trả tiền.
 */
export type MemberPlan = 'scholar' | 'laureate';

export const MEMBER_WRITING_PER_30D: Record<MemberPlan, number> = { scholar: 15, laureate: 30 };
export const MEMBER_LABEL: Record<MemberPlan, string> = { scholar: 'Scholar', laureate: 'Laureate' };

export function isMemberPlan(v: unknown): v is MemberPlan {
  return v === 'scholar' || v === 'laureate';
}

/**
 * Báo LMS mở Pass tự học cho email này thêm `days` ngày. KHÔNG ném lỗi: thanh toán đã xong,
 * mở Pass hỏng thì cron hằng ngày thử lại (orders.pass_granted_at còn NULL).
 * LMS tự chống trùng theo `ref` (mã đơn), gọi lại nhiều lần vẫn an toàn.
 */
export async function grantLmsPass(a: { email: string; plan: MemberPlan; days: number; ref: string }): Promise<boolean> {
  const base = (process.env.UNICOACH_LMS_URL || 'https://unicoach-bms-production.up.railway.app').replace(/\/+$/, '');
  const apiKey = process.env.UNICOACH_API_KEY;
  if (!apiKey || !a.email) {
    console.error('[membership] thieu UNICOACH_API_KEY hoac email, chua mo duoc Pass LMS cho', a.ref);
    return false;
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${base}/api/v1/member-pass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({ email: a.email, plan: a.plan, days: a.days, ref: a.ref }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.error('[membership] LMS tu choi mo Pass:', res.status, (await res.text()).slice(0, 200));
      return false;
    }
    return true;
  } catch (e: any) {
    console.error('[membership] goi LMS mo Pass loi:', e?.message);
    return false;
  }
}

export const CYCLE_DAYS: Record<string, number> = { monthly: 30, quarterly: 90, yearly: 365 };
