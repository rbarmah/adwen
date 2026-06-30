-- Migration: Add ON DELETE CASCADE to course_id FKs that were missing it
-- Run this in Supabase SQL Editor

-- 1. quiz_sessions
ALTER TABLE quiz_sessions
  DROP CONSTRAINT IF EXISTS quiz_sessions_course_id_fkey,
  ADD CONSTRAINT quiz_sessions_course_id_fkey
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

-- 2. mastery_states
ALTER TABLE mastery_states
  DROP CONSTRAINT IF EXISTS mastery_states_course_id_fkey,
  ADD CONSTRAINT mastery_states_course_id_fkey
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

-- 3. readiness_estimates
ALTER TABLE readiness_estimates
  DROP CONSTRAINT IF EXISTS readiness_estimates_course_id_fkey,
  ADD CONSTRAINT readiness_estimates_course_id_fkey
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

-- 4. outcome_reports
ALTER TABLE outcome_reports
  DROP CONSTRAINT IF EXISTS outcome_reports_course_id_fkey,
  ADD CONSTRAINT outcome_reports_course_id_fkey
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

-- 5. review_schedule
ALTER TABLE review_schedule
  DROP CONSTRAINT IF EXISTS review_schedule_course_id_fkey,
  ADD CONSTRAINT review_schedule_course_id_fkey
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

-- 6. response_events.session_id → cascade when quiz_session is deleted
ALTER TABLE response_events
  DROP CONSTRAINT IF EXISTS response_events_session_id_fkey,
  ADD CONSTRAINT response_events_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES quiz_sessions(id) ON DELETE CASCADE;

-- 7. response_events.item_id → cascade when item is deleted
ALTER TABLE response_events
  DROP CONSTRAINT IF EXISTS response_events_item_id_fkey,
  ADD CONSTRAINT response_events_item_id_fkey
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;
