-- ════════════════════════════════════════════════════════════════
-- WriteRight — Lượt chấm đầy đủ MIỄN PHÍ cho học viên mới từ LMS (C3)
-- Chạy MỘT LẦN trong Supabase SQL Editor, SAU supabase-schema.sql.
-- ════════════════════════════════════════════════════════════════
--
-- VẤN ĐỀ
-- ------
-- UNICOACH BMS đã ký cờ `writing_free` vào token SSO cho học viên mới
-- (server/free-credit.js → freeFlags()). Nhưng app/sso/route.ts của
-- WriteRight chỉ đọc sub / lms_student_id / name — cờ bị BỎ QUA hoàn
-- toàn. Học viên mới mở WriteRight từ LMS vẫn đâm vào DetailGate mờ
-- như người lạ, tức là mất đúng khoảnh khắc quan trọng nhất của phễu.
--
-- FILE NÀY LÀM GÌ
-- ---------------
-- Thêm 3 cột vào `profiles`. KHÔNG đụng vào view `user_entitlements`
-- (view đó phải drop mới sửa được, và một lần drop hỏng là cả app mất
-- quyền) — code đọc thẳng từ `profiles`, vốn đã có RLS "xem hồ sơ của
-- chính mình".
--
--   free_full_credits     quyền chạy MỘT lượt chấm đầy đủ. LMS cấp qua SSO.
--   free_full_granted_at  mốc đã cấp — để mở WriteRight nhiều lần không
--                         được cấp thêm lượt (BMS chỉ hạ cờ writing_free
--                         sau khi điểm được đẩy về, nên giữa hai mốc đó
--                         token vẫn mang cờ true).
--   free_full_until       sau khi tiêu lượt, mở khoá phần chi tiết trong
--                         30 ngày. Nếu trừ lượt rồi khoá ngay thì học
--                         viên tải lại trang là mất luôn bài vừa chấm.


alter table public.profiles
  add column if not exists free_full_credits integer not null default 0;

alter table public.profiles
  add column if not exists free_full_granted_at timestamptz;

alter table public.profiles
  add column if not exists free_full_until timestamptz;

comment on column public.profiles.free_full_credits is
  'Số lượt chấm đầy đủ miễn phí còn lại. UNICOACH LMS cấp 1 lượt cho học viên mới qua cờ writing_free trong token SSO.';
comment on column public.profiles.free_full_granted_at is
  'Thời điểm đã cấp lượt miễn phí. Khác NULL = đã cấp rồi, không cấp lại dù token còn mang cờ.';
comment on column public.profiles.free_full_until is
  'Hạn xem phần phân tích chi tiết sau khi tiêu lượt miễn phí (mặc định 30 ngày).';


-- ── Kiểm tra sau khi chạy ───────────────────────────────────────
-- select column_name, data_type, column_default
--   from information_schema.columns
--  where table_name = 'profiles'
--    and column_name in ('free_full_credits','free_full_granted_at','free_full_until');
--
-- Xem ai đang có lượt / đang trong hạn mở khoá:
-- select email, tier, free_full_credits, free_full_granted_at, free_full_until
--   from public.profiles
--  where free_full_credits > 0 or free_full_until is not null;
