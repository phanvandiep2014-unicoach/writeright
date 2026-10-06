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
"task_achievement": { "evidence": ["short verbatim quote or specific observation", "another"], "descriptor_match": "Which official TA band descriptor this essay actually meets and why - name the descriptor language, 1-2 sentences", "band": 6, "feedback": {"en": "2-3 sentences", "vi": "..."}, "improvements": [{"en": "tip 1", "vi": "..."}, {"en": "tip 2", "vi": "..."}] },
"coherence_cohesion": { "evidence": ["...", "..."], "descriptor_match": "...", "band": 6, "feedback": {"en": "...", "vi": "..."}, "improvements": [{"en": "...", "vi": "..."}] },
"lexical_resource": { "evidence": ["...", "..."], "descriptor_match": "...", "band": 6, "feedback": {"en": "...", "vi": "..."}, "improvements": [{"en": "...", "vi": "..."}] },
"grammatical_range": { "evidence": ["...", "..."], "descriptor_match": "...", "band": 6, "feedback": {"en": "...", "vi": "..."}, "improvements": [{"en": "...", "vi": "..."}] },
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
SENTENCE COUNTS - "sentence_count" is the total number of sentences in the essay. "error_free_sentence_count" is how many of those contain NO real grammatical error (tense, agreement, article, preposition, word form, fragment, run-on). Do NOT count a sentence as faulty for a single minor slip that does not affect meaning (one comma, a capital letter, a typo). This ratio is ONE input to the Grammatical Range and Accuracy band, not the only one: also weigh whether errors ever impede communication and how controlled the complex structures are (subordination, relative clauses, passives, conditionals). A writer who attempts a wide range of complex structures with good control and errors that are mostly minor reaches band 7-8 even if many sentences contain a slip; a writer whose simple sentences are accurate but who barely attempts complex ones stays at band 6 or below.
BORDERLINE - set "borderline": true when the essay sits genuinely between two half-bands on the overall score and you could defend either. Be honest here; it is used to trigger a second reading, not to penalise you.
ERROR CORRECTIONS - CRITICAL FOR HIGHLIGHTING: each "original" MUST be an exact, character-for-character quote copied verbatim from the student's essay (identical spelling, casing and punctuation) so the app can locate and colour-highlight it inside the essay text. Never paraphrase, never merge two separate errors into one item. Keep each quote short (2-8 words around the error). Provide 6-14 items covering the most band-limiting errors, spread across the whole essay.
LANGUAGE INSIGHTS - analyse beyond surface grammar. REGISTER: flag informal items in academic context (e.g. "a lot of" -> "a considerable number of", "kids" -> "children", contractions). TONE & NUANCE: assess hedging and boosting ("will definitely" vs "is likely to"), connotation ("problem" vs "challenge"), over-generalisation ("everyone knows"). REFERENCE & COHESION: flag ambiguous pronouns (this/it/they with unclear antecedent), repetitive referencing, missing cohesive ties. DIALECT: identify the variety and flag inconsistency (e.g. colour and color in one essay); consistency matters, not the choice itself. Each note is one concise bullet quoting the exact phrase from the essay. Give 2-4 notes per group; use an empty array if nothing meaningful.
BILINGUAL RULES: English is the primary feedback language - academic but accessible (readable at CEFR B2). Vietnamese "vi" is a concise natural rendering for Vietnamese students - translate meaning, never word-by-word; keep IELTS terminology in English (Task Response, cohesive device, band).
CALIBRATION (examiner method). Score each of the four criteria as a WHOLE band (4, 5, 6, 7, 8 or 9) - never a .5 on a criterion; only the overall may end in .5, and it is derived below. Start every criterion at band 6. Move UP only when you can quote evidence that clearly meets the higher descriptor; move DOWN only when you can quote systematic evidence of the lower one. Use the full range: an essay that genuinely meets band 8 or 9 descriptors must receive 8 or 9, and a genuinely weak one 4 or below - do not drift every score toward 6. Judge against the official descriptors, not against other essays.
TASK 1 OVERVIEW: if there is no clear overview of the main trends or features (or it is only a restatement or buried in the conclusion), Task Achievement is at most band 5. Listing figures mechanically with no selection of key features also limits Task Achievement to band 5.
WORD COUNT: do not apply a blanket cap. Judge the content first, then deduct for length: slightly under the minimum (up to about 10% under: Task 2 225-249 words, Task 1 135-149 words) costs about 1 band on Task Achievement; clearly short costs more; a script far under the minimum (Task 2 under 200 words, Task 1 under 120 words) cannot develop the task and rarely exceeds band 5. Off-topic or a misunderstood prompt -> Task Achievement max 4. Memorised or template-heavy essays -> Lexical Resource max 6.
COHESION AND LEXIS: for Coherence and Cohesion, check referencing and substitution (it, this, they, the former, such, one) - correct, varied use supports band 7+; mechanical linkers (Firstly/Moreover/In conclusion at every paragraph), repeated referencing of the same noun, or unclear pronouns hold it at 6 or below. For Lexical Resource, repetition of the same words, reliance on basic words (good, bad, big, thing, people, very), and informal items hold it at 6 or below; accurate less-common items, collocation and natural idiom support 7+; contractions and informal register are penalised.
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

export interface GradedEssay { result: any; band: number | null }

/** Chấm MỘT bài (chỉ văn bản, không ảnh). Ném Error có message tiếng Việt khi lỗi. */
export async function gradeEssayText(o: { taskType: 1 | 2; taskPrompt: string; essayText: string }): Promise<GradedEssay> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY chưa được cấu hình.');
  const instruction = `IELTS Task ${o.taskType}\n\nTask Prompt:\n${o.taskPrompt}\n\nStudent Essay:\n${o.essayText}`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: EVAL_MODEL, max_tokens: 12000, temperature: 0.2, system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: [{ type: 'text', text: instruction }] }] }),
  });
  const raw = await res.text();
  if (!res.ok) { console.error(`[grade-essay] Anthropic ${res.status}:`, raw); throw new Error(friendlyApiError(res.status, raw)); }
  let data: any; try { data = JSON.parse(raw); } catch { throw new Error('Lỗi kết nối AI. Vui lòng thử lại.'); }
  const text = data.content?.map((b: any) => b.text || '').join('') ?? '';
  let result: any; try { result = JSON.parse(text.replace(/```json|```/g, '').trim()); }
  catch { throw new Error('AI trả về định dạng không hợp lệ.'); }
  // Điểm tổng suy ra từ 4 tiêu chí — cùng quy tắc với /api/evaluate.
  const derived = officialOverall([result.task_achievement?.band, result.coherence_cohesion?.band,
    result.lexical_resource?.band, result.grammatical_range?.band]);
  if (derived != null) {
    const claimed = typeof result.overall_band === 'number' ? result.overall_band : null;
    if (claimed == null || Math.abs(claimed - derived) > 0.5) result.overall_band = derived;
  }
  return { result, band: typeof result.overall_band === 'number' ? result.overall_band : derived };
}
