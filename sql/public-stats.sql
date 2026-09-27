-- ══════════════════════════════════════════════════════════════
-- WriteRight — Thống kê công khai cho trang chủ
-- Chạy MỘT LẦN trong Supabase SQL Editor.
--
-- Nguyên tắc: hàm này chỉ trả về SỐ TỔNG HỢP. Không trả về
-- user_id, email, nội dung bài viết hay bất kỳ dữ liệu cá nhân nào.
-- Vì vậy để SECURITY DEFINER là an toàn — nhưng API vẫn gọi bằng
-- service-role key, KHÔNG cấp quyền cho anon (xem cuối file).
-- ══════════════════════════════════════════════════════════════

create or replace function public.wr_public_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with base as (
  select
    id, user_id, overall_band, ta_band, lr_band, gra_band, cc_band,
    word_count, feedback, created_at,
    row_number() over (partition by user_id order by created_at) as nth
  from public.evaluations
  where overall_band is not null
),

-- ── 1. Con số tổng ───────────────────────────────────────────
totals as (
  select
    count(*)::int                                   as essays_total,
    count(distinct user_id)::int                    as learners_total,
    coalesce(sum(word_count), 0)::bigint            as words_total,
    count(*) filter (
      where created_at >= now() - interval '30 days'
    )::int                                          as essays_30d,
    count(distinct user_id) filter (
      where created_at >= now() - interval '30 days'
    )::int                                          as learners_30d,
    max(created_at)                                 as last_eval_at
  from base
),

-- ── 2. Số lỗi cụ thể đã chỉ ra ───────────────────────────────
-- Đây là con số mạnh nhất khi lượng bài còn ít: mỗi bài sinh ra
-- 6–14 chỗ sửa, nên nó lớn hơn số bài khoảng một bậc.
corrections as (
  select jsonb_array_elements(b.feedback -> 'error_corrections') as item
  from base b
  where jsonb_typeof(b.feedback -> 'error_corrections') = 'array'
),
corrections_total as (
  select count(*)::bigint as n from corrections
),

-- ── 3. Lỗi thường gặp nhất (theo nhóm) ───────────────────────
top_errors as (
  select
    coalesce(nullif(trim(item ->> 'category'), ''), 'khác') as category,
    count(*)::int as n
  from corrections
  group by 1
  order by n desc
  limit 8
),

-- ── 4. Lượt chấm theo tuần (12 tuần gần nhất) ────────────────
weeks as (
  select generate_series(
    date_trunc('week', now() - interval '11 weeks'),
    date_trunc('week', now()),
    interval '1 week'
  ) as week_start
),
weekly as (
  select
    w.week_start::date as week_start,
    count(b.id)::int   as essays,
    count(distinct b.user_id)::int as learners
  from weeks w
  left join base b
    on date_trunc('week', b.created_at) = w.week_start
  group by w.week_start
  order by w.week_start
),

-- ── 5. Điểm trung bình theo LẦN CHẤM THỨ N ───────────────────
-- Đường cong tiến bộ thật: bài đầu tiên của mọi người so với
-- bài thứ hai, thứ ba... Chỉ lấy mốc có đủ mẫu.
progress_curve as (
  select
    nth::int                                as nth,
    round(avg(overall_band)::numeric, 2)    as avg_band,
    count(*)::int                           as n
  from base
  where nth <= 10
  group by nth
  having count(*) >= 5
  order by nth
),

-- ── 6. Mức tiến bộ của từng người (bài đầu → bài mới nhất) ───
per_user as (
  select
    user_id,
    count(*)::int as n_essays,
    (array_agg(overall_band order by created_at))[1]                          as first_band,
    (array_agg(overall_band order by created_at desc))[1]                     as last_band
  from base
  group by user_id
),
improvement as (
  select
    count(*)::int as n_users,
    round(avg(last_band - first_band)::numeric, 2)                            as avg_delta,
    round((percentile_cont(0.5) within group (order by last_band - first_band))::numeric, 2) as median_delta,
    round(
      100.0 * count(*) filter (where last_band > first_band) / nullif(count(*), 0),
      0
    )::int as pct_improved
  from per_user
  where n_essays >= 3
),

-- ── 7. Điểm trung bình 4 tiêu chí ────────────────────────────
criteria as (
  select
    round(avg(ta_band)::numeric, 2)  as task_achievement,
    round(avg(cc_band)::numeric, 2)  as coherence_cohesion,
    round(avg(lr_band)::numeric, 2)  as lexical_resource,
    round(avg(gra_band)::numeric, 2) as grammatical_range,
    count(*)::int as n
  from base
  where ta_band is not null and cc_band is not null
    and lr_band is not null and gra_band is not null
),

-- ── 8b. Thời gian nâng band trung bình, theo TỪNG GIAI ĐOẠN ──
-- "Giai đoạn" = mốc band 0.5 (giống bucket bên dưới). Với mỗi học viên,
-- tìm thời điểm họ LẦN ĐẦU chạm một mốc, rồi thời điểm họ LẦN ĐẦU chạm
-- một mốc cao hơn bất kỳ — hiệu hai thời điểm đó là thời gian đã mất để
-- "vượt giai đoạn" này. Không suy diễn NGUYÊN NHÂN, chỉ đo THỜI GIAN thật
-- giữa hai lần chấm có thật của cùng một người.
stage_first_hit as (
  select
    user_id,
    case
      when overall_band < 5.0 then 0
      when overall_band < 5.5 then 1
      when overall_band < 6.0 then 2
      when overall_band < 6.5 then 3
      when overall_band < 7.0 then 4
      when overall_band < 7.5 then 5
      else 6
    end as stage,
    min(created_at) as first_at
  from base
  group by 1, 2
),
stage_advance as (
  select
    a.user_id, a.stage as from_stage, a.first_at as from_at,
    min(b.first_at) as to_at
  from stage_first_hit a
  join stage_first_hit b
    on b.user_id = a.user_id and b.stage > a.stage and b.first_at > a.first_at
  group by a.user_id, a.stage, a.first_at
),
stage_progress as (
  select
    from_stage,
    round(avg(extract(epoch from (to_at - from_at)) / 86400)::numeric, 1) as avg_days,
    round((percentile_cont(0.5) within group (
      order by extract(epoch from (to_at - from_at)) / 86400
    ))::numeric, 1) as median_days,
    count(*)::int as n
  from stage_advance
  group by from_stage
  having count(*) >= 3
  order by from_stage
),

-- ── 8. Phân bố band ──────────────────────────────────────────
bands as (
  select
    case
      when overall_band < 5.0 then '< 5.0'
      when overall_band < 5.5 then '5.0'
      when overall_band < 6.0 then '5.5'
      when overall_band < 6.5 then '6.0'
      when overall_band < 7.0 then '6.5'
      when overall_band < 7.5 then '7.0'
      else '7.5+'
    end as bucket,
    -- khoá sắp xếp riêng: xếp theo text thì '< 5.0' rơi xuống cuối
    case
      when overall_band < 5.0 then 0
      when overall_band < 5.5 then 1
      when overall_band < 6.0 then 2
      when overall_band < 6.5 then 3
      when overall_band < 7.0 then 4
      when overall_band < 7.5 then 5
      else 6
    end as sort_key,
    count(*)::int as n
  from base
  group by 1, 2
)

select jsonb_build_object(
  'generated_at',      now(),
  'essays_total',      (select essays_total   from totals),
  'essays_30d',        (select essays_30d     from totals),
  'learners_total',    (select learners_total from totals),
  'learners_30d',      (select learners_30d   from totals),
  'words_total',       (select words_total    from totals),
  'last_eval_at',      (select last_eval_at   from totals),
  'corrections_total', (select n from corrections_total),
  'top_errors',        coalesce((select jsonb_agg(jsonb_build_object('category', category, 'n', n)) from top_errors), '[]'::jsonb),
  'weekly',            coalesce((select jsonb_agg(jsonb_build_object('week_start', week_start, 'essays', essays, 'learners', learners)) from weekly), '[]'::jsonb),
  'progress_curve',    coalesce((select jsonb_agg(jsonb_build_object('nth', nth, 'avg_band', avg_band, 'n', n)) from progress_curve), '[]'::jsonb),
  'improvement',       coalesce((select to_jsonb(i) from improvement i), '{}'::jsonb),
  'criteria',          coalesce((select to_jsonb(c) from criteria c), '{}'::jsonb),
  'band_distribution', coalesce((select jsonb_agg(jsonb_build_object('bucket', bucket, 'n', n) order by sort_key) from bands), '[]'::jsonb),
  'stage_progress',    coalesce((select jsonb_agg(jsonb_build_object(
                          'fromStage', from_stage, 'avgDays', avg_days, 'medianDays', median_days, 'n', n
                        ) order by from_stage) from stage_progress), '[]'::jsonb)
);
$$;

-- Chỉ backend (service-role) được gọi. KHÔNG cấp cho anon/authenticated:
-- API /api/stats còn lọc thêm ngưỡng hiển thị trước khi trả ra trình duyệt.
revoke all on function public.wr_public_stats() from public, anon, authenticated;
grant execute on function public.wr_public_stats() to service_role;

-- Bảo PostgREST nạp lại lược đồ, nếu không .rpc() sẽ báo "function not found".
notify pgrst, 'reload schema';

-- Chỉ mục hỗ trợ (idx_evaluations_created_at đã có sẵn trong schema gốc)
create index if not exists idx_evaluations_user_created
  on public.evaluations (user_id, created_at);
