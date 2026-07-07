-- ============================================================
-- Adwen — Add username to profiles
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Add username column
alter table profiles add column if not exists username text;

-- Add unique constraint (usernames must be unique)
create unique index if not exists idx_profiles_username on profiles(username) where username is not null;
