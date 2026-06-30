-- Migration 005: Add WASSCE course, grades, and academic alerts columns to profiles table

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wassce_course text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wassce_grades jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS academic_alerts text[];
