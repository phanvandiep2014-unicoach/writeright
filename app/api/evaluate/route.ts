import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

const SYSTEM_PROMPT = `You are a highly experienced IELTS examiner (20+ years) and an applied linguist. Evaluate the essay and respond ONLY with valid JSON (no markdown, no code blocks). Every field marked {en, vi} is an object with an English string ("en") and a Vietnamese string ("vi"). Use this structure:
{
"overall_band": 6.5,
"band_descriptor": "Competent User",
"headline": {"en": "one sentence summary", "vi": "..."},
"summary": {"en": "2-3 sentences", "vi": "..."},
"task_achievement": { "band": 6.5, "feedback": {"en": "2-3 sentences", "vi": "..."}, "improvements": [{"en": "tip 1", "vi": "..."}, {"en": "tip 2", "vi": "..."}] },
"coherence_cohesion": { "band": 6.5, "feedback": {"en": "...", "vi": "..."}, "improvements": [{"en": "...", "vi": "..."}] },
"lexical_resource": { "band": 6.5, "feedback": {"en": "...", "vi": "..."}, "improvements": [{"en": "...", "vi": "..."}] },
"grammatical_range": { "band": 6.5, "feedback": {"en": "...", "vi": "..."}, "improvements": [{"en": "...", "vi": "..."}] },
"key_strengths": [{"en": "strength", "vi": "..."}],
"priority_fixes": [{"en": "fix", "vi": "..."}],
"error_corrections": [{"original": "exact phrase from essay", "corrected": "fixed version", "category": "grammar|vocabulary|register|tone|reference|dialect|spelling", "explanation": {"en": "why - one concise sentence", "vi": "..."}}],
"language_insights": {
"register": {"rating": "formal|mixed|informal", "notes": [{"en": "...", "vi": "..."}]},
"tone_nuance": {"notes": [{"en": "...", "vi": "..."}]},
"reference_cohesion": {"notes": [{"en": "...", "vi": "..."}]},
"dialect": {"variety": "British|American|Mixed|Neutral", "notes": [{"en": "...", "vi": "..."}]}
},
"model_introduction": "A Band 9 introduction paragraph for this prompt (English only)",
"model_rewrite": "The student's ENTIRE essay rewritten at Band 8.5-9.0 (English only). Preserve the student's own ideas, stance, examples and paragraph structure, but upgrade task response, cohesion, vocabulary and grammar. Keep a similar length to the original (within about 10%). Separate paragraphs with \\n\\n.",
"transcribed_essay": "ONLY when the essay was submitted as an image: transcribe the student's essay text exactly as written, preserving their errors, with \\n\\n between paragraphs. OMIT this field entirely when essay text was provided directly."
}
ERROR CORRECTIONS - CRITICAL FOR HIGHLIGHTING: each "original" MUST be an exact, character-for-character quote copied verbatim from the student's essay (identical spelling, casing and punctuation) so the app can locate and colour-highlight it inside the essay text. Never paraphrase, never merge two separate errors into one item. Keep each quote short (2-8 words around the error). Provide 6-14 items covering the most band-limiting errors, spread across the whole essay.
LANGUAGE INSIGHTS - analyse beyond surface grammar. REGISTER: flag informal items in academic context (e.g. "a lot of" -> "a considerable number of", "kids" -> "children", contractions). TONE & NUANCE: assess hedging and boosting ("will definitely" vs "is likely to"), connotation ("problem" vs "challenge"), over-generalisation ("everyone knows"). REFERENCE & COHESION: flag ambiguous pronouns (this/it/they with unclear antecedent), repetitive referencing, missing cohesive ties. DIALECT: identify the variety and flag inconsistency (e.g. colour and color in one essay); consistency matters, not the choice itself. Each note is one concise bullet quoting the exact phrase from the essay. Give 2-4 notes per group; use an empty array if nothing meaningful.
BILINGUAL RULES: English is the primary feedback language - academic but accessible (readable at CEFR B2). Vietnamese "vi" is a concise natural rendering for Vietnamese students - translate meaning, never word-by-word; keep IELTS terminology in English (Task Response, cohesive device, band).
CALIBRATION: Apply official IELTS band descriptors strictly. Never inflate scores; when between two bands choose the lower unless clear evidence supports the higher. HARD CAPS: under 250 words (Task 2) or 150 words (Task 1) -> Task Achievement max 5.0. Off-topic -> Task Achievement max 4.0. Memorised or template-heavy essays -> Lexical Resource max 6.0. Half bands are acceptable. Be honest and precise.`;

const FREE_EVALS_PER_WEEK = 1;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 4;
const ALLOWED_MEDIA = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function currentWeekStart() {
const now = new Date();
const day = now.getUTCDay();
const daysToMonday = day === 0 ? 6 : day - 1;
const monday = new Date(now);
monday.setUTCDate(now.getUTCDate() - daysToMonday);
return monday.toISOString().split('T')[0];
}

export async function POST(req: NextRequest) {
const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });

const supabase = createServerSupabase();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: 'Vui long dang nhap de cham bai.', code: 'AUTH_REQUIRED' }, { status: 401 });

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
return NextResponse.json({ error: 'Anh qua lon. Vui long chon anh nho hon 5 MB.' }, { status: 413 });

const weekStart = currentWeekStart();
const { data: entitlement, error: entErr } = await supabase.from('user_entitlements').select('plan, weekly_quota, evals_this_week').eq('user_id', user.id).single();

if (entErr) {
const { count } = await supabase.from('evaluations').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', weekStart + 'T00:00:00Z');
if ((count ?? 0) >= FREE_EVALS_PER_WEEK) return NextResponse.json({ error: 'Het luot mien phi tuan nay.', code: 'QUOTA_EXCEEDED' }, { status: 403 });
} else {
const isPaid = ['standard','premium'].includes(entitlement?.plan);
if (!isPaid && (entitlement?.evals_this_week ?? 0) >= (entitlement?.weekly_quota ?? FREE_EVALS_PER_WEEK))
return NextResponse.json({ error: 'Het luot mien phi tuan nay.', code: 'QUOTA_EXCEEDED' }, { status: 403 });
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
if (!apiRes.ok) return NextResponse.json({ error: `API Error (${apiRes.status}): ${responseText}` }, { status: apiRes.status });

let claudeData;
try { claudeData = JSON.parse(responseText); }
catch { return NextResponse.json({ error: 'Loi ket noi AI. Vui long thu lai.' }, { status: 502 }); }

const rawText = claudeData.content?.map((b: any) => b.text||'').join('') ?? '';
let result;
try { result = JSON.parse(rawText.replace(/```json|```/g,'').trim()); }
catch { return NextResponse.json({ error: 'AI tra ve dinh dang khong hop le.' }, { status: 502 }); }

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
