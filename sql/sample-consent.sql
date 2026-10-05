-- ------------------------------------------------------------------
-- WriteRight - Đồng ý dùng bài viết (đã ẩn danh) làm bài mẫu công khai
-- Chạy MỘT LẦN trong Supabase SQL Editor, SAU sql/nurture.sql
-- (dùng lại bảng email_prefs).
-- ------------------------------------------------------------------
--
-- Chỉ THÊM. Không sửa dữ liệu nào đang có.
-- sample_consent_at có giá trị = người dùng đã tự tích đồng ý (ô không tick sẵn).
-- Để rút lại: đặt lại về null. Mọi bài đăng công khai vẫn phải qua người duyệt.

alter table public.email_prefs add column if not exists sample_consent_at     timestamptz;
alter table public.email_prefs add column if not exists sample_consent_source text;

-- Kiểm tra:
--   select count(*) filter (where sample_consent_at is not null) as da_dong_y, count(*) as tong from public.email_prefs;
