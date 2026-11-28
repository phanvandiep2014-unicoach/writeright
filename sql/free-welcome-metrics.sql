-- WriteRight — đo hiệu quả gói chào mừng (5 lượt đầy đủ / 14 ngày đầu, sau đó 2 lượt / 30 ngày).
-- CHỈ ĐỌC, không ghi gì. Chạy trong Supabase SQL Editor (project "Writeright").
-- Mỗi dòng = một tuần đăng ký (giờ VN). Tuần gần nhất còn đang chạy nên số sẽ tăng dần.
--
--   activated_48h   % tài khoản chấm bài đầu tiên trong 48 giờ sau khi đăng ký
--   used_all_welcome % tài khoản dùng hết 5 lượt chào mừng trong 14 ngày đầu
--   paid_30d        % tài khoản có đơn thanh toán thành công trong 30 ngày đầu
--
-- So sánh các tuần TRƯỚC và SAU ngày deploy để biết thay đổi có tác dụng không.
-- Đổi 5 / 14 ở dưới nếu đổi NEXT_PUBLIC_FREE_WELCOME_CREDITS / _DAYS trên Vercel.

with cohort as (
  select p.id, p.created_at,
         date_trunc('week', p.created_at at time zone 'Asia/Ho_Chi_Minh')::date as signup_week
    from public.profiles p
   where p.created_at > now() - interval '120 days'
),
ev as (
  select c.id,
         min(e.created_at) as first_eval_at,
         count(*) filter (where e.created_at < c.created_at + interval '14 days') as evals_14d
    from cohort c
    left join public.evaluations e on e.user_id = c.id
   group by c.id
),
paid as (
  select c.id, bool_or(o.id is not null) as paid_30d
    from cohort c
    left join public.orders o
      on o.user_id = c.id
     and o.status = 'paid'
     and o.created_at < c.created_at + interval '30 days'
   group by c.id
)
select c.signup_week,
       count(*)                                                                          as signups,
       round(100.0 * count(*) filter (where ev.first_eval_at < c.created_at + interval '48 hours') / count(*), 1) as activated_48h_pct,
       round(100.0 * count(*) filter (where ev.evals_14d >= 5) / count(*), 1)            as used_all_welcome_pct,
       round(100.0 * count(*) filter (where paid.paid_30d) / count(*), 1)                as paid_30d_pct
  from cohort c
  join ev   on ev.id = c.id
  join paid on paid.id = c.id
 group by c.signup_week
 order by c.signup_week desc;
