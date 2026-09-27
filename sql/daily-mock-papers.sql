-- ════════════════════════════════════════════════
-- WriteRight — Đề thi chung theo ngày (thi thử IELTS hàng tháng tại trung tâm)
-- Chạy MỘT LẦN trong Supabase SQL Editor, sau supabase-schema.sql +
-- sql/mock-tests.sql. CHƯA CHẠY tính đến 27/09/2026.
-- ════════════════════════════════════════════════
--
-- Vì sao thêm bảng riêng thay vì ghép vào TEST_PAPERS trong code: giáo viên
-- cần tự upload đề cho buổi thi thử tháng — mỗi tháng một đề mới, đẩy qua
-- Supabase, không phải sửa code + deploy lại mỗi lần. `/mock` (khi vào bằng
-- SSO thi thử của LMS, hoặc luyện tập tự do) tự dò xem HÔM NAY có đề chung
-- hay không (theo giờ Việt Nam), có thì mọi học viên dùng chung đúng một đề.
--
-- `task1` lưu nguyên cấu trúc Task1Item (lib/writing-tasks.ts) dưới dạng
-- jsonb — dùng lại được toàn bộ pipeline vẽ SVG + chuyển chữ cho AI chấm,
-- không cần code riêng cho đề giáo viên upload.

create table if not exists public.mock_daily_papers (
  id uuid default gen_random_uuid() primary key,
  -- Một ngày chỉ có MỘT đề chung — upload đè lên (upsert theo exam_date) nếu
  -- giáo viên cần sửa đề trong ngày trước khi nhiều học viên bắt đầu thi.
  exam_date date not null unique,
  title text,
  task1 jsonb not null,
  task2_prompt text not null,
  task2_type text not null default 'opinion'
    check (task2_type in ('opinion', 'discussion', 'problem-solution', 'adv-disadv', 'two-part')),
  created_by uuid references auth.users on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.mock_daily_papers enable row level security;

-- Học viên đã đăng nhập cần đọc được để vào thi — không giới hạn theo user_id
-- vì đây là đề DÙNG CHUNG, khác hẳn logic "chỉ xem của chính mình" ở mock_tests.
create policy "Người dùng đã đăng nhập xem được đề thi chung"
  on public.mock_daily_papers for select
  using (auth.uid() is not null);

-- Chỉ giáo viên/quản trị (profiles.role — cùng bảng role đang dùng cho
-- /admin BMS) mới được tạo/sửa/xoá đề.
create policy "Giáo viên và quản trị quản lý đề thi chung"
  on public.mock_daily_papers for all
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'teacher')
  ))
  with check (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'teacher')
  ));

create index if not exists idx_mock_daily_papers_date on public.mock_daily_papers (exam_date desc);

-- ────────────────────────────────────────────────
-- Đề đầu tiên: buổi thi thử 27/09/2026, lấy từ bộ đề "IELTS LANGGO" Phan gửi
-- (Task 1: quy trình làm mứt trái cây · Task 2: quan điểm về mạng xã hội).
-- Chạy insert này SAU khi đã tạo bảng ở trên. An toàn chạy lại nhiều lần
-- (on conflict cập nhật đè, không tạo trùng).
-- ────────────────────────────────────────────────
insert into public.mock_daily_papers (exam_date, title, task1, task2_prompt, task2_type)
values (
  '2026-09-27',
  'Thi thử Writing 27/09/2026',
  '{
    "id": "daily-2026-09-27-t1",
    "category": "other",
    "chartType": "process",
    "title": "Quy trình làm mứt trái cây",
    "instruction": "The diagram shows how to make jam from the fruit. Summarize the information by selecting and reporting the main features and making comparisons where relevant. Write at least 150 words.",
    "steps": [
      "Rửa 4 kg trái cây dưới vòi nước chảy",
      "Nghiền nhuyễn trái cây bằng dụng cụ nghiền (masher)",
      "Cho trái cây đã nghiền vào nồi cùng 2 muỗng canh đậu phộng, 1 cốc nước và 1/4 cốc đường, khuấy bằng muôi (ladle)",
      "Đun ở nhiệt độ cao trong 10 phút",
      "Thêm 2 cốc đường và 4 cốc nước, tiếp tục đun ở nhiệt độ cao trong nửa giờ",
      "Rót hỗn hợp vào các hũ đựng khác nhau",
      "Đậy kín nắp các hũ và để yên trong một giờ",
      "Mứt thành phẩm được dùng cho bữa sáng gia đình"
    ],
    "notes": [
      "Số liệu nguyên liệu đúng như trong sơ đồ gốc: 4 kg trái cây; lần đun đầu 2 tbsp đậu phộng + 1 cốc nước + 1/4 cốc đường trong 10 phút; lần đun sau thêm 2 cốc đường + 4 cốc nước trong nửa giờ; ủ kín 1 giờ trước khi dùng."
    ]
  }'::jsonb,
  'Some people argue that social media has had a positive impact on society, while others believe that its influence has been mostly negative. To what extent do you agree or disagree with this statement? Support your opinion with examples and evidence.',
  'opinion'
)
on conflict (exam_date) do update set
  title = excluded.title,
  task1 = excluded.task1,
  task2_prompt = excluded.task2_prompt,
  task2_type = excluded.task2_type,
  updated_at = now();
