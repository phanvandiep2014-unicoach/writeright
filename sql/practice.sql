-- ════════════════════════════════════════════════════════════════
-- WriteRight — Luyện tập: kết quả bài tập kỹ năng nhỏ
-- Chạy MỘT LẦN trong Supabase SQL Editor, sau supabase-schema.sql.
-- ════════════════════════════════════════════════════════════════
--
-- CHỈ THÊM, KHÔNG SỬA GÌ ĐANG CÓ. Không đụng vào profiles, evaluations hay
-- view user_entitlements (đang phục vụ học viên thật).
--
-- Đề luyện tập Task 1/Task 2 nằm trong code (lib/writing-tasks.ts) và bài
-- viết luyện tập chính là các dòng trong `evaluations` — nên phần đó không cần
-- bảng mới. Bảng dưới đây chỉ lưu kết quả bài tập nhỏ chấm tức thì (không AI)
-- để làm chuỗi ngày luyện và làm đầu vào cho gợi ý "bài tập hôm nay" sau này.
--
-- Nếu chưa chạy file này thì /practice/skills vẫn làm được bài, chỉ không lưu
-- được lịch sử (code bỏ qua lỗi ghi một cách im lặng).

create table if not exists public.exercise_results (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,

  -- Mã bài trong lib/skill-exercises.ts, ví dụ 'gra-01'.
  exercise_id text not null,
  kind text not null check (kind in ('grammar', 'paraphrase', 'linking', 'collocation', 'overview')),
  criterion text not null check (criterion in ('ta', 'cc', 'lr', 'gra')),

  chosen smallint not null,
  correct boolean not null,
  duration_ms integer,

  created_at timestamptz default now()
);

alter table public.exercise_results enable row level security;

create policy "Users can view own exercise results"
  on public.exercise_results for select using (auth.uid() = user_id);
create policy "Users can insert own exercise results"
  on public.exercise_results for insert with check (auth.uid() = user_id);

-- Truy vấn duy nhất mà app chạy: "kết quả của tôi, mới nhất trước".
create index if not exists idx_exercise_results_user_created
  on public.exercise_results (user_id, created_at desc);

-- ── Kiểm tra sau khi chạy ───────────────────────────────────────
-- select kind, count(*) filter (where correct) as dung, count(*) as tong
--   from public.exercise_results group by kind;
