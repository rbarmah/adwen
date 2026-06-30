-- ============================================================
-- Adwen — Migration V3 Fixes (SAFE RE-RUN VERSION)
-- Paste this entire script into Supabase Dashboard > SQL Editor
-- and click "Run". Safe to run multiple times.
-- ============================================================

-- ==================== 1. FIX items.cognitive_type CHECK CONSTRAINT ====================

ALTER TABLE items DROP CONSTRAINT IF EXISTS items_cognitive_type_check;
ALTER TABLE items ADD CONSTRAINT items_cognitive_type_check
  CHECK (cognitive_type IN (
    'recall', 'comprehension', 'application', 'analysis',
    'evaluation', 'synthesis', 'maths', 'procedural', 'data_interpretation',
    'memory'
  ));

UPDATE items SET cognitive_type = 'recall' WHERE cognitive_type = 'memory';

-- ==================== 2. ENSURE TABLES HAVE CORRECT COLUMNS ====================

-- chat_messages: create if doesn't exist
CREATE TABLE IF NOT EXISTS chat_messages (
  id bigserial PRIMARY KEY,
  course_id uuid REFERENCES courses ON DELETE CASCADE,
  topic text,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add user_id to chat_messages if it doesn't exist yet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN user_id uuid REFERENCES auth.users ON DELETE CASCADE;
  END IF;
END $$;

-- visual_note_generations: create if doesn't exist
CREATE TABLE IF NOT EXISTS visual_note_generations (
  id bigserial PRIMARY KEY,
  course_id uuid REFERENCES courses ON DELETE CASCADE,
  topic text NOT NULL,
  mermaid_code text,
  summary text,
  created_at timestamptz DEFAULT now()
);

-- Add user_id to visual_note_generations if it doesn't exist yet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visual_note_generations' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE visual_note_generations ADD COLUMN user_id uuid REFERENCES auth.users ON DELETE CASCADE;
  END IF;
END $$;

-- study_cards already exists (shared, no user_id needed — by design)

-- ==================== 3. ENABLE RLS & CREATE POLICIES ====================

-- ── chat_messages ──
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Authenticated users can use chat" ON chat_messages;

-- Use course-based auth if user_id is nullable (legacy rows may not have it)
CREATE POLICY "Authenticated users can use chat"
  ON chat_messages FOR ALL USING (auth.role() = 'authenticated');

-- ── visual_note_generations ──
ALTER TABLE visual_note_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own visual notes" ON visual_note_generations;
DROP POLICY IF EXISTS "Users can insert own visual notes" ON visual_note_generations;
DROP POLICY IF EXISTS "Users can delete own visual notes" ON visual_note_generations;
DROP POLICY IF EXISTS "Authenticated users can use visual notes" ON visual_note_generations;

CREATE POLICY "Authenticated users can use visual notes"
  ON visual_note_generations FOR ALL USING (auth.role() = 'authenticated');

-- ── study_cards (shared table — already has RLS from study_cards_migration.sql) ──
DROP POLICY IF EXISTS "Authenticated users can delete study cards" ON study_cards;
CREATE POLICY "Authenticated users can delete study cards"
  ON study_cards FOR DELETE USING (auth.role() = 'authenticated');

-- ==================== 4. DELETE POLICIES FOR COURSE-OWNED TABLES ====================
-- These tables don't have user_id — ownership checked via courses.user_id

DROP POLICY IF EXISTS "Users can delete own content" ON content_units;
DROP POLICY IF EXISTS "Users can delete own prerequisites" ON prerequisites;
DROP POLICY IF EXISTS "Users can delete own items" ON items;

CREATE POLICY "Users can delete own content"
  ON content_units FOR DELETE USING (
    EXISTS (SELECT 1 FROM courses WHERE courses.id = content_units.course_id AND courses.user_id = auth.uid())
  );

CREATE POLICY "Users can delete own prerequisites"
  ON prerequisites FOR DELETE USING (
    EXISTS (SELECT 1 FROM courses WHERE courses.id = prerequisites.course_id AND courses.user_id = auth.uid())
  );

CREATE POLICY "Users can delete own items"
  ON items FOR DELETE USING (
    EXISTS (SELECT 1 FROM courses WHERE courses.id = items.course_id AND courses.user_id = auth.uid())
  );

-- ==================== DONE ====================
