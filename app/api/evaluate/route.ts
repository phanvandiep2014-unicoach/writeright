import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { pushResultToLms } from '@/lib/unicoach';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { activationPatch } from '@/lib/activation';

// Prompt A1 (dẫn chứng → đối chiếu descriptor → band từng tiêu chí → band tổng) dùng chung với
// /api/external/mock-grade. Bản cũ đặt overall_band lên ĐẦU nên mô hình chốt điểm trước rồi
// viết nhận xét để hợp lý hoá. Mốc gốc trước khi đổi (04/10/2026, 255 bài): band tổng TB 5.74
// — TA 5.61 · CC 5.88 · LR 5.67 · GRA 5.74. Bài chấm bằng prompt mới có feedback.prompt_version='a1'.
import { SYSTEM_PROMPT, officialOverall } from '@/lib/grade-essay';
const PROMPT_VERSION = 'a1';

const FREE_EVALS_PER_WEEK = 1;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 4;
const ALLOWED_MEDIA = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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

// Chấm bài gọi AI với max_tokens lớn (bài dài / ảnh chữ viết tay) nên cần chạy lâu hơn mặc định.
export const maxDuration = 120;

export async function POST(req: NextRequest) {
const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });

const supabase = await createServerSupabase();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: 'Vui lòng đăng nhập để chấm bài.', code: 'AUTH_REQUIRED' }, { status: 401 });

let body;
try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

const { taskType, taskPrompt, essayText, imageBase64, imageType, images, lessonId } = body;

// Normalise attached images: new `images` array (prompt photo, Task 1 chart, handwritten essay...) with legacy single-image fallback
let imgList: { data: string; media_type: string }[] = [];
if (Array.isArray(images)) {
imgList = images
.filter((im: any) => im && typeof im.data === 'string' && im.data.length > 0)
.slice(0, MAX_IMAGES)
.map((im: any) => ({ data: im.data, media_type: ALLOWED_MEDIA.includes(im.media_type) ? im.media_type : 'image/jpeg' }));
} else if (imageBase64) {
imgList = [{ data: imageBase64, media_type: ALLOWED_MEDIA.includes(imageType) ? imageType : 'image/jpeg' }];
}
const hasImages = imgList.length > 0;

if ((!taskPrompt && !hasImages) || (!essayText && !hasImages))
return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

for (const im of imgList)
if (Math.ceil((im.data.length * 3) / 4) > MAX_IMAGE_BYTES)
return NextResponse.json({ error: 'Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5 MB.' }, { status: 413 });

const weekStart = currentWeekStart();

// C3 — lượt chấm đầy đủ miễn phí do UNICOACH LMS cấp qua cờ writing_free trong
// token SSO. Còn lượt thì bỏ qua hạn mức tuần: đây đúng là "lần chấm thử" mà
// BMS đã hứa với học viên mới, không phải lượt free hằng tuần.
// Cột chỉ có sau khi chạy sql/lms-free-credit.sql — chưa chạy thì coi như 0 lượt.
let usingFreeCredit = false;
{
const { data: p } = await supabase.from('profiles').select('free_full_credits').eq('id', user.id).maybeSingle();
usingFreeCredit = (p?.free_full_credits ?? 0) > 0;
}

const { data: entitlement, error: entErr } = await supabase.from('user_entitlements').select('plan, weekly_quota, evals_this_week').eq('user_id', user.id).single();

if (usingFreeCredit) {
// không kiểm hạn mức
} else if (entErr) {
const { count } = await supabase.from('evaluations').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', weekStart + 'T00:00:00Z');
if ((count ?? 0) >= FREE_EVALS_PER_WEEK) return NextResponse.json({ error: 'Hết lượt miễn phí tuần này.', code: 'QUOTA_EXCEEDED' }, { status: 403 });
} else {
const isPaid = ['standard','premium'].includes(entitlement?.plan);
if (!isPaid && (entitlement?.evals_this_week ?? 0) >= (entitlement?.weekly_quota ?? FREE_EVALS_PER_WEEK))
return NextResponse.json({ error: 'Hết lượt miễn phí tuần này.', code: 'QUOTA_EXCEEDED' }, { status: 403 });
}

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

const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
method: 'POST',
headers: { 'Content-Type':'application/json', 'x-api-key': API_KEY, 'anthropic-version':'2023-06-01' },
body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:12000, temperature:0.2, system: SYSTEM_PROMPT, messages:[{ role:'user', content: userContent }] }),
});

const responseText = await apiRes.text();
if (!apiRes.ok) {
console.error(`[evaluate] Anthropic API error ${apiRes.status}:`, responseText);
return NextResponse.json({ error: friendlyApiError(apiRes.status, responseText), code: 'AI_UNAVAILABLE' }, { status: 503 });
}

let claudeData;
try { claudeData = JSON.parse(responseText); }
catch { return NextResponse.json({ error: 'Lỗi kết nối AI. Vui lòng thử lại.' }, { status: 502 }); }

const rawText = claudeData.content?.map((b: any) => b.text||'').join('') ?? '';
let result;
try { result = JSON.parse(rawText.replace(/```json|```/g,'').trim()); }
catch { return NextResponse.json({ error: 'AI trả về định dạng không hợp lệ. Vui lòng thử lại.' }, { status: 502 }); }

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

return NextResponse.json(result);
} catch (err: any) {
return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
}
}
