/**
 * Tổng hợp một lượt Thi thử Writing thành MỘT báo cáo cho cả hai phần.
 *
 * Cách chia việc, cố ý:
 *   • Điểm tổng có trọng số  → tính bằng mã, không hỏi AI.
 *   • Nhận xét thời gian     → tính bằng luật (lib/mock-timing.ts), không hỏi AI.
 *   • Điểm 4 tiêu chí        → đã có sẵn từ hai lần gọi /api/evaluate.
 *   • Chỉ MỘT thứ hỏi AI     → những gì chỉ thấy được khi đặt hai bài cạnh
 *     nhau: lỗi lặp ở cả hai bài, mắt xích yếu nhất, và lộ trình luyện.
 *
 * Nhờ vậy lần gọi này rẻ (vài nghìn token, không sinh lại bài viết) và khi AI
 * hỏng thì học viên VẪN nhận được điểm tổng và toàn bộ phần thời gian.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabase } from '@/lib/supabase-server';
import { analyseTiming, weightedWritingBand, timingBrief, TaskTiming } from '@/lib/mock-timing';
import { pushBandToLms } from '@/lib/unicoach';

// Lần gọi này ngắn, nhưng vẫn phải nới trần mặc định — nếu không Vercel cắt
// hàm giữa chừng và học viên mất luôn báo cáo sau khi đã ngồi thi 60 phút.
export const maxDuration = 120;
export const runtime = 'nodejs';

const AI_TIMEOUT_MS = 60_000;

const SYSTEM_PROMPT = `You are an IELTS Writing coach reviewing a candidate's FULL mock test (Task 1 and Task 2 sat back to back). Both essays have ALREADY been marked by an examiner; the bands are given to you and are FINAL.

Your job is only what becomes visible when the two scripts are placed side by side. Respond ONLY with valid JSON, no markdown, no code fences.

HARD RULES:
- NEVER state, re-derive, dispute or invent a band score. The numbers you are given are settled. Refer to weaknesses by name, not by number.
- NEVER invent quotes. Every string in an "evidence" array must be copied verbatim from the extracts supplied to you, and must say which task it came from.
- A "cross-task pattern" must genuinely appear in BOTH scripts. If a weakness shows up in only one, it is not a pattern - leave it out. One honest pattern beats three padded ones.
- The timing facts are measured, not guessed. Use them; never contradict them.
- Vietnamese ("vi") is a natural rendering for a Vietnamese learner, never word-by-word. Keep IELTS terms in English (Task Response, cohesive device, band).

Return exactly this shape:
{
"cross_task_patterns": [{"pattern": {"en": "one sentence naming the habit", "vi": "..."}, "evidence": ["Task 1: \\"verbatim quote\\"", "Task 2: \\"verbatim quote\\""], "criterion": "TA|CC|LR|GRA", "fix": {"en": "one concrete thing to do differently", "vi": "..."}}],
"weakest_link": {"criterion": "TA|CC|LR|GRA", "why": {"en": "2-3 sentences on why this criterion is the one holding the overall score down across both tasks", "vi": "..."}},
"exam_strategy": [{"en": "one instruction for the next sitting, grounded in the measured timing facts", "vi": "..."}],
"study_plan": [{"days": "1-7", "focus": {"en": "...", "vi": "..."}, "drill": {"en": "a specific, repeatable exercise - not 'read more'", "vi": "..."}}],
"next_paper_focus": {"en": "one sentence: what to watch for in the next mock test", "vi": "..."}
}
LENGTH: 1-3 cross_task_patterns, 2-4 exam_strategy items, exactly 3 study_plan blocks (days "1-7", "8-14", "15-21").`;

/** Nén một bài chấm đầy đủ xuống còn phần dùng được cho việc đối chiếu hai bài. */
function digest(row: any): string {
  const f = row?.feedback ?? {};
  const cats: Record<string, number> = {};
  const samples: string[] = [];
  for (const e of Array.isArray(f.error_corrections) ? f.error_corrections : []) {
    const c = String(e?.category ?? 'other');
    cats[c] = (cats[c] ?? 0) + 1;
    if (samples.length < 8 && e?.original) samples.push(`"${e.original}" → "${e.corrected ?? ''}" (${c})`);
  }
  const pick = (arr: any, n: number) =>
    (Array.isArray(arr) ? arr : []).slice(0, n).map((x: any) => x?.en ?? String(x)).filter(Boolean);

  const lines = [
    `--- TASK ${row.task_type} ---`,
    `Prompt: ${String(row.task_prompt ?? '').slice(0, 300)}`,
    `Bands (FINAL): TA ${row.ta_band} · CC ${row.cc_band} · LR ${row.lr_band} · GRA ${row.gra_band} · overall ${row.overall_band}`,
    `Word count: ${row.word_count ?? 'unknown'}`,
  ];
  if (typeof f.sentence_count === 'number')
    lines.push(`Error-free sentences: ${f.error_free_sentence_count}/${f.sentence_count}`);
  if (Object.keys(cats).length)
    lines.push(`Error categories: ${Object.entries(cats).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  if (samples.length) lines.push(`Error extracts (verbatim, quote only from here):\n  ${samples.join('\n  ')}`);
  const pf = pick(f.priority_fixes, 4);
  if (pf.length) lines.push(`Examiner priority fixes: ${pf.join(' | ')}`);
  const ks = pick(f.key_strengths, 3);
  if (ks.length) lines.push(`Strengths: ${ks.join(' | ')}`);
  const reg = f.language_insights?.register?.rating;
  if (reg) lines.push(`Register: ${reg}`);
  const dia = f.language_insights?.dialect?.variety;
  if (dia) lines.push(`Dialect: ${dia}`);
  return lines.join('\n');
}

const num = (v: any, lo: number, hi: number, dflt = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt;
};

/**
 * Số liệu bấm giờ do trình duyệt gửi lên — không tin được, nhưng cũng không
 * nguy hiểm: nó chỉ đổi lời khuyên, không đổi điểm. Vẫn phải kẹp về khoảng
 * hợp lệ để một giá trị rác không làm hỏng phép chia hay in ra "-4 phút".
 */
function sanitiseTiming(raw: any): TaskTiming | null {
  const task = raw?.task === 1 ? 1 : raw?.task === 2 ? 2 : null;
  if (!task) return null;
  const allotted = task === 1 ? 20 * 60 : 40 * 60;
  const used = num(raw?.usedSec, 0, allotted, allotted);
  const samples = (Array.isArray(raw?.samples) ? raw.samples : [])
    .slice(0, 300)
    .map((s: any) => ({ t: num(s?.t, 0, allotted), words: num(s?.words, 0, 5000) }))
    .sort((a: any, b: any) => a.t - b.t);
  return {
    task,
    allottedSec: allotted,
    usedSec: used,
    autoSubmitted: raw?.autoSubmitted === true,
    firstKeystrokeSec: raw?.firstKeystrokeSec == null ? null : num(raw.firstKeystrokeSec, 0, used),
    lastKeystrokeSec: raw?.lastKeystrokeSec == null ? null : num(raw.lastKeystrokeSec, 0, used),
    wordCount: num(raw?.wordCount, 0, 5000),
    samples,
    pasteCount: num(raw?.pasteCount, 0, 999),
  };
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Vui lòng đăng nhập.', code: 'AUTH_REQUIRED' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const mode: 'full' | 'task1' | 'task2' =
    body?.mode === 'task1' || body?.mode === 'task2' ? body.mode : 'full';
  const paperId = typeof body?.paperId === 'string' ? body.paperId.slice(0, 16) : null;
  const timings = (Array.isArray(body?.timings) ? body.timings : [])
    .map(sanitiseTiming).filter(Boolean) as TaskTiming[];

  // Đọc lại hai bài chấm từ CSDL thay vì tin điểm do trình duyệt gửi lên.
  // RLS trên `evaluations` lo phần "có phải bài của bạn không" — id của người
  // khác trả về rỗng chứ không trả về dữ liệu.
  const ids = [body?.task1EvalId, body?.task2EvalId].filter(
    (x: any) => typeof x === 'string' && x.length > 0
  ) as string[];
  const { data: rows } = ids.length
    ? await supabase.from('evaluations')
        .select('id, task_type, task_prompt, overall_band, ta_band, cc_band, lr_band, gra_band, word_count, feedback')
        .in('id', ids)
    : { data: [] as any[] };

  const evals = rows ?? [];
  const e1 = evals.find(r => r.id === body?.task1EvalId) ?? null;
  const e2 = evals.find(r => r.id === body?.task2EvalId) ?? null;

  const task1Band = e1?.overall_band != null ? Number(e1.overall_band) : null;
  const task2Band = e2?.overall_band != null ? Number(e2.overall_band) : null;
  const overall = mode === 'full'
    ? weightedWritingBand(task1Band, task2Band)
    : (task1Band ?? task2Band);

  const timing = analyseTiming(timings, mode === 'full');

  // Chặng Writing của bài thi thử 4 kỹ năng: /sso đã đặt cookie httpOnly này
  // khi payload.mock_session có giá trị (xem BAN-GIAO-DOI-TAC.md phía LMS).
  // Đọc ở đây thay vì tin cờ do trình duyệt gửi lên — cookie httpOnly nên
  // JS phía học viên không đọc được, không sửa được.
  const mockSession = (await cookies()).get('uc_mock_session')?.value || null;
  let examSync: { ok: boolean; error?: string } | null = null;

  if (mockSession) {
    if (overall == null) {
      // Một trong hai phần chưa chấm được (hết hạn mức, lỗi AI…) — không có
      // gì để gửi. Nói rõ để học viên báo giáo viên nhập tay, đừng im lặng.
      examSync = { ok: false, error: 'Chưa có đủ điểm hai phần để tính band tổng.' };
    } else {
      const feedbackLine =
        `Task 1: band ${task1Band ?? '—'} · Task 2: band ${task2Band ?? '—'}` +
        (e2?.feedback?.priority_fixes?.[0]?.vi ? ` — ${e2.feedback.priority_fixes[0].vi}` : '');
      try {
        const r = await pushBandToLms(mockSession, 'writing', overall, feedbackLine.slice(0, 500), {
          task1: e1 ? { band: task1Band, ta: e1.ta_band, cc: e1.cc_band, lr: e1.lr_band, gra: e1.gra_band } : null,
          task2: e2 ? { band: task2Band, ta: e2.ta_band, cc: e2.cc_band, lr: e2.lr_band, gra: e2.gra_band } : null,
          overall,
        });
        examSync = { ok: true };
        void r; // duplicate/session_status chỉ để log, không đổi những gì học viên thấy
      } catch (e: any) {
        console.error('[mock-report] không đẩy được band về LMS:', e?.message);
        examSync = { ok: false, error: e?.message || 'Lỗi không rõ' };
      }
    }
  }

  // Từ đây trở xuống là phần "có thì tốt". Mọi lỗi đều rơi vào `report: null`
  // chứ không được làm hỏng cả phản hồi — học viên đã ngồi thi 60 phút.
  let report: any = null;
  let reportError: string | null = null;

  const canSynthesise = !!process.env.ANTHROPIC_API_KEY && (e1 || e2);
  if (canSynthesise) {
    try {
      const parts = [e1, e2].filter(Boolean).map(digest).join('\n\n');
      const userText =
        `${parts}\n\n--- MEASURED TIMING (facts, do not contradict) ---\n${timingBrief(timing)}\n\n` +
        `--- WEIGHTED RESULT ---\nOverall Writing band ${overall ?? 'n/a'} ` +
        `(Task 1 counts once, Task 2 counts twice).\n\n` +
        `Write the side-by-side report now.`;

      const ac = new AbortController();
      const kill = setTimeout(() => ac.abort(), AI_TIMEOUT_MS);
      const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: ac.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY as string,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 3000,
          temperature: 0.3,
          // Prompt hệ thống không đổi giữa các lượt thi → cache lại, chỉ trả
          // tiền đầy đủ cho lần đầu trong mỗi 5 phút.
          system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: userText }],
        }),
      }).finally(() => clearTimeout(kill));

      if (!apiRes.ok) {
        console.error('[mock-report] Anthropic', apiRes.status, (await apiRes.text()).slice(0, 500));
        reportError = 'Chưa tạo được phần tổng hợp hai bài. Điểm và phần thời gian bên dưới vẫn đầy đủ.';
      } else {
        const data = await apiRes.json();
        const raw = (data.content ?? []).map((b: any) => b.text ?? '').join('');
        report = JSON.parse(raw.replace(/```json|```/g, '').trim());
      }
    } catch (err: any) {
      console.error('[mock-report]', err?.name === 'AbortError' ? 'timeout' : err?.message);
      reportError = 'Phần tổng hợp hai bài mất quá nhiều thời gian. Điểm và phần thời gian bên dưới vẫn đầy đủ.';
    }
  }

  // Lưu lượt thi. Bảng chỉ có sau khi chạy sql/mock-tests.sql — chưa chạy thì
  // ghi log và trả kết quả như thường, không được chặn màn hình kết quả.
  let mockTestId: string | null = null;
  const { data: saved, error: saveErr } = await supabase.from('mock_tests').insert({
    user_id: user.id,
    paper_id: paperId,
    mode,
    task1_eval_id: e1?.id ?? null,
    task2_eval_id: e2?.id ?? null,
    task1_band: task1Band,
    task2_band: task2Band,
    overall_band: overall,
    timing: { raw: timings, analysis: timing },
    report,
    exam_sync: examSync,
  }).select('id').single();
  if (saveErr) console.error('[mock-report] không lưu được lượt thi:', saveErr.message);
  else mockTestId = saved?.id ?? null;

  const res = NextResponse.json({
    id: mockTestId,
    mode, paperId,
    task1Band, task2Band, overallBand: overall,
    timing,
    report,
    reportError,
    examSync,
  });

  // Đã thử gửi về LMS (thành công hay không) — xoá cookie khoá phòng thi để
  // học viên quay lại /mock sau này không bị tự động ép vào một phiên "ma".
  // Không cho làm lại được bảo vệ chính bởi LMS (idempotent theo mock_session,
  // xem ielts-mock.js#recordSkill) — cookie ở đây chỉ quyết định GIAO DIỆN có
  // khoá hay không, không phải hàng phòng thủ duy nhất.
  if (mockSession) {
    for (const name of ['uc_mock_session', 'uc_callback', 'uc_student', 'uc_minutes']) {
      res.cookies.set(name, '', { maxAge: 0, path: '/' });
    }
  }
  return res;
}
