-- ════════════════════════════════════════════════════════════════
-- WriteRight — Gói năm + hạn dùng gói (annual billing & expiry)
-- Chạy MỘT LẦN trong Supabase SQL Editor, SAU supabase-schema.sql
-- và sau sql/quota-enforcement.sql.
-- ════════════════════════════════════════════════════════════════
--
-- VẤN ĐỀ ĐANG CÓ TRÊN PRODUCTION
-- ------------------------------
-- `profiles.tier` được webhook đặt thành 'standard'/'premium' và
-- KHÔNG BAO GIỜ HẾT HẠN. Nghĩa là một lần trả 90.000đ đang cấp quyền
-- VĨNH VIỄN. Không có cột nào lưu ngày hết hạn, không có cron nào hạ
-- tier xuống, và view `user_entitlements` chỉ đọc `p.tier` trần.
--
-- Bán gói năm 790.000đ trên nền đó là vô nghĩa: gói tháng đã là trọn đời.
--
-- FILE NÀY LÀM GÌ
-- ---------------
--   1. profiles.tier_expires_at  — ngày hết hạn quyền
--   2. orders.billing_cycle      — 'monthly' | 'yearly'
--   3. user_entitlements         — tier hết hạn thì đọc thành 'free'
--
-- AN TOÀN VỚI KHÁCH CŨ
-- --------------------
-- `tier_expires_at` NULL nghĩa là KHÔNG hết hạn. Toàn bộ khách đã mua
-- trước hôm nay đều có giá trị NULL, nên họ giữ nguyên quyền trọn đời
-- đúng như những gì đã bán cho họ. Chỉ đơn hàng MỚI mới có ngày hết hạn.
-- Nếu sau này muốn áp hạn cho cả khách cũ thì phải thông báo trước, và
-- chạy một câu UPDATE riêng — file này cố ý không làm việc đó.


-- ── 1. Ngày hết hạn quyền ───────────────────────────────────────
alter table public.profiles
  add column if not exists tier_expires_at timestamptz;

comment on column public.profiles.tier_expires_at is
  'Thời điểm hết hạn quyền của tier hiện tại. NULL = không hết hạn (khách mua trước khi có tính năng hạn dùng).';


-- ── 2. Chu kỳ thanh toán của đơn hàng ───────────────────────────
alter table public.orders
  add column if not exists billing_cycle text not null default 'monthly';

-- Thêm ràng buộc riêng, chỉ khi chưa có (add constraint không hỗ trợ IF NOT EXISTS)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_billing_cycle_check'
  ) then
    alter table public.orders
      add constraint orders_billing_cycle_check
      check (billing_cycle in ('monthly', 'yearly'));
  end if;
end $$;

comment on column public.orders.billing_cycle is
  'monthly = cộng 30 ngày, yearly = cộng 365 ngày vào profiles.tier_expires_at khi thanh toán thành công.';


-- ── 3. View quyền lợi: hết hạn thì rơi về free ──────────────────
-- Giữ nguyên tên cột (user_id, plan, evals_this_week) để không phải
-- sửa hooks/useEntitlement.ts, app/api/evaluate/route.ts, dashboard...
-- Thêm hai cột mới, các nơi cũ không select thì không ảnh hưởng.
create or replace view public.user_entitlements
with (security_invoker = true) as
select
  p.id as user_id,
  case
    when p.tier_expires_at is not null and p.tier_expires_at < now() then 'free'
    else p.tier
  end as plan,
  p.tier_expires_at,
  (p.tier_expires_at is not null and p.tier_expires_at < now()) as is_expired,
  coalesce(e.evals_this_week, 0) as evals_this_week
from public.profiles p
left join (
  select
    user_id,
    count(*) as evals_this_week
  from public.evaluations
  where created_at >= now() - interval '7 days'
  group by user_id
) e on e.user_id = p.id;

grant select on public.user_entitlements to authenticated;


-- ── 4. Kiểm tra sau khi chạy ────────────────────────────────────
-- select column_name, data_type from information_schema.columns
--   where table_name = 'profiles' and column_name = 'tier_expires_at';
-- select column_name from information_schema.columns
--   where table_name = 'orders' and column_name = 'billing_cycle';
-- select * from public.user_entitlements limit 5;
