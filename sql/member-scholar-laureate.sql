-- ════════════════════════════════════════════════════════════════════
-- Gói hội viên Scholar / Laureate (WriteRight + Precisely + Pass tự học LMS)
-- 02/11/2026 · chạy một lần trong Supabase (project "Writeright"). Chạy lại an toàn.
-- Chỉ THÊM: không xoá cột, không đổi dữ liệu cũ. Khách gói cũ giữ nguyên đến hết hạn.
-- ════════════════════════════════════════════════════════════════════

-- 1. Hạng hội viên trên hồ sơ. NULL = khách gói cũ / học viên trung tâm → giữ hành vi cũ
--    (chấm Writing không giới hạn). 'scholar' = 15 bài / 30 ngày, 'laureate' = 30 bài / 30 ngày.
alter table public.profiles add column if not exists member_plan text;
alter table public.profiles drop constraint if exists profiles_member_plan_check;
alter table public.profiles add constraint profiles_member_plan_check
  check (member_plan is null or member_plan in ('scholar', 'laureate'));

-- 2. Đơn hàng ghi hạng hội viên + thời điểm đã mở Pass bên LMS (NULL = chưa mở được, cron thử lại).
alter table public.orders add column if not exists member_plan text;
alter table public.orders add column if not exists pass_granted_at timestamptz;
alter table public.orders drop constraint if exists orders_member_plan_check;
alter table public.orders add constraint orders_member_plan_check
  check (member_plan is null or member_plan in ('scholar', 'laureate'));

-- 3. Chu kỳ 3 tháng.
alter table public.orders drop constraint if exists orders_billing_cycle_check;
alter table public.orders add constraint orders_billing_cycle_check
  check (billing_cycle in ('monthly', 'quarterly', 'yearly'));

-- 4. Phút nói của hai hạng mới (Precisely đọc qua /api/entitlement).
alter table public.profiles drop constraint if exists profiles_speak_plan_check;
alter table public.profiles add constraint profiles_speak_plan_check
  check (speak_plan in ('free', 'speak', 'speak_plus', 'scholar', 'laureate'));
alter table public.orders drop constraint if exists orders_speak_plan_check;
alter table public.orders add constraint orders_speak_plan_check
  check (speak_plan is null or speak_plan in ('speak', 'speak_plus', 'scholar', 'laureate'));

-- 5. member_plan chỉ service role ghi (giống tier/speak_plan) — không cấp quyền update cho authenticated.
