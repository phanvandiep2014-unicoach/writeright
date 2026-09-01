-- ════════════════════════════════════════════════════════════════
-- WriteRight — Email nhắc gia hạn tự động
-- Chạy MỘT LẦN trong Supabase SQL Editor, SAU sql/annual-billing.sql
--
-- Hệ thống không có auto-renew. Người dùng chỉ biết mình sắp mất quyền
-- nếu họ tự mở dashboard. File này + route /api/cron/renewal-reminders
-- là thứ chủ động đi tìm họ.
-- ════════════════════════════════════════════════════════════════


-- ── 1. Nhật ký email đã gửi ─────────────────────────────────────
-- Ràng buộc UNIQUE là thứ chống gửi trùng: cron chạy lại trong cùng
-- một ngày, hoặc Vercel gọi lặp, đều không tạo được bản ghi thứ hai.
create table if not exists public.email_log (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null,        -- 'renewal_7d' | 'renewal_1d'
  expires_on  date not null,        -- ngày hết hạn mà email này nói tới
  email_to    text,
  sent_at     timestamptz not null default now(),
  constraint email_log_once unique (user_id, kind, expires_on)
);

comment on table public.email_log is
  'Nhat ky email he thong da gui. UNIQUE(user_id, kind, expires_on) chong gui trung khi cron chay lai.';

create index if not exists email_log_sent_at_idx on public.email_log (sent_at desc);

alter table public.email_log enable row level security;
-- Khong tao policy nao: chi service role (bypass RLS) duoc doc/ghi.


-- ── 2. Hàm lấy danh sách cần nhắc ───────────────────────────────
-- Email nằm ở auth.users, không phải public.profiles — nên phải
-- SECURITY DEFINER mới đọc được. KHÔNG grant cho authenticated/anon:
-- hàm này trả về email của người khác, chỉ service role được gọi.
--
-- Mốc ngày tính theo giờ Việt Nam. Nếu so bằng UTC thì người hết hạn
-- lúc 7h sáng giờ VN sẽ bị tính lệch một ngày.
create or replace function public.users_due_for_renewal(days_ahead int)
returns table (
  user_id     uuid,
  email       text,
  full_name   text,
  tier        text,
  expires_on  date,
  expires_at  timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select
    p.id,
    u.email::text,
    p.full_name,
    p.tier,
    (p.tier_expires_at at time zone 'Asia/Ho_Chi_Minh')::date,
    p.tier_expires_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.tier in ('standard', 'premium')
    and p.tier_expires_at is not null
    and u.email is not null
    and (p.tier_expires_at at time zone 'Asia/Ho_Chi_Minh')::date
        = ((now() at time zone 'Asia/Ho_Chi_Minh')::date + days_ahead)
  order by p.tier_expires_at;
$$;

revoke all on function public.users_due_for_renewal(int) from public, anon, authenticated;


-- ── 3. Kiểm tra sau khi chạy ────────────────────────────────────
-- Ai sẽ được nhắc trong 7 ngày nữa (hôm nay chạy thì thấy nhóm 14/08):
--   select * from public.users_due_for_renewal(7);
--
-- Ai sắp hết hạn trong 10 ngày tới, gom theo ngày:
--   select (tier_expires_at at time zone 'Asia/Ho_Chi_Minh')::date as ngay,
--          count(*)
--     from public.profiles
--    where tier in ('standard','premium')
--      and tier_expires_at between now() and now() + interval '10 days'
--    group by 1 order by 1;
--
-- Đã gửi những gì:
--   select kind, expires_on, count(*), max(sent_at)
--     from public.email_log group by 1,2 order by 2 desc;
--
-- Gửi lại cho một người (xoá dòng log rồi chạy cron lại):
--   delete from public.email_log
--    where user_id = '<uuid>' and kind = 'renewal_7d';
