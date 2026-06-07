import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

const SYSTEM_PROMPT = `You are a highly experienced IELTS examiner with 20+ years of experience. Evaluate the essay and respond ONLY with valid JSON (no markdown, no code blocks). Use this structure:

{
  "overall_band": <number>,
  "band_descriptor": "<e.g. Competent User>",
  "headline": "<one sentence summary>",
  "summary": "<2-3 sentences>",
  "task_achievement": { "band": <number>, "feedback": "<2-3 sentences>", "improvements": ["<tip>", "<tip>"] },
  "lexical_resource": { "band": <number>, "feedback": "<2-3 sentences>", "improvements": ["<tip>", "<tip>"] },
  "grammatical_range": { "band": <number>, "feedback": "<2-3 sentences>", "improvements": ["<tip>", "<tip>"] },
  "coherence_cohesion": { "band": <number>, "feedback": "<2-3 sentences>", "improvements": ["<tip>", "<tip>"] },
  "key_strengths": ["<strength>", "<strength>", "<strength>"],
  "priority_fixes": ["<fix>", "<fix>", "<fix>"],
  "error_corrections": [
    {"original": "<exact error phrase>", "corrected": "<corrected>", "explanation": "<brief why>"}
  ],
  "model_introduction": "<Band 9 introduction for this prompt>"
}

Half bands (e.g. 6.5) are acceptable. Be honest and precise.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskType, taskPrompt, essayText, imageBase64, imageType } = body;

    if (!taskPrompt) {
      return NextResponse.json({ error: 'Task prompt is required' }, { status: 400 });
    }
    if (!essayText && !imageBase64) {
      return NextResponse.json({ error: 'Essay text or image is required' }, { status: 400 });
    }

    // ── Check auth & usage limits ──
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) {
            try { cookieStore.set({ name, value, ...options }); } catch (e) {}
          },
          remove(name: string, options: CookieOptions) {
            try { cookieStore.set({ name, value: '', ...options }); } catch (e) {}
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    const FREE_LIMIT = parseInt(process.env.FREE_TIER_LIMIT || '5');

    if (user) {
      // Check daily usage for free users
      const { data: profile } = await supabase.from('profiles').select('tier').eq('id', user.id).single();
      
      if (profile?.tier === 'free') {
        const today = new Date().toISOString().split('T')[0];
        const { count } = await supabase
          .from('evaluations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', `${today}T00:00:00Z`);

        if ((count || 0) >= FREE_LIMIT) {
          return NextResponse.json({
            error: `Bạn đã dùng hết ${FREE_LIMIT} lượt chấm miễn phí hôm nay. Nâng cấp Standard để chấm không giới hạn!`
          }, { status: 429 });
        }
      }
    }

    // ── Build Claude API request ──
    const userContent: any[] = [];

    if (imageBase64) {
      userContent.push({
        type: 'image',
        source: { type: 'base64', media_type: imageType || 'image/jpeg', data: imageBase64 },
      });
      userContent.push({
        type: 'text',
        text: `IELTS Task ${taskType || 2} Prompt:\n${taskPrompt}\n\nRead the essay in the image and evaluate it.`,
      });
    } else {
      userContent.push({
        type: 'text',
        text: `IELTS Task ${taskType || 2} Prompt:\n${taskPrompt}\n\nStudent Essay:\n${essayText}`,
      });
    }

    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
       model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!apiRes.ok) {
      const err = await apiRes.json();
      return NextResponse.json({ error: err.error?.message || 'AI evaluation failed' }, { status: 500 });
    }

    const data = await apiRes.json();
    const rawText = data.content.map((b: any) => b.text || '').join('');
    const clean = rawText.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    // ── Save to database ──
    if (user) {
      const wordCount = essayText ? essayText.trim().split(/\s+/).filter(Boolean).length : null;
      await supabase.from('evaluations').insert({
        user_id: user.id,
        task_type: taskType || 2,
        task_prompt: taskPrompt,
        essay_text: essayText || '[Image uploaded]',
        overall_band: result.overall_band,
        ta_band: result.task_achievement?.band,
        lr_band: result.lexical_resource?.band,
        gra_band: result.grammatical_range?.band,
        cc_band: result.coherence_cohesion?.band,
        feedback: result,
        model_intro: result.model_introduction,
        word_count: wordCount,
      });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
