/**
 * Ngân sách AI (Anthropic) — 02/11/2026.
 *
 * Vì sao: tài khoản Anthropic có hạn mức chi tiêu tháng (hiện $20). Chạm hạn mức thì MỌI lượt chấm hỏng
 * (đã xảy ra 18/10). File này:
 *   1. Ghi chi phí ước tính của từng lần gọi AI vào bảng ai_usage (token thật × giá niêm yết).
 *   2. Gửi email cảnh báo khi chi tiêu tháng chạm 50% / 75% / 90% ngân sách (mỗi mức một lần mỗi tháng).
 *   3. Nhận diện lỗi "hết tiền / chạm hạn mức" để nơi gọi xếp bài vào hàng chờ thay vì báo lỗi.
 *   4. Từ 90% ngân sách: tạm dừng chấm cho tài khoản miễn phí, dành phần còn lại cho người trả phí + thi thử.
 *
 * Biến môi trường: AI_MONTHLY_BUDGET_USD (mặc định 20), ADMIN_ALERT_EMAIL (người nhận cảnh báo),
 * AI_PRICE_IN_PER_MTOK / AI_PRICE_OUT_PER_MTOK (mặc định 3 / 15 USD — giá Sonnet; số ước tính, đối chiếu
 * trang Billing của Anthropic). Bảng: sql/ai-usage.sql.
 * KHÔNG BAO GIỜ ném lỗi: mất số liệu chi phí còn hơn làm hỏng việc chấm bài.
 */
import { createAdminSupabase } from '@/lib/supabase-admin';
import { sendMail } from '@/lib/mailer';

const num = (v: string | undefined, d: number) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d; };
export const budgetUsd = () => num(process.env.AI_MONTHLY_BUDGET_USD, 20);
const PRICE_IN = () => num(process.env.AI_PRICE_IN_PER_MTOK, 3);
const PRICE_OUT = () => num(process.env.AI_PRICE_OUT_PER_MTOK, 15);
const LEVELS = [50, 75, 90];

/** Đầu tháng theo UTC — hạn mức Anthropic tính theo tháng dương lịch. */
function monthStart(now = new Date()) { return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)); }
const monthKey = (now = new Date()) => now.toISOString().slice(0, 7);

export function estimateUsd(inputTokens?: number | null, outputTokens?: number | null) {
  return ((inputTokens || 0) * PRICE_IN() + (outputTokens || 0) * PRICE_OUT()) / 1_000_000;
}

/** Lỗi do hết tiền / chạm hạn mức chi tiêu (không phải quá tải tạm thời). */
export function isBudgetError(status: number, raw: string) {
  return (status === 400 || status === 402 || status === 403 || status === 429)
    && /credit balance|usage limit|spend(ing)? limit|billing/i.test(raw || '');
}

export async function monthSpendUsd(): Promise<number> {
  try {
    const { data, error } = await createAdminSupabase().rpc('ai_spend_since', { since: monthStart().toISOString() });
    if (error) { console.error('[ai-budget] doc chi tieu loi:', error.message); return 0; }
    return Number(data) || 0;
  } catch (e: any) { console.error('[ai-budget]', e?.message); return 0; }
}

/** Đã dùng từ 90% ngân sách tháng chưa? Cache 2 phút để không truy vấn ở mọi lượt chấm. */
let tightCache: { at: number; v: boolean } | null = null;
export async function budgetTight(): Promise<boolean> {
  if (tightCache && Date.now() - tightCache.at < 120_000) return tightCache.v;
  const v = (await monthSpendUsd()) >= budgetUsd() * 0.9;
  tightCache = { at: Date.now(), v };
  return v;
}

async function alertOnce(level: number, subject: string, text: string) {
  const to = process.env.ADMIN_ALERT_EMAIL || process.env.MAIL_FROM;
  if (!to) { console.error('[ai-budget] chua dat ADMIN_ALERT_EMAIL — khong gui duoc canh bao:', subject); return; }
  try {
    const admin = createAdminSupabase();
    // Chèn trước rồi mới gửi: khoá chính (month, level) chặn gửi trùng giữa nhiều lượt chấm song song.
    const { error } = await admin.from('ai_budget_alerts').insert({ month: monthKey(), level });
    if (error) return;   // đã gửi mức này trong tháng
    await sendMail({ to, subject, text, html: `<pre style="font-family:Georgia,serif;font-size:15px;white-space:pre-wrap">${text.replace(/</g, '&lt;')}</pre>` });
  } catch (e: any) { console.error('[ai-budget] gui canh bao loi:', e?.message); }
}

/** Ghi chi phí một lần gọi AI rồi kiểm ngưỡng cảnh báo. Gọi kiểu fire-and-forget. */
export async function recordAiUsage(source: string, model: string | null, usage: { input_tokens?: number | null; output_tokens?: number | null } | null | undefined) {
  if (!usage) return;
  try {
    const usd = estimateUsd(usage.input_tokens, usage.output_tokens);
    await createAdminSupabase().from('ai_usage').insert({
      source, model, input_tokens: usage.input_tokens || 0, output_tokens: usage.output_tokens || 0, usd,
    });
    const spend = await monthSpendUsd(), budget = budgetUsd();
    const pct = spend / budget * 100;
    const level = [...LEVELS].reverse().find(l => pct >= l);
    if (level) {
      await alertOnce(level, `[WriteRight] Ngân sách AI tháng đã dùng ${level}% (~$${spend.toFixed(2)}/$${budget})`,
        `Chi tiêu AI ước tính tháng ${monthKey()}: $${spend.toFixed(2)} trên ngân sách $${budget} (${pct.toFixed(0)}%).\n\n` +
        (level >= 90
          ? 'Từ mức 90%, hệ thống tạm dừng chấm cho tài khoản MIỄN PHÍ để dành phần còn lại cho học viên trả phí và bài thi thử.\n'
          : '') +
        'Nếu cần: tăng Monthly spend limit tại https://console.anthropic.com/settings/limits rồi đặt AI_MONTHLY_BUDGET_USD trên Vercel cho khớp.\n' +
        'Số liệu là ước tính theo token × giá niêm yết; đối chiếu trang Billing của Anthropic.');
    }
  } catch (e: any) { console.error('[ai-budget] ghi chi phi loi:', e?.message); }
}

/** Gọi ngay khi Anthropic báo hết tiền / chạm hạn mức. Mỗi tháng gửi một email mức 100. */
export async function alertBudgetExhausted(raw: string) {
  await alertOnce(100, '[WriteRight] KHẨN: AI đã chạm hạn mức chi tiêu — bài chấm đang xếp hàng chờ',
    `Anthropic từ chối lượt chấm vì hết tiền / chạm hạn mức (tháng ${monthKey()}).\n` +
    'Bài của học viên KHÔNG bị mất: được xếp vào hàng chờ và tự chấm lại khi hạn mức mở.\n\n' +
    'Cần làm: vào https://console.anthropic.com/settings/limits tăng Monthly spend limit hoặc nạp thêm credit.\n\n' +
    'Thông báo gốc: ' + String(raw || '').slice(0, 400));
}
