-- ════════════════════════════════════════════════════════════════
-- WriteRight — Email nhắc giữ chuỗi ngày luyện tập
-- Chạy MỘT LẦN trong Supabase SQL Editor, SAU sql/practice.sql
-- và sql/renewal-reminders.sql (dùng lại bảng email_log).
-- ════════════════════════════════════════════════════════════════
--
-- Chỉ THÊM. Không sửa bảng nào đang có.

-- ── 1. Tuỳ chọn nhận email (mặc định: nhận) ────────────────────
create table if not exists public.email_prefs (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  practice_reminders boolean not null default true,
  updated_at         timestamptz not null default now()
);
alter table public.email_prefs enable row level security;
-- Không tạo policy: chỉ service role (route /api/unsubscribe) đọc/ghi.

-- ── 2. Ai đang có nguy cơ mất chuỗi? ───────────────────────────
-- Trả về người CÓ hoạt động hôm qua và CHƯA có hôm nay (giờ Việt Nam), chưa từ chối
-- email, cùng danh sách ngày hoạt động 60 ngày gần nhất. Độ dài chuỗi tính ở code
-- (lib/practice-insights.ts: computeStreak) để dùng đúng một định nghĩa với trang Tiến độ.
-- Chỉ service role được gọi (trả về email của người khác).
create or replace function public.users_due_for_streak_reminder(max_rows int default 500)
returns table (user_id uuid, email text, full_name text, active_days date[])
language sql
security definer
set search_path = public, auth
as $$
  with today as (select (now() at time zone 'Asia/Ho_Chi_Minh')::date as d),
  act as (
    select e.user_id, (e.created_at at time zone 'Asia/Ho_Chi_Minh')::date as d
      from public.evaluations e where e.created_at > now() - interval '60 days'
    union
    select x.user_id, (x.created_at at time zone 'Asia/Ho_Chi_Minh')::date
      from public.exercise_results x where x.created_at > now() - interval '60 days'
  ),
  agg as (select a.user_id, array_agg(distinct a.d order by a.d) as days from act a group by a.user_id)
  select p.id, u.email::text, p.full_name, agg.days
    from agg
    join public.profiles p on p.id = agg.user_id
    join auth.users u on u.id = agg.user_id
   cross join today
   where u.email is not null
     and (today.d - 1) = any(agg.days)
     and not (today.d = any(agg.days))
     and not exists (select 1 from public.email_prefs ep
                      where ep.user_id = agg.user_id and ep.practice_reminders = false)
   limit max_rows;
$$;

revoke all on function public.users_due_for_streak_reminder(int) from public, anon, authenticated;

-- ── 3. Kiểm tra sau khi chạy ────────────────────────────────────
--   select user_id, array_length(active_days,1) from public.users_due_for_streak_reminder();
--   select kind, expires_on, count(*) from public.email_log where kind='streak' group by 1,2 order by 2 desc;
--   select * from public.email_prefs where practice_reminders = false;
