-- ════════════════════════════════════════════════
-- WriteRight — Quota Enforcement (Sprint 3b)
-- Run this once in Supabase SQL Editor (after supabase-schema.sql)
-- ════════════════════════════════════════════════

-- Rolling 7-day evaluation count per user, joined with their plan tier.
-- This is the missing piece referenced by hooks/useEntitlement.ts
-- (it queries `user_entitlements` with columns: plan, evals_this_week).
create or replace view public.user_entitlements
with (security_invoker = true) as
select
  p.id as user_id,
  p.tier as plan,
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

-- Authenticated users can read this view; RLS on the underlying
-- `profiles` and `evaluations` tables (already in supabase-schema.sql)
-- restricts each user to their own row via security_invoker above.
grant select on public.user_entitlements to authenticated;
