import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

const SYSTEM_PROMPT = `You are a highly experienced IELTS examiner with 20+ years of experience. Evaluate the essay and respond ONLY with valid JSON (no markdown, no code blocks). Use this structure:
{
"overall_band": 6.5,
"band_descriptor": "Competent User",
"headline": "one sentence summary",
"summary": "2-3 sentences",
"task_achievement": { "band": 6.5, "feedback": "2-3 sentences", "improvements": ["tip 1", "tip 2"] },
"lexical_resource": { "band": 6.5, "feedback": "2-3 sentences", "improvements": ["tip 1", "tip 2"] },
"grammatical_range": { "band": 6.5, "feedback": "2-3 sentences", "improvements": ["tip 1", "tip 2"] },
"coherence_cohesion": { "band": 6.5, "feedback": "2-3 sentences", "improvements": ["tip 1", "tip 2"] },
"key_strengths": ["strength 1", "strength 2", "strength 3"],
"priority_fixes": ["fix 1", "fix 2", "fix 3"],
"error_corrections": [{"original": "error phrase", "corrected": "fixed", "explanation": "why"}],
"model_introduction": "A Band 9 introduction paragraph for this prompt"
}
Half bands are acceptable. Be honest and precise.`;

const FREE_EVALS_PER_WEEK = 1;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function currentWeekStart() {
  const now = new Date();
  const day = now.getUTCDay();
  const daysToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysToMonday);
  return monday.toISOString().split('T')[0];
}

export async function POST(req) {
  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });

  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Vui long dang nhap de cham bai.', code: 'AUTH_REQUIRED' }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

  const { taskType, taskPrompt, essayText, imageBase64, imageType } = body;
  if (!taskPrompt || (!essayText && !imageBase64)) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

  if (imageBase64 && Math.ceil((imageBase64.length * 3) / 4) > MAX_IMAGE_BYTES)
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
    const userContent = imageBase64
      ? [{ type:'image', source:{ type:'base64', media_type: imageType||'image/jpeg', data: imageBase64 } }, { type:'text', text:`IELTS Task ${taskType||2} Prompt:\n${taskPrompt}\n\nRead the essay in the image and evaluate it.` }]
      : [{ type:'text', text:`IELTS Task ${taskType||2} Prompt:\n${taskPrompt}\n\nStudent Essay:\n${essayText}` }];

    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key': API_KEY, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:2500, system: SYSTEM_PROMPT, messages:[{ role:'user', content: userContent }] }),
    });

    const responseText = await apiRes.text();
    if (!apiRes.ok) return NextResponse.json({ error: `API Error (${apiRes.status}): ${responseText}` }, { status: apiRes.status });

    let claudeData;
    try { claudeData = JSON.parse(responseText); }
    catch { return NextResponse.json({ error: 'Loi ket noi AI. Vui long thu lai.' }, { status: 502 }); }

    const rawText = claudeData.content?.map(b => b.text||'').join('') ?? '';
    let result;
    try { result = JSON.parse(rawText.replace(/```json|```/g,'').trim()); }
    catch { return NextResponse.json({ error: 'AI tra ve dinh dang khong hop le.' }, { status: 502 }); }

    const wordCount = essayText ? essayText.trim().split(/\s+/).filter(Boolean).length : null;
    const { error: insertErr } = await supabase.from('evaluations').insert({
      user_id: user.id, task_type: taskType||2, task_prompt: taskPrompt, essay_text: essayText||null,
      overall_band: result.overall_band??null, ta_band: result.task_achievement?.band??null,
      lr_band: result.lexical_resource?.band??null, gra_band: result.grammatical_range?.band??null,
      cc_band: result.coherence_cohesion?.band??null, feedback: result,
      model_intro: result.model_introduction??null, word_count: wordCount,
    });
    if (insertErr) console.error('Failed to log evaluation:', insertErr.message);

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
}
