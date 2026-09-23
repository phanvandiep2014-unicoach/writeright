-- ════════════════════════════════════════════════════════════════════
-- Precisely + UNICOACH Duo — bán gói nói qua cổng thanh toán WriteRight
-- 23/09/2026 · chạy MỘT lần trong Supabase SQL Editor (project "Writeright")
-- An toàn khi chạy lại: mọi lệnh đều IF NOT EXISTS / kiểm tra trước.
-- ════════════════════════════════════════════════════════════════════
--
-- VÌ SAO WRITERIGHT LÀ NƠI THU TIỀN CHO CẢ PRECISELY
-- ------------------------------------------------
-- WriteRight đã có PayOS + webhook + hạn dùng chạy thật từ 08/2026. Dựng
-- cổng thứ hai trong Precisely là hai nơi giữ tiền, hai nơi lệch nhau.
-- Nên: WriteRight giữ quyền lợi của CẢ HAI app; Precisely chỉ HỎI
-- (GET /api/entitlement, có khoá bí mật) xem email này đang ở gói nói nào.
--
-- Quyền viết (tier) và quyền nói (speak_plan) là HAI trục độc lập:
--   tier        free | standard | premium        — hạn: tier_expires_at
--   speak_plan  free | speak | speak_plus        — hạn: speak_expires_at
-- Gói Duo = đặt cả hai trục trong cùng một đơn.

-- ── 1. Quyền nói trên profiles ─────────────────────────────────────
alter table public.profiles
  add column if not exists speak_plan text not null default 'free',
  add column if not exists speak_expires_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_speak_plan_check') then
    alter table public.profiles
      add constraint profiles_speak_plan_check
      check (speak_plan in ('free', 'speak', 'speak_plus'));
  end if;
end $$;

-- ── 2. Đơn hàng biết mình bán gì ───────────────────────────────────
-- orders.tier có thể NULL từ nay: đơn chỉ mua Precisely không đổi quyền viết.
alter table public.orders alter column tier drop not null;

alter table public.orders
  add column if not exists plan_code  text,   -- mã gói trong PLANS (checkout/route.ts)
  add column if not exists speak_plan text;   -- NULL = đơn không chứa phần nói

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_speak_plan_check') then
    alter table public.orders
      add constraint orders_speak_plan_check
      check (speak_plan is null or speak_plan in ('speak', 'speak_plus'));
  end if;
end $$;

create index if not exists profiles_email_lower_idx on public.profiles (lower(email));

-- ── 3. ⚠️ VÁ LỖ HỔNG: người dùng tự nâng gói cho mình ─────────────
-- supabase-schema.sql có policy "Users can update own profile" cho CẢ
-- BẢNG. Với anon key công khai trong trình duyệt, bất kỳ ai đăng nhập đều
-- chạy được:  supabase.from('profiles').update({ tier: 'premium' })
-- → dùng Premium miễn phí, và từ nay cả speak_plan. Khoá lại ở mức CỘT:
-- người dùng chỉ được sửa tên + ảnh; mọi cột quyền lợi chỉ service role
-- (webhook, SSO) mới ghi được. Code WriteRight hiện KHÔNG có chỗ nào để
-- trình duyệt tự update profiles (đã rà 23/09/2026) nên không vỡ gì.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, avatar_url, updated_at) on public.profiles to authenticated;

-- ── 4. Kiểm tra sau khi chạy ───────────────────────────────────────
-- select column_name from information_schema.columns
--   where table_name='profiles' and column_name in ('speak_plan','speak_expires_at');
-- select column_name from information_schema.columns
--   where table_name='orders' and column_name in ('plan_code','speak_plan');
-- select privilege_type, column_name from information_schema.column_privileges
--   where table_name='profiles' and grantee='authenticated' and privilege_type='UPDATE';
--   → chỉ còn full_name, avatar_url, updated_at
