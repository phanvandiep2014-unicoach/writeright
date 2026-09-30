-- ════════════════════════════════════════════════════════════════
-- WriteRight — Onboarding cho khách ĐÃ TRẢ TIỀN mà chưa chấm bài nào (Giai đoạn 2)
-- Chạy MỘT LẦN trong Supabase SQL Editor, SAU sql/nurture.sql.
-- Chỉ THÊM một hàm. Không sửa dữ liệu nào đang có.
-- ════════════════════════════════════════════════════════════════
-- Trả về người đang có gói standard/premium CÒN HẠN, 0 bài chấm, không phải học viên đang học
-- (enrolled_override), chưa bấm hủy email hướng dẫn. Kèm thời điểm đã gửi email onboard_paid_a
-- (theo kỳ gói: expires_on = ngày hết hạn gói) để code quyết định gửi email nhắc thứ hai.
create or replace function public.users_paid_unused(max_rows int default 200)
returns table (
  user_id uuid, email text, full_name text, tier text,
  tier_expires_at timestamptz, expires_on date, a_sent_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select p.id, u.email::text, p.full_name, p.tier, p.tier_expires_at,
         (p.tier_expires_at at time zone 'Asia/Ho_Chi_Minh')::date,
         (select min(l.sent_at) from public.email_log l
           where l.user_id = p.id and l.kind = 'onboard_paid_a'
             and l.expires_on = (p.tier_expires_at at time zone 'Asia/Ho_Chi_Minh')::date)
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.email_prefs ep on ep.user_id = p.id
   where p.tier in ('standard', 'premium')
     and p.tier_expires_at is not null and p.tier_expires_at > now()
     and u.email is not null
     and coalesce(p.enrolled_override, false) = false
     and ep.nurture_optout_at is null
     and not exists (select 1 from public.evaluations e where e.user_id = p.id)
   order by p.tier_expires_at
   limit max_rows;
$$;

revoke all on function public.users_paid_unused(int) from public, anon, authenticated;

--   select * from public.users_paid_unused();   -- danh sách người sẽ nhận (dùng để đọc trước khi bật)
