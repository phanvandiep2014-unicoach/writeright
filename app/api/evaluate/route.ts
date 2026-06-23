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

export async function POST(req: NextRequest) {
  const API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set in environment variables' }, { status: 500 });
  }

  // ── 1. Require login. Anonymous evaluations are not allowed — this is
  //    the actual enforcement point; the client-side QuotaBanner/DetailGate
  //    are UX only and were previously bypassable by calling this route directly.
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Vui lòng đăng nhập để chấm bài.', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }

  // ── 2. Check plan + rolling 7-day usage against the entitlements view.
  const { data: entitlement, error: entErr } = await supabase
    .from('user_entitlements')
    .select('plan, evals_this_week')
    .eq('user_id', user.id)
    .single();

  if (entErr) {
    return NextResponse.json({ error: 'Không thể kiểm tra hạn mức. Vui lòng thử lại.' }, { status: 500 });
  }

  const plan = entitlement?.plan ?? 'free';
  const usedThisWeek = entitlement?.evals_this_week ?? 0;
  const isPaid = plan === 'standard' || plan === 'premium';

  if (!isPaid && usedThisWeek >= FREE_EVALS_PER_WEEK) {
    return NextResponse.json(
      {
        error: 'Bạn đã dùng hết lượt chấm miễn phí tuần này. Nâng cấp để chấm không giới hạn.',
        code: 'QUOTA_EXCEEDED',
      },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { taskType, taskPrompt, essayText, imageBase64, imageType } = body;

    if (!taskPrompt || (!essayText && !imageBase64)) {
      return NextResponse.json({ error: 'Please provide both a task prompt and essay' }, { status: 400 });
    }

    const userContent: any[] = [];
    if (imageBase64) {
      userContent.push({ type: 'image', source: { type: 'base64', media_type: imageType || 'image/jpeg', data: imageBase64 } });
      userContent.push({ type: 'text', text: `IELTS Task ${taskType || 2} Prompt:\n${taskPrompt}\n\nRead the essay in the image and evaluate it.` });
    } else {
      userContent.push({ type: 'text', text: `IELTS Task ${taskType || 2} Prompt:\n${taskPrompt}\n\nStudent Essay:\n${essayText}` });
    }

    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    const responseText = await apiRes.text();

    if (!apiRes.ok) {
      return NextResponse.json({
        error: `API Error (${apiRes.status}): ${responseText}`
      }, { status: apiRes.status });
    }

    const data = JSON.parse(responseText);
    const rawText = data.content.map((b: any) => b.text || '').join('');
    const clean = rawText.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    // ── 3. Log this evaluation so the entitlements view can count it.
    //    Failure to log should not block the response the user already paid
    //    (in quota terms) to receive — log the error but still return result.
    const wordCount = essayText ? essayText.trim().split(/\s+/).filter(Boolean).length : null;
    const { error: insertErr } = await supabase.from('evaluations').insert({
      user_id: user.id,
      task_type: taskType || 2,
      task_prompt: taskPrompt,
      essay_text: essayText || null,
      overall_band: result.overall_band ?? null,
      ta_band: result.task_achievement?.band ?? null,
      lr_band: result.lexical_resource?.band ?? null,
      gra_band: result.grammatical_range?.band ?? null,
      cc_band: result.coherence_cohesion?.band ?? null,
      feedback: result,
      model_intro: result.model_introduction ?? null,
      word_count: wordCount,
    });
    if (insertErr) {
      console.error('Failed to log evaluation for quota tracking:', insertErr.message);
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
}
