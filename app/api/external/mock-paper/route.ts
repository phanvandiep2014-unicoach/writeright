import { NextResponse } from 'next/server';
import { verifyLmsRequest } from '@/lib/lms-server-auth';
import { TEST_PAPERS } from '@/lib/writing-papers';
import { task1ToText } from '@/lib/writing-tasks';
import { resolvePaper } from '@/lib/weekly-papers';

// LMS hỏi nội dung một đề ghép sẵn (P01–P18) để dựng phòng thi Writing trong LMS.
// POST {"paper":"P06"} → { paper, task1 (dữ liệu biểu đồ), task2 }.
export async function POST(req: Request) {
  const raw = await req.text();
  const bad = verifyLmsRequest(req, raw);
  if (bad) return NextResponse.json({ error: bad }, { status: 401 });

  let body: any; try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Body không phải JSON' }, { status: 400 }); }
  const found = resolvePaper(body.paper);
  if (!found) return NextResponse.json({ error: 'Không có đề ' + body.paper, papers: TEST_PAPERS.map(p => p.id) }, { status: 404 });
  const { paper, t1, t2 } = found;
  return NextResponse.json({
    paper,
    task1: { ...t1, text: task1ToText(t1) },
    task2: t2,
  });
}
