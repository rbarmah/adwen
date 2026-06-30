-- ============================================================
-- Adwen — Migration 003: Row Level Security Policies
-- Owner-only access; append-only telemetry
-- ============================================================

-- Enable RLS on every table
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

-- ==================== PROFILES ====================
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);
create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- ==================== LEARNER CONSTRUCTS ====================
create policy "Users can view own constructs"
  on learner_constructs for select using (auth.uid() = user_id);
create policy "Users can insert own constructs"
  on learner_constructs for insert with check (auth.uid() = user_id);
create policy "Users can update own constructs"
  on learner_constructs for update using (auth.uid() = user_id);

-- ==================== COURSES ====================
create policy "Users can view own courses"
  on courses for select using (auth.uid() = user_id);
create policy "Users can insert own courses"
  on courses for insert with check (auth.uid() = user_id);
create policy "Users can update own courses"
  on courses for update using (auth.uid() = user_id);
create policy "Users can delete own courses"
  on courses for delete using (auth.uid() = user_id);

-- ==================== COURSE FILES ====================
create policy "Users can view own files"
  on course_files for select using (auth.uid() = user_id);
create policy "Users can insert own files"
  on course_files for insert with check (auth.uid() = user_id);
create policy "Users can delete own files"
  on course_files for delete using (auth.uid() = user_id);

-- ==================== CONTENT UNITS ====================
create policy "Users can view own content"
  on content_units for select using (auth.uid() = user_id);
create policy "Users can insert own content"
  on content_units for insert with check (auth.uid() = user_id);
create policy "Users can update own content"
  on content_units for update using (auth.uid() = user_id);

-- ==================== PREREQUISITES ====================
create policy "Users can view own prerequisites"
  on prerequisites for select using (auth.uid() = user_id);
create policy "Users can insert own prerequisites"
  on prerequisites for insert with check (auth.uid() = user_id);

-- ==================== ITEMS ====================
create policy "Users can view own items"
  on items for select using (auth.uid() = user_id);
create policy "Users can insert own items"
  on items for insert with check (auth.uid() = user_id);
create policy "Users can update own items"
  on items for update using (auth.uid() = user_id);

-- ==================== QUIZ SESSIONS ====================
create policy "Users can view own sessions"
  on quiz_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own sessions"
  on quiz_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions"
  on quiz_sessions for update using (auth.uid() = user_id);

-- ==================== RESPONSE EVENTS (APPEND-ONLY) ====================
-- INSERT + SELECT only — NO update, NO delete
create policy "Users can view own events"
  on response_events for select using (auth.uid() = user_id);
create policy "Users can insert own events"
  on response_events for insert with check (auth.uid() = user_id);
-- Explicitly revoke update/delete from authenticated role
-- (RLS denies by default when no policy exists for that operation)

-- ==================== MASTERY STATES ====================
create policy "Users can view own mastery"
  on mastery_states for select using (auth.uid() = user_id);
create policy "Users can insert own mastery"
  on mastery_states for insert with check (auth.uid() = user_id);
create policy "Users can update own mastery"
  on mastery_states for update using (auth.uid() = user_id);

-- ==================== READINESS ESTIMATES ====================
create policy "Users can view own readiness"
  on readiness_estimates for select using (auth.uid() = user_id);
create policy "Users can insert own readiness"
  on readiness_estimates for insert with check (auth.uid() = user_id);

-- ==================== OUTCOME REPORTS ====================
create policy "Users can view own outcomes"
  on outcome_reports for select using (auth.uid() = user_id);
create policy "Users can insert own outcomes"
  on outcome_reports for insert with check (auth.uid() = user_id);

-- ==================== REVIEW SCHEDULE ====================
create policy "Users can view own schedule"
  on review_schedule for select using (auth.uid() = user_id);
create policy "Users can insert own schedule"
  on review_schedule for insert with check (auth.uid() = user_id);
create policy "Users can update own schedule"
  on review_schedule for update using (auth.uid() = user_id);
create policy "Users can delete own schedule"
  on review_schedule for delete using (auth.uid() = user_id);

-- ==================== AGENT RUNS ====================
-- Users can view their own agent runs (observability)
create policy "Users can view own agent runs"
  on agent_runs for select using (auth.uid() = user_id);
-- Insert is done server-side with service role key,
-- but allow user insert for client-logged operations
create policy "Users can insert own agent runs"
  on agent_runs for insert with check (auth.uid() = user_id);
