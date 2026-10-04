-- ════════════════════════════════════════════════════════════════
-- WriteRight — (1) Hạn dùng tính từ bài chấm đầu tiên  (2) Vá lỗ hổng tự nâng gói
-- Chạy MỘT LẦN trong Supabase SQL Editor (project "Writeright"),
-- SAU KHI code của PR này đã deploy xong trên Vercel.
-- ════════════════════════════════════════════════════════════════

-- ── 1. Hai cột cho kỳ chờ kích hoạt (lib/activation.ts) ─────────────
-- tier_pending_days = số ngày của gói CHƯA bắt đầu đếm (null = đã chạy / khách cũ)
-- tier_activated_at = lúc bài chấm đầu tiên chốt lại hạn dùng
-- Chỉ THÊM cột, không sửa dữ liệu: khách hiện có giữ nguyên hạn đang có.
alter table public.profiles add column if not exists tier_pending_days integer;
alter table public.profiles add column if not exists tier_activated_at timestamptz;

-- ── 2. ⚠️ VÁ LỖ HỔNG: người dùng tự nâng gói / tự thành admin ───────
-- Kiểm tra 04/10/2026: bản vá trong sql/precisely-duo.sql (mục 3) CHƯA được áp
-- trên production — role "authenticated" vẫn UPDATE được tier, tier_expires_at,
-- role, enrolled_override... Với anon key công khai trong trình duyệt, bất kỳ ai
-- đăng nhập đều chạy được  supabase.from('profiles').update({ tier: 'premium' }).
-- (Đã rà: chưa ai lợi dụng.)
--
-- Phải chạy SAU khi deploy: trước PR này, /api/evaluate trừ lượt miễn phí bằng
-- client của học viên — khoá cột trước khi deploy thì lượt miễn phí không bị trừ.
-- Sau PR này mọi chỗ ghi cột quyền lợi đều dùng service role (webhook, SSO, cron,
-- evaluate), trình duyệt chỉ cần sửa tên + ảnh.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, avatar_url, updated_at) on public.profiles to authenticated;

-- ── 3. Kiểm tra sau khi chạy ───────────────────────────────────────
-- Phải ra đúng: avatar_url,full_name,updated_at
--   select string_agg(column_name, ',' order by column_name)
--     from information_schema.column_privileges
--    where table_schema='public' and table_name='profiles'
--      and grantee='authenticated' and privilege_type='UPDATE';
-- Phải ra 2 dòng:
--   select column_name from information_schema.columns
--    where table_name='profiles' and column_name in ('tier_pending_days','tier_activated_at');

-- ── Hoàn tác (chỉ khi thật cần) ────────────────────────────────────
--   grant update on public.profiles to authenticated;   -- mở lại lỗ hổng!
--   alter table public.profiles drop column tier_pending_days, drop column tier_activated_at;
