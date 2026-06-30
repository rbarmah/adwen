-- Migration: Add subtopics and exam_weight to content_units
-- Run in Supabase SQL Editor

ALTER TABLE content_units
  ADD COLUMN IF NOT EXISTS subtopics     jsonb   DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS exam_weight   numeric DEFAULT 0;
