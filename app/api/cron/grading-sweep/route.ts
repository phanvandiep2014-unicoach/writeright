import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { processJob } from '@/lib/grading-jobs';

/**
 * Cron hằng ngày: chấm các bài đang chờ trong hàng đợi đã tới giờ (run_after <= now) mà chưa ai nhận —
 * ví dụ bài bị xếp hàng lúc AI chạm hạn mức chi tiêu (lib/ai-budget.ts) và học viên chưa quay lại trang.
 * Chấm lần lượt, dừng trước khi hết maxDuration. processJob tự chống chấm trùng.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET chua duoc dat' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const t0 = Date.now();
  const { data: jobs, error } = await createAdminSupabase().from('grading_jobs')
    .select('id').eq('status', 'queued').lte('run_after', new Date().toISOString())
    .order('created_at', { ascending: true }).limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  let ran = 0;
  for (const j of jobs ?? []) {
    if (Date.now() - t0 > 170_000) break;   // một bài có thể mất ~100 giây
    await processJob(j.id);
    ran++;
  }
  return NextResponse.json({ waiting: jobs?.length ?? 0, ran });
}
