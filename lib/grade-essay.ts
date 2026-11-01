// Lõi chấm bài Writing dùng chung cho /api/evaluate (học viên đăng nhập, có ảnh)
// và /api/external/mock-grade (LMS gọi từ máy chủ trong bài thi thử 4 kỹ năng).
// Tách ra để hai đường KHÔNG bao giờ chấm bằng hai bộ tiêu chí khác nhau.

export const SYSTEM_PROMPT = `You are a highly experienced IELTS examiner (20+ years) and an applied linguist. Evaluate the essay and respond ONLY with valid JSON (no markdown, no code blocks). Every field marked {en, vi} is an object with an English string ("en") and a Vietnamese string ("vi").

ORDER OF REASONING - THIS IS BINDING AND OVERRIDES ANY HABIT YOU HAVE. Emit the keys in EXACTLY the order given below. You are building a score up from evidence, not justifying a number you already picked. Concretely: transcribe first (if needed), collect the concrete language errors next, then judge each criterion against the official descriptors by quoting evidence BEFORE naming its band, and only after all four criteria are settled do you state the overall band. Never write any "band" number before the "evidence" and "descriptor_match" that support it. Never write "overall_band" before the four criterion bands exist above it.

Use this structure, in this key order:
{
"transcribed_essay": "ONLY when the essay was submitted as an image: transcribe the student's essay text exactly as written, preserving their errors, with \\n\\n between paragraphs. OMIT this field entirely when essay text was provided directly.",
"error_corrections": [{"original": "exact phrase from essay", "corrected": "fixed version", "category": "grammar|vocabulary|register|tone|reference|dialect|spelling", "explanation": {"en": "why - one concise sentence", "vi": "..."}}],
"sentence_count": 18,
"error_free_sentence_count": 9,
"task_achievement": { "evidence": ["short verbatim quote or specific observation", "another"], "descriptor_match": "Which official TA band descriptor this essay actually meets and why - name the descriptor language, 1-2 sentences", "band": 6.5, "feedback": {"en": "2-3 sentences", "vi": "..."}, "improvements": [{"en": "tip 1", "vi": "..."}, {"en": "tip 2", "vi": "..."}] },
"coherence_cohesion": { "evidence": ["...", "..."], "descriptor_match": "...", "band": 6.5, "feedback": {"en": "...", "vi": "..."}, "improvements": [{"en": "...", "vi": "..."}] },
"lexical_resource": { "evidence": ["...", "..."], "descriptor_match": "...", "band": 6.5, "feedback": {"en": "...", "vi": "..."}, "improvements": [{"en": "...", "vi": "..."}] },
"grammatical_range": { "evidence": ["...", "..."], "descriptor_match": "...", "band": 6.5, "feedback": {"en": "...", "vi": "..."}, "improvements": [{"en": "...", "vi": "..."}] },
"language_insights": {
"register": {"rating": "formal|mixed|informal", "notes": [{"en": "...", "vi": "..."}]},
"tone_nuance": {"notes": [{"en": "...", "vi": "..."}]},
"reference_cohesion": {"notes": [{"en": "...", "vi": "..."}]},
"dialect": {"variety": "British|American|Mixed|Neutral", "notes": [{"en": "...", "vi": "..."}]}
},
"key_strengths": [{"en": "strength", "vi": "..."}],
"priority_fixes": [{"en": "fix", "vi": "..."}],
"overall_band": 6.5,
"borderline": false,
"band_descriptor": "Competent User",
"headline": {"en": "one sentence summary", "vi": "..."},
"summary": {"en": "2-3 sentences", "vi": "..."},
"model_introduction": "A Band 9 introduction paragraph for this prompt (English only)",
"model_rewrite": "The student's ENTIRE essay rewritten at Band 8.5-9.0 (English only). Preserve the student's own ideas, stance, examples and paragraph structure, but upgrade task response, cohesion, vocabulary and grammar. Keep a similar length to the original (within about 10%). Separate paragraphs with \\n\\n."
}
EVIDENCE - each "evidence" array holds 2-4 short items: a verbatim quote from the essay, or a specific countable observation ("Body 2 is 45 words against Body 1's 90", "four of six paragraph openers are Moreover/Furthermore"). No generic praise, no restating the descriptor. This is what your band must rest on.
SENTENCE COUNTS - "sentence_count" is the total number of sentences in the essay. "error_free_sentence_count" is how many of those contain NO error of any kind (grammar, article, agreement, preposition, spelling, punctuation that changes meaning). Count carefully; this ratio is the primary evidence for the Grammatical Range and Accuracy band, so it must agree with the band you give.
BORDERLINE - set "borderline": true when the essay sits genuinely between two half-bands on the overall score and you could defend either. Be honest here; it is used to trigger a second reading, not to penalise you.
ERROR CORRECTIONS - CRITICAL FOR HIGHLIGHTING: each "original" MUST be an exact, character-for-character quote copied verbatim from the student's essay (identical spelling, casing and punctuation) so the app can locate and colour-highlight it inside the essay text. Never paraphrase, never merge two separate errors into one item. Keep each quote short (2-8 words around the error). Provide 6-14 items covering the most band-limiting errors, spread across the whole essay.
LANGUAGE INSIGHTS - analyse beyond surface grammar. REGISTER: flag informal items in academic context (e.g. "a lot of" -> "a considerable number of", "kids" -> "children", contractions). TONE & NUANCE: assess hedging and boosting ("will definitely" vs "is likely to"), connotation ("problem" vs "challenge"), over-generalisation ("everyone knows"). REFERENCE & COHESION: flag ambiguous pronouns (this/it/they with unclear antecedent), repetitive referencing, missing cohesive ties. DIALECT: identify the variety and flag inconsistency (e.g. colour and color in one essay); consistency matters, not the choice itself. Each note is one concise bullet quoting the exact phrase from the essay. Give 2-4 notes per group; use an empty array if nothing meaningful.
BILINGUAL RULES: English is the primary feedback language - academic but accessible (readable at CEFR B2). Vietnamese "vi" is a concise natural rendering for Vietnamese students - translate meaning, never word-by-word; keep IELTS terminology in English (Task Response, cohesive device, band).
CALIBRATION: Apply official IELTS band descriptors strictly. Never inflate scores; when between two bands choose the lower unless clear evidence supports the higher. HARD CAPS: under 250 words (Task 2) or 150 words (Task 1) -> Task Achievement max 5.0. Off-topic -> Task Achievement max 4.0. Memorised or template-heavy essays -> Lexical Resource max 6.0. Half bands are acceptable. Be honest and precise.
OVERALL BAND IS DERIVED, NOT CHOSEN: it is the mean of the four criterion bands, rounded the official IELTS way (a .25 remainder rounds up to the next half band, a .75 remainder rounds up to the next whole band). Compute it from the four numbers you wrote above - do not pick a number that feels right and then reverse-engineer the criteria to match it.`;

/**
 * Điểm tổng IELTS là trung bình 4 tiêu chí, làm tròn theo quy tắc chính thức:
 * dư .25 làm tròn LÊN nửa band, dư .75 làm tròn LÊN band nguyên.
 */
export function officialOverall(bands: number[]): number | null {
  const nums = bands.filter(b => typeof b === 'number' && b > 0);
  if (nums.length !== 4) return null;
  const mean = nums.reduce((a, b) => a + b, 0) / 4;
  return Math.round(mean * 2) / 2;
}

// Chuyển lỗi thô từ Anthropic API (JSON tiếng Anh, đôi khi lộ chi tiết billing nội bộ)
// thành thông báo tiếng Việt phù hợp brand voice, để học viên không thấy raw error.
// Chi tiết gốc vẫn được console.error ở nơi gọi hàm này để tra Vercel logs.
export function friendlyApiError(status: number, raw: string): string {
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



export const EVAL_MODEL = 'claude-sonnet-4-6';

// Bản "gọn" của prompt: bỏ bài mẫu mở bài + bài viết lại toàn bộ band 8.5–9.0. Hai trường này chiếm phần lớn
// token đầu ra nên làm mỗi lượt chấm mất >100 giây. Dùng cho thi thử: có band trong ~30–60 giây,
// phần bài viết lại lấy sau bằng rewriteEssayText (route mock-rewrite).
export const LEAN_SYSTEM_PROMPT = SYSTEM_PROMPT.replace(
  /,\n"model_introduction":[^\n]*\n"model_rewrite":[^\n]*\n\}/, '\n}');

export interface GradedEssay { result: any; band: number | null }

/** Chấm MỘT bài (chỉ văn bản, không ảnh). Ném Error có message tiếng Việt khi lỗi. */
export async function gradeEssayText(o: { taskType: 1 | 2; taskPrompt: string; essayText: string; lean?: boolean }): Promise<GradedEssay> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY chưa được cấu hình.');
  const instruction = `IELTS Task ${o.taskType}\n\nTask Prompt:\n${o.taskPrompt}\n\nStudent Essay:\n${o.essayText}`;
  const body = JSON.stringify({ model: EVAL_MODEL, max_tokens: 12000, temperature: 0.2, system: o.lean ? LEAN_SYSTEM_PROMPT : SYSTEM_PROMPT,
    messages: [{ role: 'user', content: [{ type: 'text', text: instruction }] }] });
  // Thu lai khi Anthropic qua tai/gioi han toc do (429, 529, 5xx) hoac loi mang: nhieu bai cham cung luc (thi thu) hay gap.
  // Tong ngan sach 160 giay (route mock-grade co maxDuration 180 giay); ton trong header retry-after; cho tang dan + jitter.
  const BUDGET_MS = o.lean ? 280_000 : 160_000, MAX_RETRIES = 3;   // lean = thi thu (route mock-grade maxDuration 300s)
  const t0 = Date.now();
  let res: Response | null = null;
  let raw = '';
  for (let attempt = 0; ; attempt++) {
    const left = BUDGET_MS - (Date.now() - t0);
    let wait = Math.min(30_000, 4_000 * 2 ** attempt) + Math.random() * 2_000;
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body,
        signal: AbortSignal.timeout(Math.max(10_000, left)),
      });
      raw = await res.text();
      const transient = res.status === 429 || res.status === 529 || res.status >= 500;
      if (res.ok || !transient || attempt >= MAX_RETRIES) break;
      const ra = Number(res.headers.get('retry-after'));
      if (Number.isFinite(ra) && ra > 0) wait = Math.min(30_000, ra * 1000) + Math.random() * 1_000;
      console.warn(`[grade-essay] Anthropic ${res.status}, thu lai lan ${attempt + 1} sau ${Math.round(wait / 1000)}s`);
    } catch (e: any) {
      if (attempt >= MAX_RETRIES) throw new Error(friendlyApiError(503, ''));
      console.warn('[grade-essay] loi mang/timeout, thu lai:', e?.message);
    }
    if (BUDGET_MS - (Date.now() - t0) < wait + 30_000) {
      if (res) break;
      throw new Error(friendlyApiError(503, ''));
    }
    await new Promise(r => setTimeout(r, wait));
  }
  if (!res) throw new Error(friendlyApiError(503, ''));
  console.log(`[grade-essay] done ${((Date.now() - t0) / 1000).toFixed(1)}s status=${res.status} task=${o.taskType}`);
  if (!res.ok) { console.error(`[grade-essay] Anthropic ${res.status}:`, raw); throw new Error(friendlyApiError(res.status, raw)); }
  let data: any; try { data = JSON.parse(raw); } catch { throw new Error('Lỗi kết nối AI. Vui lòng thử lại.'); }
  const text = data.content?.map((b: any) => b.text || '').join('') ?? '';
  let result: any;
  try { result = JSON.parse(text.replace(/```json|```/g, '').trim()); }
  catch {
    // Thử lấy đoạn JSON từ { đầu tiên đến } cuối cùng (AI đôi khi thêm lời dẫn/kết quanh JSON).
    const a = text.indexOf('{'), z = text.lastIndexOf('}');
    try { if (a < 0 || z <= a) throw new Error('no-json'); result = JSON.parse(text.slice(a, z + 1)); }
    catch {
      console.error(`[grade-essay] JSON không hợp lệ: stop_reason=${data.stop_reason} out_tokens=${data.usage?.output_tokens} len=${text.length} head=${JSON.stringify(text.slice(0, 200))} tail=${JSON.stringify(text.slice(-200))}`);
      throw new Error(data.stop_reason === 'max_tokens' ? 'Bài chấm bị cắt do quá dài. Vui lòng bấm chấm lại.' : 'AI trả về định dạng không hợp lệ.');
    }
  }
  // Điểm tổng suy ra từ 4 tiêu chí — cùng quy tắc với /api/evaluate.
  const derived = officialOverall([result.task_achievement?.band, result.coherence_cohesion?.band,
    result.lexical_resource?.band, result.grammatical_range?.band]);
  if (derived != null) {
    const claimed = typeof result.overall_band === 'number' ? result.overall_band : null;
    if (claimed == null || Math.abs(claimed - derived) > 0.5) result.overall_band = derived;
  }
  return { result, band: typeof result.overall_band === 'number' ? result.overall_band : derived };
}

/** Viết lại bài ở band 8.5–9.0 + mở bài mẫu. Gọi sau khi đã có band (chấm bản gọn). */
export async function rewriteEssayText(o: { taskType: 1 | 2; taskPrompt: string; essayText: string }): Promise<{ model_introduction: string; model_rewrite: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY chưa được cấu hình.');
  const system = 'You are an expert IELTS writing coach. Respond ONLY with valid JSON (no markdown) of the form {"model_introduction": "...", "model_rewrite": "..."}. model_introduction: a Band 9 introduction paragraph for this prompt (English only). model_rewrite: the student\'s ENTIRE essay rewritten at Band 8.5-9.0 (English only), preserving the student\'s own ideas, stance, examples and paragraph structure while upgrading task response, cohesion, vocabulary and grammar; similar length to the original (within about 10%); paragraphs separated by \\n\\n.';
  const instruction = `IELTS Task ${o.taskType}\n\nTask Prompt:\n${o.taskPrompt}\n\nStudent Essay:\n${o.essayText}`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: EVAL_MODEL, max_tokens: 4000, temperature: 0.3, system,
      messages: [{ role: 'user', content: [{ type: 'text', text: instruction }] }] }),
    signal: AbortSignal.timeout(100_000),
  });
  const raw = await res.text();
  if (!res.ok) { console.error(`[rewrite-essay] Anthropic ${res.status}:`, raw); throw new Error(friendlyApiError(res.status, raw)); }
  const data = JSON.parse(raw);
  const text = data.content?.map((b: any) => b.text || '').join('') ?? '';
  const out = JSON.parse(text.replace(/```json|```/g, '').trim());
  return { model_introduction: String(out.model_introduction || ''), model_rewrite: String(out.model_rewrite || '') };
}
