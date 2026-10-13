import type { SupabaseClient } from '@supabase/supabase-js';
import { pushResultToLms } from '@/lib/unicoach';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { activationPatch } from '@/lib/activation';
// Prompt A1 (dẫn chứng → đối chiếu descriptor → band từng tiêu chí → band tổng) dùng chung với
// /api/external/mock-grade. Bài chấm bằng prompt này có feedback.prompt_version='a1'.
import { SYSTEM_PROMPT, officialOverall } from '@/lib/grade-essay';

export const PROMPT_VERSION = 'a1';
export const FREE_EVALS_PER_WEEK = 1;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES = 4;
export const ALLOWED_MEDIA = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export type GradeImage = { data: string; media_type: string };
export type GradeResult = { status: number; body: any; evaluationId?: string | null };

// Chuyển lỗi thô từ Anthropic API (JSON tiếng Anh, đôi khi lộ chi tiết billing nội bộ)
// thành thông báo tiếng Việt phù hợp brand voice, để học viên không thấy raw error.
// Chi tiết gốc vẫn được console.error ở nơi gọi hàm này để tra Vercel logs.
function friendlyApiError(status: number, raw: string): string {
let parsed: any = null;
try { parsed = JSON.parse(raw); } catch {}
const errType: string = parsed?.error?.type || '';
const errMsg: string = parsed?.error?.message || '';

if (status === 400 && /credit balance/i.test(errMsg)) {
return 'Hệ thống chấm bài đang tạm gián đoạn do sự cố kỹ thuật. Đội ngũ UNICOACH đã được thông báo, vui lòng thử lại sau ít phút.';
}
if (status === 429 || errType === 'rate_limit_error' || errType === 'overloaded_error') {
return 'Hệ thống đang có nhiều bài chấm cùng lúc. Vui lòng thử lại sau ít phút.';
}
if (status >= 500) {
return 'Lỗi kết nối với hệ thống AI. Vui lòng thử lại sau ít phút.';
}
return 'Không thể chấm bài lúc này. Vui lòng thử lại hoặc liên hệ UNICOACH nếu lỗi này tiếp diễn.';
}

function currentWeekStart() {
const now = new Date();
const day = now.getUTCDay();
const daysToMonday = day === 0 ? 6 : day - 1;
const monday = new Date(now);
monday.setUTCDate(now.getUTCDate() - daysToMonday);
return monday.toISOString().split('T')[0];
}


export function normaliseImages(images: any, imageBase64?: any, imageType?: any): GradeImage[] {
  if (Array.isArray(images)) {
    return images
      .filter((im: any) => im && typeof im.data === 'string' && im.data.length > 0)
      .slice(0, MAX_IMAGES)
      .map((im: any) => ({ data: im.data, media_type: ALLOWED_MEDIA.includes(im.media_type) ? im.media_type : 'image/jpeg' }));
  }
  if (imageBase64) return [{ data: imageBase64, media_type: ALLOWED_MEDIA.includes(imageType) ? imageType : 'image/jpeg' }];
  return [];
}

/**
 * Còn được chấm không? `pendingJobs` = số bài đang xếp hàng/đang chấm nền của người này — tính vào
 * hạn mức để người dùng miễn phí không xếp 5 bài cùng lúc rồi lách hạn mức 1 bài/tuần.
 */
export async function evalAllowance(
  supabase: SupabaseClient, userId: string, pendingJobs = 0,
): Promise<{ ok: true; usingFreeCredit: boolean } | { ok: false; status: number; body: any }> {
  const weekStart = currentWeekStart();
  const quotaOut = { ok: false as const, status: 403, body: { error: 'Hết lượt miễn phí tuần này.', code: 'QUOTA_EXCEEDED' } };

  // C3 — lượt chấm đầy đủ miễn phí do UNICOACH LMS cấp qua cờ writing_free trong token SSO.
  // Còn lượt thì bỏ qua hạn mức tuần. Cột chỉ có sau khi chạy sql/lms-free-credit.sql.
  let usingFreeCredit = false;
  {
    const { data: p } = await supabase.from('profiles').select('free_full_credits').eq('id', userId).maybeSingle();
    usingFreeCredit = ((p as any)?.free_full_credits ?? 0) > 0;
  }
  // Lượt miễn phí LMS chỉ có 1: đã có bài chờ thì không nhận thêm bài nào dựa vào lượt đó.
  if (usingFreeCredit) return pendingJobs > 0 ? quotaOut : { ok: true, usingFreeCredit };

  const { data: entitlement, error: entErr } = await supabase.from('user_entitlements')
    .select('plan, weekly_quota, evals_this_week').eq('user_id', userId).single();
  if (entErr) {
    const { count } = await supabase.from('evaluations').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).gte('created_at', weekStart + 'T00:00:00Z');
    if ((count ?? 0) + pendingJobs >= FREE_EVALS_PER_WEEK) return quotaOut;
  } else {
    const isPaid = ['standard', 'premium'].includes((entitlement as any)?.plan);
    if (!isPaid && ((entitlement as any)?.evals_this_week ?? 0) + pendingJobs >= ((entitlement as any)?.weekly_quota ?? FREE_EVALS_PER_WEEK)) return quotaOut;
  }
  return { ok: true, usingFreeCredit };
}

/**
 * Lõi chấm bài: gọi Anthropic (stream) → chấm → lưu `evaluations` → trừ lượt miễn phí / kích hoạt
 * hạn dùng → đẩy điểm về LMS. Dùng chung cho /api/evaluate (chấm đồng bộ) và hàng đợi chấm nền.
 * `supabase` là client dùng để ghi `evaluations`/`lesson_progress` (phiên người dùng hoặc service role).
 */
export async function runGrading(a: {
  supabase: SupabaseClient;
  user: { id: string; user_metadata?: any };
  taskType: any; taskPrompt: any; essayText: any;
  imgList: GradeImage[]; lessonId?: any; usingFreeCredit: boolean;
}): Promise<GradeResult> {
  const { supabase, user, taskType, taskPrompt, essayText, imgList, lessonId, usingFreeCredit } = a;
  const hasImages = imgList.length > 0;
  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) return { status: 500, body: { error: 'ANTHROPIC_API_KEY not set' } };
  try {
const userContent: any[] = imgList.map(im => ({ type: 'image', source: { type: 'base64', media_type: im.media_type, data: im.data } }));
let instruction = `IELTS Task ${taskType || 2}\n\n`;
instruction += taskPrompt
? `Task Prompt:\n${taskPrompt}\n\n`
: `Task Prompt: provided in the attached image(s) - read it from there.\n\n`;
if (hasImages)
instruction += `The attached image(s) may contain the task prompt (including any chart, graph, table, map, process or diagram for Task 1) and/or the student's handwritten or typed essay. For Task 1, compare the essay against the actual visual data shown in the image when judging Task Achievement (accuracy of figures, trends and key features).\n\n`;
instruction += essayText
? `Student Essay:\n${essayText}`
: `Student Essay: written in the attached image(s). Transcribe it exactly into the "transcribed_essay" field, then evaluate it.`;
userContent.push({ type: 'text', text: instruction });

const t0 = Date.now();
const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
method: 'POST',
headers: { 'Content-Type':'application/json', 'x-api-key': API_KEY, 'anthropic-version':'2023-06-01' },
body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:12000, temperature:0.2, stream:true, system: SYSTEM_PROMPT, messages:[{ role:'user', content: userContent }] }),
signal: AbortSignal.timeout(285_000), // ngắt trước maxDuration để còn trả JSON lỗi thay vì trang lỗi của Vercel
});

if (!apiRes.ok || !apiRes.body) {
const responseText = await apiRes.text();
console.error(`[evaluate] Anthropic API error ${apiRes.status}:`, responseText);
return { status: 503, body: { error: friendlyApiError(apiRes.status, responseText), code: 'AI_UNAVAILABLE' } };
}

// Đọc SSE từ Anthropic, gộp các text_delta thành rawText
let rawText = '';
let inTok: number | null = null, outTok: number | null = null, stopReason: string | null = null;
{
const reader = apiRes.body.getReader();
const dec = new TextDecoder();
let buf = '';
for (;;) {
const { done, value } = await reader.read();
if (done) break;
buf += dec.decode(value, { stream: true });
const lines = buf.split('\n');
buf = lines.pop() ?? '';
for (const line of lines) {
if (!line.startsWith('data:')) continue;
const payload = line.slice(5).trim();
if (!payload || payload === '[DONE]') continue;
let ev: any;
try { ev = JSON.parse(payload); } catch { continue; }
if (ev.type === 'message_start') inTok = ev.message?.usage?.input_tokens ?? inTok;
else if (ev.type === 'message_delta') { outTok = ev.usage?.output_tokens ?? outTok; stopReason = ev.delta?.stop_reason ?? stopReason; }
else if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') rawText += ev.delta.text || '';
else if (ev.type === 'error') {
console.error('[evaluate] Anthropic stream error:', payload);
return { status: 503, body: { error: friendlyApiError(ev.error?.type === 'overloaded_error' ? 529 : 500, payload), code: 'AI_UNAVAILABLE' } };
}
}
}
}

console.log(`[evaluate] grading done ${((Date.now() - t0) / 1000).toFixed(1)}s in=${inTok} out=${outTok} stop=${stopReason} images=${imgList.length} task=${taskType || 2} prompt=${PROMPT_VERSION}`);
let result;
try { result = JSON.parse(rawText.replace(/```json|```/g,'').trim()); }
catch { return { status: 502, body: { error: 'AI trả về định dạng không hợp lệ. Vui lòng thử lại.' } }; }

// Band tổng là SỐ SUY RA từ 4 tiêu chí (làm tròn kiểu IELTS) — mô hình khai lệch quá 0.5 thì ghi đè.
const derivedOverall = officialOverall([result.task_achievement?.band, result.coherence_cohesion?.band, result.lexical_resource?.band, result.grammatical_range?.band]);
if (derivedOverall != null && (typeof result.overall_band !== 'number' || Math.abs(result.overall_band - derivedOverall) > 0.5)) {
  console.warn(`[evaluate] overall_band ${result.overall_band} lệch số suy ra ${derivedOverall} — ghi đè`);
  result.overall_band = derivedOverall;
}
result.prompt_version = PROMPT_VERSION;

const essayForCount = essayText || result.transcribed_essay || '';
const wordCount = essayForCount ? essayForCount.trim().split(/\s+/).filter(Boolean).length : null;
const { data: evalData, error: insertErr } = await supabase.from('evaluations').insert({
user_id: user.id, task_type: taskType||2, task_prompt: taskPrompt || '[Đề bài trong ảnh đính kèm]', essay_text: essayText || result.transcribed_essay || null,
overall_band: result.overall_band??null, ta_band: result.task_achievement?.band??null,
lr_band: result.lexical_resource?.band??null, gra_band: result.grammatical_range?.band??null,
cc_band: result.coherence_cohesion?.band??null, feedback: result,
model_intro: result.model_introduction??null, word_count: wordCount,
}).select('id').single();
if (insertErr) console.error('Failed to log evaluation:', insertErr.message);

// C3 — tiêu lượt miễn phí và mở khoá phần chi tiết trong 30 ngày.
// Mở theo KHOẢNG THỜI GIAN chứ không theo từng bài: nếu khoá lại ngay khi trừ
// lượt thì học viên tải lại trang là mất luôn bài vừa chấm, đúng lúc họ đang
// muốn đọc kỹ. Trừ lượt SAU khi chấm xong để lỗi API không ăn mất lượt của họ.
//
// Ghi bằng service role: sql/khoa-cot-va-han-dung.sql khoá quyền ghi của trình duyệt
// vào mọi cột quyền lợi trên profiles (chỉ còn full_name, avatar_url, updated_at),
// nên client theo phiên đăng nhập sẽ bị từ chối ở đây.
let admin: ReturnType<typeof createAdminSupabase> | null = null;
try { admin = createAdminSupabase(); } catch (e: any) { console.error('[evaluate] thiếu service role:', e?.message); }
if (usingFreeCredit && admin) {
const until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const { error: spendErr } = await admin.from('profiles')
.update({ free_full_credits: 0, free_full_until: until })
.eq('id', user.id);
if (spendErr) console.error('[evaluate] không trừ được lượt miễn phí:', spendErr.message);
}

// Hạn dùng gói trả phí tính từ BÀI CHẤM ĐẦU TIÊN (lib/activation.ts). Chỉ làm khi bài đã
// được lưu — chấm hỏng thì không ăn mất ngày của khách. Cột chưa có (chưa chạy SQL) thì
// select lỗi → bỏ qua, hạn giữ nguyên như cách cũ.
if (admin && evalData?.id) {
const { data: cur, error: curErr } = await admin.from('profiles')
.select('tier_expires_at, tier_pending_days').eq('id', user.id).maybeSingle();
const patch = !curErr ? activationPatch(cur as any, Date.now()) : null;
if (patch) {
const { error: actErr } = await admin.from('profiles').update(patch).eq('id', user.id).not('tier_pending_days', 'is', null);
if (actErr) console.error('[evaluate] không kích hoạt được hạn dùng:', actErr.message);
else console.log(`[evaluate] ${user.id} kích hoạt hạn dùng, hết hạn ${patch.tier_expires_at}`);
}
}

// UNICOACH LMS: học viên vào qua SSO thì đẩy điểm về hồ sơ học tập bên LMS.
// Chạy "bắn và quên" — LMS lỗi hay chưa cấu hình cũng không ảnh hưởng việc chấm bài.
const lmsCode = (user.user_metadata as any)?.lms_student_code;
if (lmsCode && evalData?.id) {
  const fb = result?.headline?.vi || result?.summary?.vi || result?.headline?.en || '';
  void pushResultToLms({
    studentCode: String(lmsCode),
    externalId: String(evalData.id),
    band: result.overall_band ?? null,
    title: `Writing Task ${taskType || 2} — ${String(taskPrompt || 'Đề trong ảnh').slice(0, 90)}`,
    feedback: String(fb).slice(0, 4000),
    detail: {
      task_achievement: result.task_achievement?.band ?? null,
      coherence: result.coherence_cohesion?.band ?? null,
      lexical: result.lexical_resource?.band ?? null,
      grammar: result.grammatical_range?.band ?? null,
    },
  });
}

// LMS: link evaluation to lesson progress
if (lessonId && evalData?.id && user?.id) {
await supabase
.from('lesson_progress')
.update({ evaluation_id: evalData.id, status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
.eq('user_id', user.id)
.eq('lesson_id', lessonId);
}

return { status: 200, body: result, evaluationId: evalData?.id ?? null };
} catch (err: any) {
if (err?.name === 'TimeoutError' || err?.name === 'AbortError')
return { status: 504, body: { error: 'AI chấm quá lâu (bài có ảnh thường chậm hơn). Lượt chấm chưa bị trừ — vui lòng thử lại, hoặc dán bài viết dạng chữ để chấm nhanh hơn.', code: 'AI_TIMEOUT' } };
return { status: 500, body: { error: 'Server error: ' + err.message } };
}
}
