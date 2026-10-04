-- ════════════════════════════════════════════════════════════════════
-- WriteRight — CẤU TRÚC CSDL PRODUCTION (chụp từ project "Writeright" ngày 04/10/2026)
-- ════════════════════════════════════════════════════════════════════
-- VÌ SAO CÓ FILE NÀY: các file trong sql/ KHÔNG dựng lại được CSDL — bảng orders,
-- cột profiles.role, email_log, toàn bộ bms_*... từng được tạo thẳng trong SQL Editor.
-- File này là nguồn sự thật để: (1) dựng lại khi cần, (2) test tự động (e2e/) chạy trên
-- đúng cấu trúc thật. CHỈ cấu trúc — không có dữ liệu.
--
-- Cách cập nhật khi đổi CSDL: chạy lại các truy vấn trong supabase/dump-schema.sql trên
-- production rồi thay nội dung tương ứng ở đây. Mọi thay đổi CSDL mới nên viết thành
-- migration trong sql/ VÀ cập nhật file này trong cùng một commit.
--
-- Yêu cầu: chạy trên Supabase (đã có schema auth, các role anon/authenticated/service_role).
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Bảng ────────────────────────────────────────────────────────────
create sequence if not exists public.email_log_id_seq;

create table public.profiles (
  id uuid not null,
  email text,
  full_name text,
  avatar_url text,
  tier text default 'free'::text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  role text,
  public_token uuid not null default gen_random_uuid(),
  tier_expires_at timestamp with time zone,
  free_full_credits integer not null default 0,
  free_full_granted_at timestamp with time zone,
  free_full_until timestamp with time zone,
  enrolled_override boolean not null default false,
  lms_student_code text,
  tier_pending_days integer,
  tier_activated_at timestamp with time zone,
  speak_plan text not null default 'free'::text,
  speak_expires_at timestamp with time zone
);

create table public.evaluations (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  task_type smallint default 2,
  task_prompt text not null,
  essay_text text,
  overall_band numeric(2,1),
  ta_band numeric(2,1),
  lr_band numeric(2,1),
  gra_band numeric(2,1),
  cc_band numeric(2,1),
  feedback jsonb,
  model_intro text,
  word_count integer,
  created_at timestamp with time zone default now()
);

create table public.orders (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  order_code bigint not null,
  tier text,
  amount integer not null,
  status text default 'pending'::text,
  payos_payment_link_id text,
  paid_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  billing_cycle text not null default 'monthly'::text,
  plan_code text,
  speak_plan text
);

create table public.shares (
  id uuid not null default gen_random_uuid(),
  evaluation_id uuid,
  user_id uuid,
  share_token text default translate(encode(gen_random_bytes(12), 'base64'::text), '+/='::text, '-_'::text),
  created_at timestamp with time zone default now()
);

create table public.subscriptions (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  plan text not null default 'free'::text,
  status text not null default 'active'::text,
  started_at timestamp with time zone default now(),
  expires_at timestamp with time zone,
  payos_order_id text,
  created_at timestamp with time zone default now()
);

create table public.quota_usage (
  user_id uuid not null,
  week_start date not null,
  eval_count integer not null default 0
);

create table public.email_log (
  id bigint not null default nextval('email_log_id_seq'::regclass),
  user_id uuid not null,
  kind text not null,
  expires_on date not null,
  email_to text,
  sent_at timestamp with time zone not null default now()
);

create table public.email_prefs (
  user_id uuid not null,
  practice_reminders boolean not null default true,
  updated_at timestamp with time zone not null default now(),
  nurture_consent_at timestamp with time zone,
  nurture_consent_source text,
  nurture_optout_at timestamp with time zone
);

create table public.exercise_results (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  exercise_id text not null,
  kind text not null,
  criterion text not null,
  chosen smallint not null,
  correct boolean not null,
  duration_ms integer,
  created_at timestamp with time zone default now()
);

create table public.user_goals (
  user_id uuid not null,
  current_band numeric(2,1) not null,
  target_band numeric(2,1) not null,
  exam_date date,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.user_streaks (
  user_id uuid not null,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_eval_date date,
  evals_this_week integer not null default 0,
  week_start date not null default (date_trunc('week'::text, now()))::date,
  updated_at timestamp with time zone not null default now()
);

create table public.bms_students (
  id uuid not null default gen_random_uuid(),
  code text not null,
  name text not null,
  dob date,
  gender text,
  phone text,
  address text,
  email text,
  parent_name text,
  parent_phone text,
  parent_email text,
  user_id uuid,
  parent_user_id uuid,
  status text not null default 'active'::text,
  joined_at date default CURRENT_DATE,
  notes text,
  created_at timestamp with time zone default now()
);

create table public.bms_classes (
  id uuid not null default gen_random_uuid(),
  code text not null,
  name text not null,
  subject text,
  teacher_id uuid,
  assistant_id uuid,
  schedule text,
  room text,
  start_date date,
  end_date date,
  max_students integer default 20,
  status text not null default 'open'::text,
  created_at timestamp with time zone default now(),
  schedule_days text,
  schedule_start time without time zone,
  schedule_end time without time zone
);

create table public.bms_enrollments (
  id uuid not null default gen_random_uuid(),
  class_id uuid not null,
  student_id uuid not null,
  enrolled_at date default CURRENT_DATE,
  status text not null default 'active'::text
);

create table public.bms_attendance (
  id uuid not null default gen_random_uuid(),
  class_id uuid not null,
  student_id uuid not null,
  date date not null,
  status text not null,
  note text,
  recorded_by uuid
);

create table public.bms_grades (
  id uuid not null default gen_random_uuid(),
  class_id uuid not null,
  student_id uuid not null,
  type text not null default 'quiz'::text,
  name text not null,
  score numeric not null,
  max_score numeric not null default 10,
  weight numeric not null default 1,
  date date default CURRENT_DATE,
  comment text,
  recorded_by uuid,
  created_at timestamp with time zone default now(),
  external_id text
);

create table public.bms_fees (
  id uuid not null default gen_random_uuid(),
  student_id uuid not null,
  class_id uuid,
  title text not null,
  amount numeric not null,
  paid_amount numeric not null default 0,
  due_date date,
  status text not null default 'unpaid'::text,
  paid_at date,
  method text,
  note text,
  created_by uuid,
  created_at timestamp with time zone default now()
);

create table public.bms_rooms (
  id uuid not null default gen_random_uuid(),
  name text not null,
  capacity integer default 10,
  equipment text
);

create table public.bms_bookings (
  id uuid not null default gen_random_uuid(),
  room_id uuid not null,
  title text not null,
  date date not null,
  start_time time without time zone not null,
  end_time time without time zone not null,
  purpose text,
  booked_by uuid,
  created_at timestamp with time zone default now()
);

create table public.bms_meeting_notes (
  id uuid not null default gen_random_uuid(),
  booking_id uuid,
  title text not null,
  date date not null,
  attendees text,
  content text,
  action_items text,
  created_by uuid,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone
);

-- ── Khoá chính / duy nhất / kiểm tra ───────────────────────────────
alter table public.bms_attendance add constraint bms_attendance_pkey PRIMARY KEY (id);
alter table public.bms_bookings add constraint bms_bookings_pkey PRIMARY KEY (id);
alter table public.bms_classes add constraint bms_classes_pkey PRIMARY KEY (id);
alter table public.bms_enrollments add constraint bms_enrollments_pkey PRIMARY KEY (id);
alter table public.bms_fees add constraint bms_fees_pkey PRIMARY KEY (id);
alter table public.bms_grades add constraint bms_grades_pkey PRIMARY KEY (id);
alter table public.bms_meeting_notes add constraint bms_meeting_notes_pkey PRIMARY KEY (id);
alter table public.bms_rooms add constraint bms_rooms_pkey PRIMARY KEY (id);
alter table public.bms_students add constraint bms_students_pkey PRIMARY KEY (id);
alter table public.email_log add constraint email_log_pkey PRIMARY KEY (id);
alter table public.email_prefs add constraint email_prefs_pkey PRIMARY KEY (user_id);
alter table public.evaluations add constraint evaluations_pkey PRIMARY KEY (id);
alter table public.exercise_results add constraint exercise_results_pkey PRIMARY KEY (id);
alter table public.orders add constraint orders_pkey PRIMARY KEY (id);
alter table public.profiles add constraint profiles_pkey PRIMARY KEY (id);
alter table public.quota_usage add constraint quota_usage_pkey PRIMARY KEY (user_id, week_start);
alter table public.shares add constraint shares_pkey PRIMARY KEY (id);
alter table public.subscriptions add constraint subscriptions_pkey PRIMARY KEY (id);
alter table public.user_goals add constraint user_goals_pkey PRIMARY KEY (user_id);
alter table public.user_streaks add constraint user_streaks_pkey PRIMARY KEY (user_id);

alter table public.bms_attendance add constraint bms_attendance_class_id_student_id_date_key UNIQUE (class_id, student_id, date);
alter table public.bms_classes add constraint bms_classes_code_key UNIQUE (code);
alter table public.bms_enrollments add constraint bms_enrollments_class_id_student_id_key UNIQUE (class_id, student_id);
alter table public.bms_rooms add constraint bms_rooms_name_key UNIQUE (name);
alter table public.bms_students add constraint bms_students_code_key UNIQUE (code);
alter table public.email_log add constraint email_log_once UNIQUE (user_id, kind, expires_on);
alter table public.orders add constraint orders_order_code_key UNIQUE (order_code);
alter table public.shares add constraint shares_share_token_key UNIQUE (share_token);

alter table public.bms_attendance add constraint bms_attendance_status_check CHECK ((status = ANY (ARRAY['present'::text, 'absent'::text, 'late'::text, 'excused'::text])));
alter table public.bms_bookings add constraint bms_bookings_check CHECK ((end_time > start_time));
alter table public.bms_classes add constraint bms_classes_status_check CHECK ((status = ANY (ARRAY['open'::text, 'running'::text, 'finished'::text, 'cancelled'::text])));
alter table public.bms_enrollments add constraint bms_enrollments_status_check CHECK ((status = ANY (ARRAY['active'::text, 'dropped'::text, 'finished'::text])));
alter table public.bms_fees add constraint bms_fees_amount_check CHECK ((amount >= (0)::numeric));
alter table public.bms_fees add constraint bms_fees_paid_amount_check CHECK ((paid_amount >= (0)::numeric));
alter table public.bms_fees add constraint bms_fees_status_check CHECK ((status = ANY (ARRAY['unpaid'::text, 'partial'::text, 'paid'::text])));
alter table public.bms_students add constraint bms_students_status_check CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'finished'::text])));
alter table public.evaluations add constraint evaluations_task_type_check CHECK ((task_type = ANY (ARRAY[1, 2])));
alter table public.exercise_results add constraint exercise_results_criterion_check CHECK ((criterion = ANY (ARRAY['ta'::text, 'cc'::text, 'lr'::text, 'gra'::text])));
alter table public.exercise_results add constraint exercise_results_kind_check CHECK ((kind = ANY (ARRAY['grammar'::text, 'paraphrase'::text, 'linking'::text, 'collocation'::text, 'overview'::text])));
alter table public.orders add constraint orders_billing_cycle_check CHECK ((billing_cycle = ANY (ARRAY['monthly'::text, 'yearly'::text])));
alter table public.orders add constraint orders_tier_check CHECK ((tier = ANY (ARRAY['standard'::text, 'premium'::text])));
alter table public.orders add constraint orders_speak_plan_check CHECK (((speak_plan IS NULL) OR (speak_plan = ANY (ARRAY['speak'::text, 'speak_plus'::text]))));
alter table public.orders add constraint orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'cancelled'::text, 'expired'::text])));
alter table public.profiles add constraint profiles_tier_check CHECK ((tier = ANY (ARRAY['free'::text, 'standard'::text, 'premium'::text])));
alter table public.profiles add constraint profiles_speak_plan_check CHECK ((speak_plan = ANY (ARRAY['free'::text, 'speak'::text, 'speak_plus'::text])));
alter table public.subscriptions add constraint subscriptions_plan_check CHECK ((plan = ANY (ARRAY['free'::text, 'standard'::text, 'premium'::text])));
alter table public.subscriptions add constraint subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'cancelled'::text, 'expired'::text])));

-- ── Khoá ngoại ──────────────────────────────────────────────────────
alter table public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.evaluations add constraint evaluations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.orders add constraint orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.shares add constraint shares_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.shares add constraint shares_evaluation_id_fkey FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE;
alter table public.subscriptions add constraint subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.quota_usage add constraint quota_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.email_log add constraint email_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.email_prefs add constraint email_prefs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.exercise_results add constraint exercise_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.user_goals add constraint user_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.user_streaks add constraint user_streaks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.bms_students add constraint bms_students_parent_user_id_fkey FOREIGN KEY (parent_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.bms_students add constraint bms_students_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.bms_classes add constraint bms_classes_assistant_id_fkey FOREIGN KEY (assistant_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.bms_classes add constraint bms_classes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.bms_enrollments add constraint bms_enrollments_class_id_fkey FOREIGN KEY (class_id) REFERENCES bms_classes(id) ON DELETE CASCADE;
alter table public.bms_enrollments add constraint bms_enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES bms_students(id) ON DELETE CASCADE;
alter table public.bms_attendance add constraint bms_attendance_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES profiles(id);
alter table public.bms_attendance add constraint bms_attendance_class_id_fkey FOREIGN KEY (class_id) REFERENCES bms_classes(id) ON DELETE CASCADE;
alter table public.bms_attendance add constraint bms_attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES bms_students(id) ON DELETE CASCADE;
alter table public.bms_grades add constraint bms_grades_class_id_fkey FOREIGN KEY (class_id) REFERENCES bms_classes(id) ON DELETE CASCADE;
alter table public.bms_grades add constraint bms_grades_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES profiles(id);
alter table public.bms_grades add constraint bms_grades_student_id_fkey FOREIGN KEY (student_id) REFERENCES bms_students(id) ON DELETE CASCADE;
alter table public.bms_fees add constraint bms_fees_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table public.bms_fees add constraint bms_fees_student_id_fkey FOREIGN KEY (student_id) REFERENCES bms_students(id) ON DELETE CASCADE;
alter table public.bms_fees add constraint bms_fees_class_id_fkey FOREIGN KEY (class_id) REFERENCES bms_classes(id) ON DELETE SET NULL;
alter table public.bms_bookings add constraint bms_bookings_booked_by_fkey FOREIGN KEY (booked_by) REFERENCES profiles(id);
alter table public.bms_bookings add constraint bms_bookings_room_id_fkey FOREIGN KEY (room_id) REFERENCES bms_rooms(id) ON DELETE CASCADE;
alter table public.bms_meeting_notes add constraint bms_meeting_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table public.bms_meeting_notes add constraint bms_meeting_notes_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bms_bookings(id) ON DELETE SET NULL;

-- ── Index ───────────────────────────────────────────────────────────
CREATE INDEX idx_bms_att_class_date ON public.bms_attendance USING btree (class_id, date);
CREATE INDEX idx_bms_bookings_room_date ON public.bms_bookings USING btree (room_id, date);
CREATE INDEX idx_bms_enroll_student ON public.bms_enrollments USING btree (student_id);
CREATE INDEX idx_bms_enroll_class ON public.bms_enrollments USING btree (class_id);
CREATE INDEX idx_bms_fees_student ON public.bms_fees USING btree (student_id);
CREATE INDEX idx_bms_fees_status ON public.bms_fees USING btree (status);
CREATE INDEX idx_bms_grades_student ON public.bms_grades USING btree (student_id);
CREATE UNIQUE INDEX idx_bms_grades_external ON public.bms_grades USING btree (external_id);
CREATE INDEX email_log_sent_at_idx ON public.email_log USING btree (sent_at DESC);
CREATE INDEX idx_evaluations_user_id ON public.evaluations USING btree (user_id);
CREATE INDEX idx_evaluations_created_at ON public.evaluations USING btree (created_at DESC);
CREATE INDEX idx_evaluations_user_created ON public.evaluations USING btree (user_id, created_at);
CREATE INDEX idx_evaluations_user_week ON public.evaluations USING btree (user_id, created_at);
CREATE INDEX idx_exercise_results_user_created ON public.exercise_results USING btree (user_id, created_at DESC);
CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);
CREATE INDEX idx_orders_order_code ON public.orders USING btree (order_code);
CREATE INDEX profiles_email_lower_idx ON public.profiles USING btree (lower(email));
CREATE INDEX profiles_lms_student_code_idx ON public.profiles USING btree (lms_student_code);
CREATE UNIQUE INDEX profiles_public_token_key ON public.profiles USING btree (public_token);

-- ── Hàm ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  );
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.advance_streak()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  s public.user_streaks%rowtype;
  today date := (new.created_at at time zone 'Asia/Ho_Chi_Minh')::date;
  this_week date := date_trunc('week', new.created_at at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  select * into s from public.user_streaks where user_id = new.user_id;

  if not found then
    insert into public.user_streaks(user_id, current_streak, longest_streak,
                                    last_eval_date, evals_this_week, week_start)
    values (new.user_id, 1, 1, today, 1, this_week);
    return new;
  end if;

  if s.last_eval_date = today then
    null;
  elsif s.last_eval_date = today - 1 then
    s.current_streak := s.current_streak + 1;
  else
    s.current_streak := 1;
  end if;

  if s.week_start is distinct from this_week then
    s.evals_this_week := 0;
    s.week_start := this_week;
  end if;

  update public.user_streaks set
    current_streak  = s.current_streak,
    longest_streak  = greatest(s.longest_streak, s.current_streak),
    last_eval_date  = today,
    evals_this_week = s.evals_this_week + 1,
    week_start      = s.week_start,
    updated_at      = now()
  where user_id = new.user_id;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.bms_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((select role from profiles where id = auth.uid()), '')
$function$;

CREATE OR REPLACE FUNCTION public.bms_is_staff()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select bms_role() in ('admin','teacher','assistant')
$function$;

CREATE OR REPLACE FUNCTION public.bms_can_write_class(p_class uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select bms_role() = 'admin' or exists (
    select 1 from bms_classes c where c.id = p_class
      and (c.teacher_id = auth.uid() or c.assistant_id = auth.uid())
  )
$function$;

CREATE OR REPLACE FUNCTION public.bms_autolink_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_email text;
begin
  v_email := lower(coalesce(new.email, (select email from auth.users where id = new.id)));
  if v_email is null or v_email = '' then return new; end if;
  update bms_students set parent_user_id = new.id where lower(parent_email) = v_email and parent_user_id is null;
  if found and coalesce(new.role,'') = '' then
    update profiles set role = 'parent' where id = new.id and coalesce(role,'') = '';
  end if;
  update bms_students set user_id = new.id where lower(email) = v_email and user_id is null;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.bms_check_booking_overlap()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if exists (
    select 1 from bms_bookings b
    where b.room_id = new.room_id and b.date = new.date and b.id <> coalesce(new.id, gen_random_uuid())
      and not (b.end_time <= new.start_time or b.start_time >= new.end_time)
  ) then
    raise exception 'Trung lich phong hop';
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.bms_fee_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.paid_amount >= new.amount and new.amount > 0 then new.status := 'paid';
  elsif new.paid_amount > 0 then new.status := 'partial';
  else new.status := 'unpaid';
  end if;
  if new.status = 'paid' and new.paid_at is null then new.paid_at := current_date; end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.get_evaluation_by_share(p_share_id uuid)
 RETURNS TABLE(share_id uuid, evaluation_id uuid, task_type integer, task_prompt text, essay_text text, word_count integer, overall_band numeric, ta_band numeric, cc_band numeric, lr_band numeric, gra_band numeric, created_at timestamp with time zone, feedback jsonb, sharer_name text, sharer_avatar text, sharer_tier text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT s.id, e.id, e.task_type::integer, e.task_prompt::text, e.essay_text::text, e.word_count::integer,
    e.overall_band::numeric, e.ta_band::numeric, e.cc_band::numeric, e.lr_band::numeric, e.gra_band::numeric,
    e.created_at, e.feedback,
    p.full_name::text, p.avatar_url::text, p.tier::text
  FROM shares s
  JOIN evaluations e ON e.id = s.evaluation_id
  LEFT JOIN profiles p ON p.id = s.user_id
  WHERE s.id = p_share_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.users_due_for_nurture(max_rows integer DEFAULT 300)
 RETURNS TABLE(user_id uuid, email text, full_name text, tier text, signup_at timestamp with time zone, essays_count bigint, last_band numeric, first_eval_at timestamp with time zone, last_eval_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.users_due_for_renewal(days_ahead integer)
 RETURNS TABLE(user_id uuid, email text, full_name text, tier text, expires_on date, expires_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select p.id, u.email::text, p.full_name, p.tier,
         (p.tier_expires_at at time zone 'Asia/Ho_Chi_Minh')::date,
         p.tier_expires_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.tier in ('standard','premium')
    and p.tier_expires_at is not null
    and u.email is not null
    and (p.tier_expires_at at time zone 'Asia/Ho_Chi_Minh')::date
        = ((now() at time zone 'Asia/Ho_Chi_Minh')::date + days_ahead)
  order by p.tier_expires_at;
$function$;

CREATE OR REPLACE FUNCTION public.users_due_for_streak_reminder(max_rows integer DEFAULT 500)
 RETURNS TABLE(user_id uuid, email text, full_name text, active_days date[])
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.users_paid_unused(max_rows integer DEFAULT 200)
 RETURNS TABLE(user_id uuid, email text, full_name text, tier text, tier_expires_at timestamp with time zone, expires_on date, a_sent_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
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
$function$;

-- wr_public_stats(): số liệu thật trên trang chủ — nguồn đầy đủ ở sql/public-stats.sql
-- (bản trên production khớp file đó). Nạp riêng file đó sau file này.

-- ── Trigger ─────────────────────────────────────────────────────────
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
CREATE TRIGGER trg_advance_streak AFTER INSERT ON public.evaluations FOR EACH ROW EXECUTE FUNCTION advance_streak();
CREATE TRIGGER trg_bms_autolink AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION bms_autolink_profile();
CREATE TRIGGER trg_bms_booking_overlap BEFORE INSERT OR UPDATE ON public.bms_bookings FOR EACH ROW EXECUTE FUNCTION bms_check_booking_overlap();
CREATE TRIGGER trg_bms_fee_status BEFORE INSERT OR UPDATE ON public.bms_fees FOR EACH ROW EXECUTE FUNCTION bms_fee_status();

-- ── View ────────────────────────────────────────────────────────────
create or replace view public.user_entitlements with (security_invoker=true) as  SELECT p.id AS user_id,
        CASE
            WHEN p.tier_expires_at IS NOT NULL AND p.tier_expires_at < now() THEN 'free'::text
            ELSE p.tier
        END AS plan,
    p.tier_expires_at,
    p.tier_expires_at IS NOT NULL AND p.tier_expires_at < now() AS is_expired,
        CASE
            WHEN (p.tier = ANY (ARRAY['standard'::text, 'premium'::text])) AND (p.tier_expires_at IS NULL OR p.tier_expires_at >= now()) THEN 999999
            ELSE 1
        END AS weekly_quota,
    COALESCE(e.evals_this_week, 0::bigint) AS evals_this_week
   FROM profiles p
     LEFT JOIN ( SELECT evaluations.user_id,
            count(*) AS evals_this_week
           FROM evaluations
          WHERE evaluations.created_at >= (now() - '7 days'::interval)
          GROUP BY evaluations.user_id) e ON e.user_id = p.id;

create or replace view public.daily_usage with (security_invoker=true) as  SELECT user_id,
    date_trunc('day'::text, created_at) AS day,
    count(*) AS eval_count
   FROM evaluations
  GROUP BY user_id, (date_trunc('day'::text, created_at));

create or replace view public.bms_student_writeright with (security_invoker=true) as  SELECT s.id AS student_id,
    s.code,
    s.name,
    e.id AS evaluation_id,
    e.created_at,
    e.overall_band,
    e.task_type,
    e.ta_band,
    e.cc_band,
    e.lr_band,
    e.gra_band,
    e.word_count
   FROM bms_students s
     JOIN evaluations e ON e.user_id = s.user_id
  WHERE s.user_id IS NOT NULL;

-- ── RLS ─────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.evaluations enable row level security;
alter table public.orders enable row level security;
alter table public.shares enable row level security;
alter table public.subscriptions enable row level security;
alter table public.quota_usage enable row level security;
alter table public.email_log enable row level security;
alter table public.email_prefs enable row level security;
alter table public.exercise_results enable row level security;
alter table public.user_goals enable row level security;
alter table public.user_streaks enable row level security;
alter table public.bms_students enable row level security;
alter table public.bms_classes enable row level security;
alter table public.bms_enrollments enable row level security;
alter table public.bms_attendance enable row level security;
alter table public.bms_grades enable row level security;
alter table public.bms_fees enable row level security;
alter table public.bms_rooms enable row level security;
alter table public.bms_bookings enable row level security;
alter table public.bms_meeting_notes enable row level security;

create policy "Anyone can view shares" on public.shares as PERMISSIVE for SELECT to public using (true);
create policy "Users can create shares" on public.shares as PERMISSIVE for INSERT to public with check ((auth.uid() = user_id));
create policy "Users can insert own evaluations" on public.evaluations as PERMISSIVE for INSERT to public with check ((auth.uid() = user_id));
create policy "Users can insert own exercise results" on public.exercise_results as PERMISSIVE for INSERT to public with check ((auth.uid() = user_id));
create policy "Users can update own profile" on public.profiles as PERMISSIVE for UPDATE to public using ((auth.uid() = id));
create policy "Users can view own evaluations" on public.evaluations as PERMISSIVE for SELECT to public using ((auth.uid() = user_id));
create policy "Users can view own exercise results" on public.exercise_results as PERMISSIVE for SELECT to public using ((auth.uid() = user_id));
create policy "Users can view own orders" on public.orders as PERMISSIVE for SELECT to public using ((auth.uid() = user_id));
create policy "Users can view own profile" on public.profiles as PERMISSIVE for SELECT to public using ((auth.uid() = id));
create policy "Users can view own quota" on public.quota_usage as PERMISSIVE for SELECT to public using ((auth.uid() = user_id));
create policy "Users can view own streaks" on public.user_streaks as PERMISSIVE for SELECT to public using ((auth.uid() = user_id));
create policy "Users can view own subscriptions" on public.subscriptions as PERMISSIVE for SELECT to public using ((auth.uid() = user_id));
create policy "own goal insert" on public.user_goals as PERMISSIVE for INSERT to public with check ((auth.uid() = user_id));
create policy "own goal select" on public.user_goals as PERMISSIVE for SELECT to public using ((auth.uid() = user_id));
create policy "own goal update" on public.user_goals as PERMISSIVE for UPDATE to public using ((auth.uid() = user_id));
create policy "own streak read" on public.user_streaks as PERMISSIVE for SELECT to public using ((auth.uid() = user_id));
create policy bms_admin_update_profiles on public.profiles as PERMISSIVE for UPDATE to public using ((bms_role() = 'admin'::text)) with check ((bms_role() = 'admin'::text));
create policy bms_staff_read_profiles on public.profiles as PERMISSIVE for SELECT to public using (bms_is_staff());
create policy bms_att_sel on public.bms_attendance as PERMISSIVE for SELECT to public using ((bms_is_staff() OR (EXISTS ( SELECT 1
   FROM bms_students s
  WHERE ((s.id = bms_attendance.student_id) AND ((s.parent_user_id = auth.uid()) OR (s.user_id = auth.uid())))))));
create policy bms_att_write on public.bms_attendance as PERMISSIVE for ALL to public using (bms_can_write_class(class_id)) with check (bms_can_write_class(class_id));
create policy bms_bookings_del on public.bms_bookings as PERMISSIVE for DELETE to public using (((bms_role() = 'admin'::text) OR (booked_by = auth.uid())));
create policy bms_bookings_ins on public.bms_bookings as PERMISSIVE for INSERT to public with check ((bms_is_staff() AND (booked_by = auth.uid())));
create policy bms_bookings_sel on public.bms_bookings as PERMISSIVE for SELECT to public using (bms_is_staff());
create policy bms_classes_sel on public.bms_classes as PERMISSIVE for SELECT to public using ((bms_is_staff() OR (EXISTS ( SELECT 1
   FROM (bms_enrollments e
     JOIN bms_students s ON ((s.id = e.student_id)))
  WHERE ((e.class_id = bms_classes.id) AND ((s.parent_user_id = auth.uid()) OR (s.user_id = auth.uid())))))));
create policy bms_classes_write on public.bms_classes as PERMISSIVE for ALL to public using ((bms_role() = 'admin'::text)) with check ((bms_role() = 'admin'::text));
create policy bms_enroll_sel on public.bms_enrollments as PERMISSIVE for SELECT to public using ((bms_is_staff() OR (EXISTS ( SELECT 1
   FROM bms_students s
  WHERE ((s.id = bms_enrollments.student_id) AND ((s.parent_user_id = auth.uid()) OR (s.user_id = auth.uid())))))));
create policy bms_enroll_write on public.bms_enrollments as PERMISSIVE for ALL to public using ((bms_role() = 'admin'::text)) with check ((bms_role() = 'admin'::text));
create policy bms_fees_sel on public.bms_fees as PERMISSIVE for SELECT to public using ((bms_is_staff() OR (EXISTS ( SELECT 1
   FROM bms_students s
  WHERE ((s.id = bms_fees.student_id) AND ((s.parent_user_id = auth.uid()) OR (s.user_id = auth.uid())))))));
create policy bms_fees_write on public.bms_fees as PERMISSIVE for ALL to public using ((bms_role() = 'admin'::text)) with check ((bms_role() = 'admin'::text));
create policy bms_grades_sel on public.bms_grades as PERMISSIVE for SELECT to public using ((bms_is_staff() OR (EXISTS ( SELECT 1
   FROM bms_students s
  WHERE ((s.id = bms_grades.student_id) AND ((s.parent_user_id = auth.uid()) OR (s.user_id = auth.uid())))))));
create policy bms_grades_write on public.bms_grades as PERMISSIVE for ALL to public using (bms_can_write_class(class_id)) with check (bms_can_write_class(class_id));
create policy bms_notes_del on public.bms_meeting_notes as PERMISSIVE for DELETE to public using (((bms_role() = 'admin'::text) OR (created_by = auth.uid())));
create policy bms_notes_ins on public.bms_meeting_notes as PERMISSIVE for INSERT to public with check ((bms_is_staff() AND (created_by = auth.uid())));
create policy bms_notes_sel on public.bms_meeting_notes as PERMISSIVE for SELECT to public using (bms_is_staff());
create policy bms_notes_upd on public.bms_meeting_notes as PERMISSIVE for UPDATE to public using (((bms_role() = 'admin'::text) OR (created_by = auth.uid())));
create policy bms_rooms_sel on public.bms_rooms as PERMISSIVE for SELECT to public using (bms_is_staff());
create policy bms_rooms_write on public.bms_rooms as PERMISSIVE for ALL to public using ((bms_role() = 'admin'::text)) with check ((bms_role() = 'admin'::text));
create policy bms_students_sel on public.bms_students as PERMISSIVE for SELECT to public using ((bms_is_staff() OR (parent_user_id = auth.uid()) OR (user_id = auth.uid())));
create policy bms_students_write on public.bms_students as PERMISSIVE for ALL to public using ((bms_role() = 'admin'::text)) with check ((bms_role() = 'admin'::text));

-- ── Quyền ───────────────────────────────────────────────────────────
-- Mặc định của Supabase: anon/authenticated/service_role có ALL trên mọi bảng public,
-- RLS mới là lớp chặn. Ngoại lệ bên dưới là những chỗ đã cố ý siết.
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

-- profiles: trình duyệt chỉ được sửa tên + ảnh (04/10/2026 — chặn tự nâng gói / tự thành admin)
revoke update on public.profiles from anon, authenticated;
grant update (full_name, avatar_url, updated_at) on public.profiles to authenticated;

-- daily_usage: không cho anon đọc (04/10/2026 — trước đó lộ hoạt động của mọi học viên)
revoke all on public.daily_usage from anon;

-- Hàm chạy nền cho cron: chỉ service role gọi
revoke all on function public.users_due_for_nurture(int) from public, anon, authenticated;
revoke all on function public.users_due_for_renewal(int) from public, anon, authenticated;
revoke all on function public.users_due_for_streak_reminder(int) from public, anon, authenticated;
revoke all on function public.users_paid_unused(int) from public, anon, authenticated;
