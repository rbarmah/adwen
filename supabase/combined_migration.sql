-- ============================================================
-- Adwen — COMBINED MIGRATION SCRIPT
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- ==================== 1. EXTENSIONS ====================
create extension if not exists vector;
create extension if not exists pgcrypto;

-- ==================== 2. TABLES ====================

-- Profile (1:1 with auth.users)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  age_band text,
  programme text,
  level int,
  locale text default 'en-GH',
  cwa numeric,
  consent_measure bool default false,
  consent_data bool default false,
  is_minor bool default false,
  wassce_course text,
  wassce_grades jsonb,
  academic_alerts text[],
  created_at timestamptz default now()
);

-- Versioned baseline cognitive estimates
create table learner_constructs (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  construct text not null check (construct in ('working_memory','processing_speed','application','prior_knowledge')),
  value numeric,
  ci_low numeric,
  ci_high numeric,
  n_obs int default 0,
  measured bool default true,
  created_at timestamptz default now()
);

-- Courses (user-owned notebooks)
create table courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  exam_date date,
  self_difficulty int check (self_difficulty between 1 and 10),
  status text default 'analyzing',
  created_at timestamptz default now()
);

-- Uploaded files per course
create table course_files (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  storage_path text,
  filename text,
  kind text,
  created_at timestamptz default now()
);

-- Parsed content units with embeddings
create table content_units (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  topic text,
  subtopic text,
  ordered_index int,
  cleaned_text text,
  embedding vector(1536),
  cognitive_emphasis jsonb,
  mastery_prior numeric,
  created_at timestamptz default now()
);

-- Topic prerequisite graph
create table prerequisites (
  id bigserial primary key,
  course_id uuid references courses on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  from_topic text,
  to_topic text
);

-- MCQ item bank with IRT parameters + misconceptions
create table items (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  content_unit_id uuid references content_units,
  stem text,
  options jsonb,
  correct_index int,
  options_misconception jsonb,
  cognitive_type text check (cognitive_type in ('memory','application','maths','recall')),
  difficulty_b numeric,
  discrimination_a numeric default 1.0,
  guessing_c numeric default 0.25,
  difficulty_bucket int,
  status text default 'draft' check (status in ('draft','validated','live','review','retired')),
  source text default 'generated',
  created_at timestamptz default now()
);

-- Quiz sessions
create table quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  course_id uuid references courses,
  timed bool,
  theta_final numeric,
  se_final numeric,
  started_at timestamptz default now(),
  ended_at timestamptz
);

-- APPEND-ONLY telemetry (the gold)
create table response_events (
  id bigserial primary key,
  session_id uuid references quiz_sessions,
  user_id uuid not null references auth.users on delete cascade,
  item_id uuid references items,
  chosen_index int,
  is_correct bool,
  latency_ms int,
  stated_confidence text,
  timer_mode text,
  time_remaining_ms int,
  option_change_count int default 0,
  first_focus_to_answer_ms int,
  theta_before numeric,
  theta_after numeric,
  item_b_at_time numeric,
  flags jsonb,
  created_at timestamptz default now()
);

-- Per-skill mastery states (BKT)
create table mastery_states (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  course_id uuid references courses,
  skill_or_topic text,
  p_mastered numeric,
  last_seen timestamptz,
  predicted_forget_at timestamptz,
  updated_at timestamptz default now()
);

-- Versioned readiness estimates (history = tightening band)
create table readiness_estimates (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  course_id uuid references courses,
  point numeric,
  ci_low numeric,
  ci_high numeric,
  confidence_label text,
  basis text,
  created_at timestamptz default now()
);

-- Outcome reports (real grade → recalibration)
create table outcome_reports (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  course_id uuid references courses,
  real_grade numeric,
  predicted_at_report numeric,
  reported_at timestamptz default now()
);

-- Spaced-repetition review schedule
create table review_schedule (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  course_id uuid references courses,
  topic text,
  due_at timestamptz,
  strength numeric
);

-- Agent run observability
create table agent_runs (
  id bigserial primary key,
  user_id uuid,
  agent text,
  model text,
  input_tokens int,
  output_tokens int,
  latency_ms int,
  ok bool,
  created_at timestamptz default now()
);

-- Indexes for performance
create index idx_learner_constructs_user on learner_constructs(user_id);
create index idx_courses_user on courses(user_id);
create index idx_course_files_course on course_files(course_id);
create index idx_content_units_course on content_units(course_id);
create index idx_items_course on items(course_id);
create index idx_items_status on items(status);
create index idx_quiz_sessions_user on quiz_sessions(user_id);
create index idx_response_events_session on response_events(session_id);
create index idx_response_events_user on response_events(user_id);
create index idx_mastery_states_user_course on mastery_states(user_id, course_id);
create index idx_readiness_user_course on readiness_estimates(user_id, course_id);
create index idx_review_schedule_user on review_schedule(user_id, due_at);

-- HNSW index for vector similarity search
create index idx_content_units_embedding on content_units using hnsw (embedding vector_cosine_ops);

-- ==================== 3. ROW LEVEL SECURITY ====================

alter table profiles enable row level security;
alter table learner_constructs enable row level security;
alter table courses enable row level security;
alter table course_files enable row level security;
alter table content_units enable row level security;
alter table prerequisites enable row level security;
alter table items enable row level security;
alter table quiz_sessions enable row level security;
alter table response_events enable row level security;
alter table mastery_states enable row level security;
alter table readiness_estimates enable row level security;
alter table outcome_reports enable row level security;
alter table review_schedule enable row level security;
alter table agent_runs enable row level security;

-- Profiles
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);
create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Learner Constructs
create policy "Users can view own constructs"
  on learner_constructs for select using (auth.uid() = user_id);
create policy "Users can insert own constructs"
  on learner_constructs for insert with check (auth.uid() = user_id);
create policy "Users can update own constructs"
  on learner_constructs for update using (auth.uid() = user_id);

-- Courses
create policy "Users can view own courses"
  on courses for select using (auth.uid() = user_id);
create policy "Users can insert own courses"
  on courses for insert with check (auth.uid() = user_id);
create policy "Users can update own courses"
  on courses for update using (auth.uid() = user_id);
create policy "Users can delete own courses"
  on courses for delete using (auth.uid() = user_id);

-- Course Files
create policy "Users can view own files"
  on course_files for select using (auth.uid() = user_id);
create policy "Users can insert own files"
  on course_files for insert with check (auth.uid() = user_id);
create policy "Users can delete own files"
  on course_files for delete using (auth.uid() = user_id);

-- Content Units
create policy "Users can view own content"
  on content_units for select using (auth.uid() = user_id);
create policy "Users can insert own content"
  on content_units for insert with check (auth.uid() = user_id);
create policy "Users can update own content"
  on content_units for update using (auth.uid() = user_id);

-- Prerequisites
create policy "Users can view own prerequisites"
  on prerequisites for select using (auth.uid() = user_id);
create policy "Users can insert own prerequisites"
  on prerequisites for insert with check (auth.uid() = user_id);

-- Items
create policy "Users can view own items"
  on items for select using (auth.uid() = user_id);
create policy "Users can insert own items"
  on items for insert with check (auth.uid() = user_id);
create policy "Users can update own items"
  on items for update using (auth.uid() = user_id);

-- Quiz Sessions
create policy "Users can view own sessions"
  on quiz_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own sessions"
  on quiz_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions"
  on quiz_sessions for update using (auth.uid() = user_id);

-- Response Events (APPEND-ONLY: INSERT + SELECT only)
create policy "Users can view own events"
  on response_events for select using (auth.uid() = user_id);
create policy "Users can insert own events"
  on response_events for insert with check (auth.uid() = user_id);

-- Mastery States
create policy "Users can view own mastery"
  on mastery_states for select using (auth.uid() = user_id);
create policy "Users can insert own mastery"
  on mastery_states for insert with check (auth.uid() = user_id);
create policy "Users can update own mastery"
  on mastery_states for update using (auth.uid() = user_id);

-- Readiness Estimates
create policy "Users can view own readiness"
  on readiness_estimates for select using (auth.uid() = user_id);
create policy "Users can insert own readiness"
  on readiness_estimates for insert with check (auth.uid() = user_id);

-- Outcome Reports
create policy "Users can view own outcomes"
  on outcome_reports for select using (auth.uid() = user_id);
create policy "Users can insert own outcomes"
  on outcome_reports for insert with check (auth.uid() = user_id);

-- Review Schedule
create policy "Users can view own schedule"
  on review_schedule for select using (auth.uid() = user_id);
create policy "Users can insert own schedule"
  on review_schedule for insert with check (auth.uid() = user_id);
create policy "Users can update own schedule"
  on review_schedule for update using (auth.uid() = user_id);
create policy "Users can delete own schedule"
  on review_schedule for delete using (auth.uid() = user_id);

-- Agent Runs
create policy "Users can view own agent runs"
  on agent_runs for select using (auth.uid() = user_id);
create policy "Users can insert own agent runs"
  on agent_runs for insert with check (auth.uid() = user_id);

-- ==================== 4. STORAGE BUCKET ====================

insert into storage.buckets (id, name, public)
values ('course-uploads', 'course-uploads', false);

create policy "Users can upload to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'course-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can view own uploads"
  on storage.objects for select
  using (
    bucket_id = 'course-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own uploads"
  on storage.objects for delete
  using (
    bucket_id = 'course-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own uploads"
  on storage.objects for update
  using (
    bucket_id = 'course-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
