import { NextResponse } from 'next/server';
import { verifyLmsRequest } from '@/lib/lms-server-auth';
import { gradeEssayText } from '@/lib/grade-essay';
import { TEST_PAPERS } from '@/lib/writing-papers';
import { TASK1_BANK, TASK2_BANK, task1ToText } from '@/lib/writing-tasks';

export const maxDuration = 180;   // hai lượt chấm chạy song song, mỗi lượt có thể mất ~60–90 giây

const words = (s: string) => (s.trim().match(/\S+/g) || []).length;
const half = (avg: number) => { const f = avg - Math.floor(avg); return f < 0.25 ? Math.floor(avg) : f < 0.75 ? Math.floor(avg) + 0.5 : Math.floor(avg) + 1; };

/**
 * LMS gửi bài thi Writing đã nộp, WriteRight chấm CẢ HAI phần bằng cùng bộ tiêu chí
 * với /api/evaluate rồi trả band tổng có trọng số Task 2 = 2 × Task 1.
 * Đề (prompt) do WriteRight tự dựng từ mã đề — LMS chỉ gửi mã đề và bài viết,
 * nên không ai sửa được đề bài để lấy điểm cao.
 * Không tiêu hạn mức chấm tuần của tài khoản WriteRight: học viên không đăng nhập ở đây.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const bad = verifyLmsRequest(req, raw);
  if (bad) return NextResponse.json({ error: bad }, { status: 401 });

  let b: any; try { b = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Body không phải JSON' }, { status: 400 }); }
  const paper = TEST_PAPERS.find(p => p.id === String(b.paper || '').toUpperCase());
  const t1 = paper && TASK1_BANK.find(t => t.id === paper.task1Id);
  const t2 = paper && TASK2_BANK.find(t => t.id === paper.task2Id);
  if (!paper || !t1 || !t2) return NextResponse.json({ error: 'Mã đề không hợp lệ' }, { status: 400 });

  const e1 = String(b.task1_essay || ''), e2 = String(b.task2_essay || '');
  const MIN = 20;   // dưới 20 từ coi như không làm bài — cùng ngưỡng với /mock, đỡ tốn lượt gọi AI

  try {
    const [g1, g2] = await Promise.all([
      words(e1) >= MIN ? gradeEssayText({ taskType: 1, taskPrompt: task1ToText(t1), essayText: e1 }) : null,
      words(e2) >= MIN ? gradeEssayText({ taskType: 2, taskPrompt: t2.prompt, essayText: e2 }) : null,
    ]);
    const b1 = g1?.band ?? 0, b2 = g2?.band ?? 0;
    const band = half((b1 + b2 * 2) / 3);

    const crit = (r: any) => r ? {
      t1: r.task_achievement?.band ?? null, cc: r.coherence_cohesion?.band ?? null,
      lr: r.lexical_resource?.band ?? null, gra: r.grammatical_range?.band ?? null } : {};
    const say = (r: any) => r?.headline?.vi || r?.summary?.vi || r?.headline?.en || '';
    const feedback = [
      g2 ? `Task 2 (band ${b2}): ${say(g2.result)}` : 'Task 2: chưa làm bài (dưới 20 từ) — tính band 0.',
      g1 ? `Task 1 (band ${b1}): ${say(g1.result)}` : 'Task 1: chưa làm bài (dưới 20 từ) — tính band 0.',
    ].join('\n');

    return NextResponse.json({
      band, task1_band: b1, task2_band: b2, feedback,
      detail: { task1: crit(g1?.result), task1_band: b1, task2: crit(g2?.result), task2_band: b2,
        words: { task1: words(e1), task2: words(e2) }, paper: paper.id },
      full: { task1: g1?.result ?? null, task2: g2?.result ?? null },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Không chấm được bài' }, { status: 502 });
  }
}
