import { createAdminSupabase } from '@/lib/supabase-admin';
import { MAX_IMAGE_BYTES, normaliseImages, runGrading } from '@/lib/grading';

/** Tối đa số bài đang chờ/đang chấm của một người — chặn xếp hàng vô hạn (tốn tiền AI). */
export const MAX_PENDING_PER_USER = 10;
/** Số lần thử tối đa cho một bài (lỗi tạm thời như quá tải được thử lại). */
export const MAX_ATTEMPTS = 3;
/** Hàm chấm chạy tối đa 300 giây; quá mốc này mà vẫn 'running' thì coi là đã chết và cho chạy lại. */
export const STALE_RUNNING_MS = 6 * 60 * 1000;
/** Bài 'queued' quá lâu mà chưa ai nhận (tiến trình nền bị cắt) thì cho chạy lại. */
export const STALE_QUEUED_MS = 30 * 1000;
const RETRY_DELAY_MS = 45 * 1000;

const RETRYABLE_CODES = new Set(['AI_UNAVAILABLE', 'AI_TIMEOUT']);

/**
 * Nhận (claim) rồi chấm một bài trong hàng đợi. An toàn khi gọi trùng: chỉ một lời gọi nhận được
 * bài nhờ cập nhật có điều kiện trạng thái. Không bao giờ ném lỗi ra ngoài (chạy trong after()).
 */
export async function processJob(jobId: string): Promise<void> {
  let admin: ReturnType<typeof createAdminSupabase>;
  try { admin = createAdminSupabase(); } catch (e: any) { console.error('[grading-jobs] thiếu service role:', e?.message); return; }

  try {
    const { data: job } = await admin.from('grading_jobs').select('*').eq('id', jobId).maybeSingle();
    if (!job) return;
    const now = Date.now();
    const claimable = (job.status === 'queued' && new Date(job.run_after).getTime() <= now)
      || (job.status === 'running' && job.started_at && now - new Date(job.started_at).getTime() > STALE_RUNNING_MS);
    if (!claimable) return;

    if ((job.attempts ?? 0) >= MAX_ATTEMPTS) {
      await admin.from('grading_jobs').update({
        status: 'failed', finished_at: new Date().toISOString(),
        error: job.error || 'Không chấm được bài này sau nhiều lần thử. Vui lòng bấm "Chấm lại".', error_code: job.error_code || 'MAX_ATTEMPTS',
      }).eq('id', jobId).eq('status', job.status);
      return;
    }

    // Nhận bài: chỉ thành công nếu trạng thái chưa bị ai đổi (điều kiện status + attempts).
    const { data: claimed } = await admin.from('grading_jobs').update({
      status: 'running', started_at: new Date().toISOString(), attempts: (job.attempts ?? 0) + 1, error: null, error_code: null,
    }).eq('id', jobId).eq('status', job.status).eq('attempts', job.attempts ?? 0).select('id').maybeSingle();
    if (!claimed) return;

    const p = (job.payload || {}) as any;
    const imgList = normaliseImages(p.images);
    if (imgList.some(im => Math.ceil((im.data.length * 3) / 4) > MAX_IMAGE_BYTES)) {
      await admin.from('grading_jobs').update({ status: 'failed', finished_at: new Date().toISOString(), error: 'Ảnh quá lớn (trên 5 MB).', error_code: 'IMAGE_TOO_LARGE' }).eq('id', jobId);
      return;
    }

    const { data: u } = await admin.auth.admin.getUserById(job.user_id);
    const user = { id: job.user_id, user_metadata: u?.user?.user_metadata ?? {} };

    // Lượt miễn phí do LMS cấp: xác định lại tại thời điểm chấm (cờ có thể đã đổi từ lúc xếp hàng).
    const { data: prof } = await admin.from('profiles').select('free_full_credits').eq('id', job.user_id).maybeSingle();
    const usingFreeCredit = ((prof as any)?.free_full_credits ?? 0) > 0;

    const r = await runGrading({
      supabase: admin, user,
      taskType: p.taskType ?? job.task_type, taskPrompt: p.taskPrompt ?? null, essayText: p.essayText ?? null,
      imgList, usingFreeCredit,
    });

    if (r.status === 200) {
      await admin.from('grading_jobs').update({
        status: 'done', evaluation_id: r.evaluationId ?? null, payload: {}, finished_at: new Date().toISOString(), error: null, error_code: null,
      }).eq('id', jobId);
      return;
    }

    const code: string | undefined = r.body?.code;
    const message: string = r.body?.error || 'Không chấm được bài này.';
    const retryable = (code && RETRYABLE_CODES.has(code)) || r.status === 502;
    const attempts = (job.attempts ?? 0) + 1;
    if (retryable && attempts < MAX_ATTEMPTS) {
      await admin.from('grading_jobs').update({
        status: 'queued', run_after: new Date(Date.now() + RETRY_DELAY_MS).toISOString(), error: message, error_code: code ?? null,
      }).eq('id', jobId);
    } else {
      // Giữ payload để học viên bấm "Chấm lại" mà không phải dán lại bài.
      await admin.from('grading_jobs').update({ status: 'failed', finished_at: new Date().toISOString(), error: message, error_code: code ?? null }).eq('id', jobId);
    }
  } catch (e: any) {
    console.error('[grading-jobs] lỗi bất ngờ khi chấm job', jobId, e?.message || e);
    try {
      await admin.from('grading_jobs').update({ status: 'queued', run_after: new Date(Date.now() + RETRY_DELAY_MS).toISOString(), error: 'Lỗi hệ thống, đang thử lại.' }).eq('id', jobId).eq('status', 'running');
    } catch {}
  }
}
