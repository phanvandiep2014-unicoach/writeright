import { NextResponse } from 'next/server';
import { verifyLmsRequest } from '@/lib/lms-server-auth';
import { extrasEssayText } from '@/lib/grade-essay';
import { task1ToText } from '@/lib/writing-tasks';
import { resolvePaper } from '@/lib/weekly-papers';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { BASE } from '@/lib/base-path';

export const maxDuration = 300;

const words = (s: string) => (s.trim().match(/\S+/g) || []).length;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Phần "chậm" của chấm thi thử, chạy SAU khi đã có band: phân tích ngôn ngữ, mở bài mẫu, bài viết lại band 8.5–9.0.
 * Trả về cho LMS (gộp vào result_json) và — nếu LMS gửi report_id — ghi bổ sung vào bản chấm đầy đủ trên WriteRight.
 * Lỗi ở đây không ảnh hưởng điểm.
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
    settle(words(e1) >= 20 ? extrasEssayText({ taskType: 1, taskPrompt: task1ToText(t1), essayText: e1 }) : null),
    settle(words(e2) >= 20 ? extrasEssayText({ taskType: 2, taskPrompt: t2.prompt, essayText: e2 }) : null),
  ]);

  let report_url: string | null = null;
  const rid = String(b.report_id || '');
  if (UUID.test(rid)) {
    try {
      const admin = createAdminSupabase();
      const { data: row } = await admin.from('lms_mock_reports').select('data').eq('id', rid).maybeSingle();
      if (row?.data) {
        const data: any = row.data;
        for (const [k, r] of [['task1', r1], ['task2', r2]] as const) {
          const t = data?.tasks?.[k];
          if (t?.result && r) {
            if (r.language_insights) t.result.language_insights = r.language_insights;
            if (r.model_introduction) t.result.model_introduction = r.model_introduction;
            if (r.model_rewrite) t.result.model_rewrite = r.model_rewrite;
          }
        }
        await admin.from('lms_mock_reports').update({ data, extras_ready: true, updated_at: new Date().toISOString() }).eq('id', rid);
        report_url = `${new URL(req.url).origin}${BASE}/lms-report/${rid}`;
      }
    } catch (e: any) { console.error('[mock-rewrite] cập nhật bản chấm đầy đủ:', e?.message); }
  }
  return NextResponse.json({ task1: r1, task2: r2, report_url });
}
