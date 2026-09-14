-- ════════════════════════════════════════════════
-- WriteRight — Thi thử Writing trọn bài (Task 1 + Task 2)
-- Chạy MỘT LẦN trong Supabase SQL Editor, sau supabase-schema.sql.
-- ════════════════════════════════════════════════
--
-- Một hàng = một lượt thi. Hai bài viết vẫn nằm ở bảng `evaluations` như mọi
-- bài chấm khác (nên vẫn lên biểu đồ tiến bộ, vẫn đẩy về LMS); bảng này chỉ
-- giữ phần KHÔNG thuộc về bài lẻ nào: điểm tổng có trọng số, số liệu bấm giờ
-- và bản tổng hợp hai phần.

create table if not exists public.mock_tests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,

  -- Mã đề trong lib/writing-papers.ts, hoặc null khi bốc ngẫu nhiên.
  paper_id text,
  mode text not null default 'full' check (mode in ('full', 'task1', 'task2')),

  -- Trỏ sang bài chấm thật. on delete set null: xoá một bài chấm không được
  -- làm mất cả lượt thi.
  task1_eval_id uuid references public.evaluations on delete set null,
  task2_eval_id uuid references public.evaluations on delete set null,

  task1_band numeric(2,1),
  task2_band numeric(2,1),
  -- (Task 1 + 2 × Task 2) / 3, tính ở server chứ không để AI chọn.
  overall_band numeric(2,1),

  -- Số liệu bấm giờ thô + kết quả phân tích (lib/mock-timing.ts).
  timing jsonb,
  -- Bản tổng hợp hai phần do một lần gọi AI riêng sinh ra.
  report jsonb,
  -- Có giá trị khi đây là chặng Writing của bài thi thử 4 kỹ năng do LMS mở
  -- (xem BAN-GIAO-DOI-TAC.md phía LMS + app/api/mock-report/route.ts):
  -- {"ok": true} hoặc {"ok": false, "error": "..."}. Null cho luyện tập tự do.
  exam_sync jsonb,

  created_at timestamptz default now()
);

alter table public.mock_tests enable row level security;

create policy "Users can view own mock tests"
  on public.mock_tests for select using (auth.uid() = user_id);
create policy "Users can insert own mock tests"
  on public.mock_tests for insert with check (auth.uid() = user_id);
create policy "Users can update own mock tests"
  on public.mock_tests for update using (auth.uid() = user_id);

-- Truy vấn duy nhất mà app chạy: "các lượt thi của tôi, mới nhất trước".
create index if not exists idx_mock_tests_user_created
  on public.mock_tests (user_id, created_at desc);

-- Dùng cho gợi ý đề kế tiếp: "tôi đã làm những mã đề nào".
create index if not exists idx_mock_tests_user_paper
  on public.mock_tests (user_id, paper_id);
