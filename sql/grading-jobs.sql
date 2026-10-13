-- Hàng đợi chấm bài nền (WriteRight). Học viên dán nhiều bài liên tiếp, hệ thống chấm dưới nền
-- và kết quả hiện ở Dashboard (bảng `evaluations` như thường lệ) — mỗi dòng ở đây là một lượt xếp hàng.
--
-- CHỈ THÊM, KHÔNG SỬA GÌ ĐANG CÓ. Chạy một lần trong Supabase → SQL Editor.
-- Ghi/sửa chỉ qua service role (API server); trình duyệt chỉ ĐỌC được hàng của chính mình.

create table if not exists public.grading_jobs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users on delete cascade,
  status         text not null default 'queued' check (status in ('queued','running','done','failed')),
  task_type      smallint not null default 2,
  title          text,                                   -- đoạn đầu đề bài, để hiện trong danh sách
  payload        jsonb not null default '{}'::jsonb,     -- {taskType, taskPrompt, essayText, images[]} — xoá khi chấm xong
  evaluation_id  uuid references public.evaluations on delete set null,
  error          text,
  error_code     text,
  attempts       smallint not null default 0,
  run_after      timestamptz not null default now(),     -- thử lại sau lỗi tạm thời (quá tải, 429)
  created_at     timestamptz not null default now(),
  started_at     timestamptz,
  finished_at    timestamptz
);

create index if not exists idx_grading_jobs_user_created on public.grading_jobs (user_id, created_at desc);
create index if not exists idx_grading_jobs_pending on public.grading_jobs (status, run_after) where status in ('queued','running');

alter table public.grading_jobs enable row level security;

drop policy if exists "Users can view own grading jobs" on public.grading_jobs;
create policy "Users can view own grading jobs" on public.grading_jobs
  for select using (auth.uid() = user_id);
-- Không có policy insert/update/delete: chỉ service role (bỏ qua RLS) được ghi.
