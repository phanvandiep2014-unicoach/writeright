-- ════════════════════════════════════════════════════════════════
-- WriteRight + Precisely — Học viên ĐANG HỌC ở UNICOACH được gói
-- Standard (viết + nói) miễn phí, cho đến khi ngừng học.
-- Chạy MỘT LẦN trong Supabase SQL Editor (project "Writeright"),
-- SAU supabase-schema.sql, annual-billing.sql và precisely-duo.sql.
-- ════════════════════════════════════════════════════════════════
--
-- QUYẾT ĐỊNH CỦA PHAN (27/09/2026)
-- --------------------------------
-- Học viên nào còn đang học tại UNICOACH (students.status='active' phía
-- BMS) được dùng WriteRight VÀ Precisely ở mức gói Standard hàng tháng,
-- không thu phí, cho đến khi nghỉ học. Khác free-1-lượt (C3/lms-free-credit):
-- đây là quyền LIÊN TỤC, không phải một lượt chấm.
--
-- CƠ CHẾ
-- ------
-- BMS ký cờ `is_active_student` vào MỌI token SSO (server/free-credit.js
-- → activeFlags(), phía unicoach-bms). app/sso/route.ts của WriteRight đọc
-- cờ này mỗi lần học viên mở app từ LMS:
--   is_active_student=true  → set tier='standard' + speak_plan='speak',
--                              enrolled_override=true, không hạn dùng.
--   is_active_student=false → NẾU enrolled_override=true (nghĩa là quyền
--                              hiện tại là do cơ chế này cấp, KHÔNG phải
--                              khách tự trả tiền) → hạ về free. Khách trả
--                              tiền thật (enrolled_override=false) không
--                              bao giờ bị đụng tới bởi nhánh này.
--
-- Precisely KHÔNG cần sửa gì — nó luôn hỏi WriteRight qua GET
-- /api/entitlement (xem sql/precisely-duo.sql), nên override ở đây tự
-- động có hiệu lực cho cả hai app.
--
-- GIỚI HẠN CẦN BIẾT: việc hạ quyền chỉ xảy ra vào lần TIẾP THEO học viên
-- mở WriteRight/Precisely từ LMS sau khi status đổi. Học viên nghỉ học
-- và không mở app nữa thì bản ghi vẫn giữ tier/speak_plan cũ cho tới lúc
-- đó. Nếu cần chủ động thu hồi ngay khi nghỉ học (không phụ thuộc lần mở
-- app kế tiếp), cần thêm một job đồng bộ định kỳ — chưa làm trong đợt này.

alter table public.profiles
  add column if not exists enrolled_override boolean not null default false;

comment on column public.profiles.enrolled_override is
  'true = tier/speak_plan HIỆN TẠI là do UNICOACH LMS cấp vì học viên còn đang học (is_active_student), không phải khách trả tiền. app/sso/route.ts tự đặt/gỡ cờ này; api/entitlement/route.ts coi true là "không hết hạn" cho cả tier và speak_plan. Không bao giờ đụng vào khách có enrolled_override=false (khách trả tiền thật).';

-- Mã học viên phía LMS (payload.sub, vd "HV001"), ghi lại ở MỌI lần /sso — không chỉ
-- lần cấp/hạ quyền — để cron/sync-active-students đối chiếu được mà không phải gọi
-- Admin API lấy user_metadata cho từng dòng. Trước đó mã này chỉ nằm trong
-- auth.users.raw_user_meta_data (lms_student_code), không truy vấn hàng loạt được.
alter table public.profiles
  add column if not exists lms_student_code text;

create index if not exists profiles_lms_student_code_idx on public.profiles (lms_student_code);

comment on column public.profiles.lms_student_code is
  'Mã học viên phía UNICOACH LMS (vd "HV001"). Ghi ở app/sso/route.ts mỗi lần đăng nhập qua LMS. Dùng để cron/sync-active-students đối chiếu enrolled_override với danh sách học viên còn active — KHÔNG dùng để định danh đăng nhập (đó vẫn là email).';

-- ── Kiểm tra sau khi chạy ───────────────────────────────────────
-- select column_name, data_type, column_default from information_schema.columns
--  where table_name='profiles' and column_name='enrolled_override';
--
-- Xem ai đang được cấp qua cơ chế này:
-- select email, tier, speak_plan, enrolled_override
--   from public.profiles where enrolled_override = true;
