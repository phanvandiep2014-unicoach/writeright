import { NextResponse } from 'next/server';
import { verifyLmsRequest } from '@/lib/lms-server-auth';
import { rewriteEssayText } from '@/lib/grade-essay';
import { task1ToText } from '@/lib/writing-tasks';
import { resolvePaper } from '@/lib/weekly-papers';

export const maxDuration = 120;

const words = (s: string) => (s.trim().match(/\S+/g) || []).length;

/**
 * Phần "chậm" của chấm thi thử: bài viết lại band 8.5–9.0 + mở bài mẫu.
 * LMS gọi SAU khi đã có band, nên học viên không phải đợi; lỗi ở đây không ảnh hưởng điểm.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const bad = verifyLmsRequest(req, raw);
  if (bad) return NextResponse.json({ error: bad }, { status: 401 });
  let b: any; try { b = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Body không phải JSON' }, { status: 400 }); }
  const found = resolvePaper(b.paper);
  if (!found) return NextResponse.json({ error: 'Mã đề không hợp lệ' }, { status: 400 });
  const { t1, t2 } = found;
  const e1 = String(b.task1_essay || ''), e2 = String(b.task2_essay || '');
  const settle = async (p: Promise<any> | null) => { if (!p) return null; try { return await p; } catch (e) { console.error('[mock-rewrite]', e); return null; } };
  const [r1, r2] = await Promise.all([
    settle(words(e1) >= 20 ? rewriteEssayText({ taskType: 1, taskPrompt: task1ToText(t1), essayText: e1 }) : null),
    settle(words(e2) >= 20 ? rewriteEssayText({ taskType: 2, taskPrompt: t2.prompt, essayText: e2 }) : null),
  ]);
  return NextResponse.json({ task1: r1, task2: r2 });
}
