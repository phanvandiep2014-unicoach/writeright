-- ════════════════════════════════════════════════════════════════
-- WriteRight — Chuỗi email nurture theo hành vi (Giai đoạn 2)
-- Chạy MỘT LẦN trong Supabase SQL Editor, SAU sql/streak-reminders.sql
-- (dùng lại bảng email_prefs và email_log).
-- ════════════════════════════════════════════════════════════════
--
-- Chỉ THÊM. Không sửa dữ liệu nào đang có.

-- ── 1. Đồng ý + hủy đăng ký riêng cho nurture ───────────────────
-- nurture_consent_at  : có giá trị = người dùng tự tích ô đồng ý nhận email tư vấn/hướng dẫn
-- nurture_optout_at   : có giá trị = đã bấm hủy, không gửi nữa (thắng consent)
alter table public.email_prefs add column if not exists nurture_consent_at     timestamptz;
alter table public.email_prefs add column if not exists nurture_consent_source text;
alter table public.email_prefs add column if not exists nurture_optout_at      timestamptz;

-- ── 2. Ứng viên nhận nurture ────────────────────────────────────
-- Chỉ trả người ĐÃ đồng ý, CHƯA hủy, tạo tài khoản trong 10 ngày gần đây (cần cho mốc
-- 24h/3 ngày/7 ngày) HOẶC đã có bài chấm trong 14 ngày (cần cho email gợi ý khóa).
-- Loại học viên đang học (enrolled_override = true): họ không phải khách để bán khóa.
-- Việc chọn email nào (d1/d3/d7/results) làm ở code để dễ kiểm thử.
-- Chỉ service role được gọi (trả về email của người khác).
create or replace function public.users_due_for_nurture(max_rows int default 300)
returns table (
  user_id uuid, email text, full_name text, tier text,
  signup_at timestamptz, essays_count bigint,
  last_band numeric, first_eval_at timestamptz, last_eval_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select p.id, u.email::text, p.full_name, p.tier, p.created_at,
         count(e.id) as essays_count,
         (array_agg(e.overall_band order by e.created_at desc))[1] as last_band,
         min(e.created_at) as first_eval_at,
         max(e.created_at) as last_eval_at
    from public.profiles p
    join auth.users u on u.id = p.id
    join public.email_prefs ep on ep.user_id = p.id
    left join public.evaluations e on e.user_id = p.id
   where u.email is not null
     and ep.nurture_consent_at is not null
     and ep.nurture_optout_at is null
     and coalesce(p.enrolled_override, false) = false
   group by p.id, u.email, p.full_name, p.tier, p.created_at
  having p.created_at > now() - interval '10 days'
      or max(e.created_at) > now() - interval '14 days'
   order by p.created_at desc
   limit max_rows;
$$;

revoke all on function public.users_due_for_nurture(int) from public, anon, authenticated;

-- ── 3. Kiểm tra sau khi chạy ────────────────────────────────────
--   select * from public.users_due_for_nurture();          -- rỗng cho tới khi có người đồng ý
--   select kind, count(*) from public.email_log where kind like 'nurture_%' group by 1;
--   select * from public.email_prefs where nurture_optout_at is not null;
