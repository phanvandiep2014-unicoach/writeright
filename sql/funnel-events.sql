-- WriteRight - Do dau phieu (Giai doan 3): bang su kien nhe, KHONG luu IP, ten hay noi dung bai viet.
-- Chay MOT LAN trong Supabase SQL Editor (staging truoc, production sau). Chi THEM bang moi.
-- Chi service role ghi duoc (RLS bat, khong co policy cho anon/authenticated).
create table if not exists public.funnel_events (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  anon_id     text,                -- ma ngau nhien luu o trinh duyet, khong lien he ca nhan
  user_id     uuid,                -- co khi da dang nhap
  event       text not null,       -- page_view | evaluate_submit | auth_required | evaluate_done | signup
  path        text,
  utm_source  text,
  utm_medium  text,
  utm_campaign text,
  utm_content text,
  ref_host    text                 -- ten mien trang gioi thieu (neu co), khong luu duong dan day du
);
create index if not exists funnel_events_created_idx on public.funnel_events (created_at desc);
create index if not exists funnel_events_event_idx   on public.funnel_events (event, created_at desc);
create index if not exists funnel_events_anon_idx    on public.funnel_events (anon_id);
alter table public.funnel_events enable row level security;

-- Bao cao tuan: nguon -> xem trang cham -> bam nop -> gap tuong dang nhap -> cham xong -> dang ky.
-- (dem theo anon_id/user_id khac nhau de khong tinh trung)
-- security_invoker: view khong duoc vuot RLS cua bang goc (khong lo du lieu cho anon).
create or replace view public.funnel_weekly with (security_invoker = true) as
select date_trunc('week', created_at)::date as tuan,
       coalesce(nullif(utm_source,''), '(truc tiep)') as nguon,
       count(distinct anon_id) filter (where event = 'page_view' and path = '/evaluate')   as xem_trang_cham,
       count(distinct anon_id) filter (where event = 'evaluate_submit')                   as bam_nop,
       count(distinct anon_id) filter (where event = 'auth_required')                     as gap_tuong_dang_nhap,
       count(distinct coalesce(user_id::text, anon_id)) filter (where event = 'evaluate_done') as cham_xong,
       count(distinct coalesce(user_id::text, anon_id)) filter (where event = 'signup')   as dang_ky
from public.funnel_events
group by 1, 2;
