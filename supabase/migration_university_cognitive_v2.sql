-- ============================================================
-- Adwen — Schema Migration: University + 6-Dimension Cognitive Battery
-- Run in Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Add missing columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS university text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wassce_course text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wassce_grades jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS academic_alerts text[];

-- 2. Drop the old CHECK constraint on learner_constructs.construct
-- (it only allowed: working_memory, processing_speed, application, prior_knowledge)
ALTER TABLE learner_constructs DROP CONSTRAINT IF EXISTS learner_constructs_construct_check;

-- 3. Add new CHECK constraint allowing all 6 cognitive dimensions
ALTER TABLE learner_constructs ADD CONSTRAINT learner_constructs_construct_check
  CHECK (construct IN (
    'working_memory',
    'processing_speed',
    'sustained_attention',
    'logical_reasoning',
    'analytical_reasoning',
    'metacognition',
    -- Keep legacy values so old data doesn't break
    'application',
    'prior_knowledge'
  ));

-- Done! The app will now save all fields without fallback errors.
