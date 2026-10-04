import { NextResponse } from 'next/server';
import { verifyLmsRequest } from '@/lib/lms-server-auth';
import { TEST_PAPERS } from '@/lib/writing-papers';
import { TASK1_BANK, TASK2_BANK, task1ToText } from '@/lib/writing-tasks';

// LMS hỏi nội dung một đề ghép sẵn (P01–P18) để dựng phòng thi Writing trong LMS.
// POST {"paper":"P06"} → { paper, task1 (dữ liệu biểu đồ), task2 }.
export async function POST(req: Request) {
  const raw = await req.text();
  const bad = verifyLmsRequest(req, raw);
  if (bad) return NextResponse.json({ error: bad }, { status: 401 });

  let body: any; try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Body không phải JSON' }, { status: 400 }); }
  const paper = TEST_PAPERS.find(p => p.id === String(body.paper || '').toUpperCase());
  if (!paper) return NextResponse.json({ error: 'Không có đề ' + body.paper, papers: TEST_PAPERS.map(p => p.id) }, { status: 404 });
  const t1 = TASK1_BANK.find(t => t.id === paper.task1Id);
  const t2 = TASK2_BANK.find(t => t.id === paper.task2Id);
  if (!t1 || !t2) return NextResponse.json({ error: 'Đề tham chiếu tới bài không tồn tại' }, { status: 500 });
  return NextResponse.json({
    paper: { id: paper.id, level: paper.level, focus: paper.focus },
    task1: { ...t1, text: task1ToText(t1) },
    task2: t2,
  });
}
