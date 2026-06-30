-- ============================================================
-- Adwen — Migration 002: Create All Tables (§6 Schema)
-- ============================================================

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
