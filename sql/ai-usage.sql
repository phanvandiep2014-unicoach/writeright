-- Ngân sách AI (02/11/2026) — đã chạy trên production qua migration "ai_usage_budget". Chạy lại an toàn.
-- ai_usage: chi phí ƯỚC TÍNH từng lần gọi Anthropic (token × giá niêm yết), xem lib/ai-budget.ts.
-- ai_budget_alerts: chống gửi trùng email cảnh báo (mỗi mức 50/75/90/100 một lần mỗi tháng).
-- Cả hai bảng bật RLS, không có policy → chỉ service role đọc/ghi.
create table if not exists public.ai_usage (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  source text not null,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  usd numeric(12,6) not null default 0
);
create index if not exists ai_usage_created_idx on public.ai_usage (created_at);
alter table public.ai_usage enable row level security;

create table if not exists public.ai_budget_alerts (
  month text not null,
  level integer not null,
  sent_at timestamptz not null default now(),
  primary key (month, level)
);
alter table public.ai_budget_alerts enable row level security;

create or replace function public.ai_spend_since(since timestamptz)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(usd), 0) from public.ai_usage where created_at >= since
$$;
revoke execute on function public.ai_spend_since(timestamptz) from public, anon, authenticated;

-- Xem chi tiêu tháng này:  select source, count(*), round(sum(usd),2) from ai_usage
--                          where created_at >= date_trunc('month', now()) group by 1;
