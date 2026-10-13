import { NextRequest, NextResponse, after } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { MAX_IMAGE_BYTES, evalAllowance, normaliseImages } from '@/lib/grading';
import { MAX_PENDING_PER_USER, STALE_QUEUED_MS, STALE_RUNNING_MS, processJob } from '@/lib/grading-jobs';

// Hàng đợi chấm nền: POST nhận bài và trả về NGAY (202); việc chấm chạy sau phản hồi bằng after()
// — mỗi bài một lần gọi hàm riêng nên nhiều bài chấm song song, mỗi bài có đủ maxDuration.
export const maxDuration = 300;

const LIST_COLS = 'id,status,task_type,title,evaluation_id,error,error_code,attempts,created_at,started_at,finished_at,run_after';

async function authed() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await authed();
  if (!user) return NextResponse.json({ error: 'Vui lòng đăng nhập để chấm bài.', code: 'AUTH_REQUIRED' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }
  const { taskType, taskPrompt, essayText, images } = body || {};
  const imgList = normaliseImages(images);
  const hasImages = imgList.length > 0;

  if ((!taskPrompt && !hasImages) || (!essayText && !hasImages))
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  for (const im of imgList)
    if (Math.ceil((im.data.length * 3) / 4) > MAX_IMAGE_BYTES)
      return NextResponse.json({ error: 'Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5 MB.' }, { status: 413 });

  let admin: ReturnType<typeof createAdminSupabase>;
  try { admin = createAdminSupabase(); } catch { return NextResponse.json({ error: 'Hệ thống chấm nền chưa được cấu hình.' }, { status: 500 }); }

  const { count: pending, error: cntErr } = await admin.from('grading_jobs').select('id', { count: 'exact', head: true })
    .eq('user_id', user.id).in('status', ['queued', 'running']);
  if (cntErr) {
    console.error('[queue] đếm job lỗi (đã chạy sql/grading-jobs.sql chưa?):', cntErr.message);
    return NextResponse.json({ error: 'Hàng đợi chấm nền chưa sẵn sàng. Vui lòng dùng "Chấm ngay" hoặc thử lại sau.', code: 'QUEUE_UNAVAILABLE' }, { status: 503 });
  }
  const pendingN = pending ?? 0;
  if (pendingN >= MAX_PENDING_PER_USER)
    return NextResponse.json({ error: `Đang có ${pendingN} bài chờ chấm. Hãy đợi một số bài xong rồi dán tiếp (tối đa ${MAX_PENDING_PER_USER} bài cùng lúc).`, code: 'QUEUE_FULL' }, { status: 429 });

  const allow = await evalAllowance(supabase, user.id, pendingN);
  if (!allow.ok) return NextResponse.json(allow.body, { status: allow.status });

  const tt = taskType === 1 ? 1 : 2;
  const title = String(taskPrompt || (hasImages ? 'Đề / bài viết trong ảnh' : 'Bài viết')).replace(/\s+/g, ' ').trim().slice(0, 90);
  const { data: job, error: insErr } = await admin.from('grading_jobs').insert({
    user_id: user.id, task_type: tt, title,
    payload: { taskType: tt, taskPrompt: taskPrompt || null, essayText: essayText || null, images: hasImages ? imgList : [] },
  }).select('id').single();
  if (insErr || !job) {
    console.error('[queue] không tạo được job:', insErr?.message);
    return NextResponse.json({ error: 'Không xếp hàng được bài này. Vui lòng thử lại.' }, { status: 500 });
  }

  after(() => processJob(job.id));
  return NextResponse.json({ jobId: job.id, ahead: pendingN, message: 'Đã xếp hàng chấm nền.' }, { status: 202 });
}

/** Danh sách bài chấm nền của chính mình. Đồng thời "đá" lại các bài bị kẹt (tiến trình nền bị cắt giữa chừng). */
export async function GET() {
  const { user } = await authed();
  if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED', code: 'AUTH_REQUIRED' }, { status: 401 });
  let admin: ReturnType<typeof createAdminSupabase>;
  try { admin = createAdminSupabase(); } catch { return NextResponse.json({ jobs: [] }); }

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data, error } = await admin.from('grading_jobs').select(LIST_COLS)
    .eq('user_id', user.id).gte('created_at', since).order('created_at', { ascending: false }).limit(30);
  if (error) return NextResponse.json({ jobs: [], unavailable: true });
  const jobs = data || [];

  const now = Date.now();
  const stuck = jobs.filter(j =>
    (j.status === 'queued' && new Date(j.run_after).getTime() <= now && now - new Date(j.created_at).getTime() > STALE_QUEUED_MS)
    || (j.status === 'running' && j.started_at && now - new Date(j.started_at).getTime() > STALE_RUNNING_MS),
  ).slice(0, 3);
  if (stuck.length) after(async () => { await Promise.all(stuck.map(j => processJob(j.id))); });

  return NextResponse.json({ jobs });
}

/** { id, action: 'retry' | 'dismiss' } — chấm lại bài lỗi, hoặc xoá bài khỏi danh sách. */
export async function PATCH(req: NextRequest) {
  const { user } = await authed();
  if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED', code: 'AUTH_REQUIRED' }, { status: 401 });
  let body: any; try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }
  const { id, action } = body || {};
  if (typeof id !== 'string' || !['retry', 'dismiss'].includes(action)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const admin = createAdminSupabase();

  if (action === 'dismiss') {
    await admin.from('grading_jobs').delete().eq('id', id).eq('user_id', user.id).in('status', ['failed', 'done']);
    return NextResponse.json({ ok: true });
  }
  // retry: chỉ bài lỗi và còn payload; tính lại hạn mức (bài lỗi không tiêu lượt nên phải kiểm lại).
  const { data: job } = await admin.from('grading_jobs').select('id,status,payload').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!job || job.status !== 'failed') return NextResponse.json({ error: 'Bài này không thể chấm lại.' }, { status: 400 });
  const supabase = await createServerSupabase();
  const { count: pending } = await admin.from('grading_jobs').select('id', { count: 'exact', head: true }).eq('user_id', user.id).in('status', ['queued', 'running']);
  if ((pending ?? 0) >= MAX_PENDING_PER_USER) return NextResponse.json({ error: 'Đang có quá nhiều bài chờ chấm.', code: 'QUEUE_FULL' }, { status: 429 });
  const allow = await evalAllowance(supabase, user.id, pending ?? 0);
  if (!allow.ok) return NextResponse.json(allow.body, { status: allow.status });
  await admin.from('grading_jobs').update({ status: 'queued', attempts: 0, error: null, error_code: null, run_after: new Date().toISOString(), finished_at: null, created_at: new Date().toISOString() }).eq('id', id);
  after(() => processJob(id));
  return NextResponse.json({ ok: true }, { status: 202 });
}
