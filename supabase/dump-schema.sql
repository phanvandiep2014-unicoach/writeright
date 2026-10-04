-- Các truy vấn CHỈ ĐỌC dùng để chụp supabase/schema-production.sql từ production.
-- Chạy từng khối trong Supabase SQL Editor, chép cột "ddl" vào đúng mục của file schema.

-- 1. Bảng + cột
select format(E'create table public.%I (\n%s\n);', c.relname,
  (select string_agg(format('  %I %s%s%s', a.attname, format_type(a.atttypid, a.atttypmod),
      case when a.attnotnull then ' not null' else '' end,
      case when d.adbin is not null then ' default ' || pg_get_expr(d.adbin, d.adrelid) else '' end), E',\n' order by a.attnum)
   from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
   where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped)) as ddl
from pg_class c where c.relnamespace='public'::regnamespace and c.relkind='r' order by c.relname;

-- 2. Ràng buộc (PK → UNIQUE → CHECK → FK) + index
select format('alter table public.%I add constraint %I %s;', c.relname, con.conname, pg_get_constraintdef(con.oid)) as ddl
from pg_constraint con join pg_class c on c.oid=con.conrelid where c.relnamespace='public'::regnamespace
order by case con.contype when 'p' then 1 when 'u' then 2 when 'c' then 3 else 4 end, c.relname;
select pg_get_indexdef(i.indexrelid)||';' as ddl from pg_index i join pg_class t on t.oid=i.indrelid
where t.relnamespace='public'::regnamespace and not i.indisprimary and not exists (select 1 from pg_constraint c where c.conindid=i.indexrelid);

-- 3. Hàm, trigger, view
select pg_get_functiondef(p.oid)||';' as ddl from pg_proc p where p.pronamespace='public'::regnamespace;
select pg_get_triggerdef(t.oid)||';' as ddl from pg_trigger t join pg_class c on c.oid=t.tgrelid where not t.tgisinternal and c.relnamespace in ('public'::regnamespace, 'auth'::regnamespace);
select format('create or replace view public.%I%s as %s', c.relname, coalesce(' with ('||array_to_string(c.reloptions, ',')||')',''), pg_get_viewdef(c.oid, true)) as ddl
from pg_class c where c.relnamespace='public'::regnamespace and c.relkind='v';

-- 4. RLS policy + quyền theo cột
select format('create policy %I on public.%I as %s for %s to %s%s%s;', policyname, tablename, permissive, cmd, array_to_string(roles, ', '),
  coalesce(' using ('||qual||')',''), coalesce(' with check ('||with_check||')','')) as ddl from pg_policies where schemaname='public';
select table_name, grantee, string_agg(column_name, ', ') as update_cols from information_schema.column_privileges
where table_schema='public' and grantee in ('anon','authenticated') and privilege_type='UPDATE' group by 1, 2;

-- 5. Kiểm đếm để so với bản dựng lại (04/10/2026: 210 cột · 39 policy · 14 hàm · 78 ràng buộc)
select (select count(*) from information_schema.columns where table_schema='public') cols,
       (select count(*) from pg_policies where schemaname='public') pol,
       (select count(*) from pg_proc where pronamespace='public'::regnamespace) fn,
       (select count(*) from pg_constraint where connamespace='public'::regnamespace) con;
