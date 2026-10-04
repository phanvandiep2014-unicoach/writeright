-- Đo tác động của prompt A1 lên band (CHỈ ĐỌC — chạy bao nhiêu lần cũng được).
-- Mốc gốc trước khi đổi (04/10/2026, 255 bài 02/07→01/10, prompt cũ):
--   band tổng TB 5.74 · TA 5.61 · CC 5.88 · LR 5.67 · GRA 5.74
-- So sánh công bằng nhất: chỉ những học viên có bài ở CẢ HAI phiên bản (khối thứ hai).
select coalesce(feedback->>'prompt_version', 'cu') as phien_ban, count(*) n,
       round(avg(overall_band)::numeric, 2) overall, round(avg(ta_band)::numeric, 2) ta,
       round(avg(cc_band)::numeric, 2) cc, round(avg(lr_band)::numeric, 2) lr, round(avg(gra_band)::numeric, 2) gra,
       sum(case when (feedback->>'borderline')::boolean then 1 else 0 end) sat_ranh_gioi
  from public.evaluations where overall_band is not null
 group by 1 order by 1;

with u as (
  select user_id from public.evaluations where overall_band is not null
   group by user_id
  having bool_or(feedback->>'prompt_version' = 'a1') and bool_or(feedback->>'prompt_version' is null)
)
select coalesce(e.feedback->>'prompt_version', 'cu') as phien_ban, count(distinct e.user_id) hoc_vien, count(*) n,
       round(avg(e.overall_band)::numeric, 2) overall
  from public.evaluations e join u using (user_id)
 where e.overall_band is not null
 group by 1 order by 1;
