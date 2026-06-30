-- ============================================================
-- Adwen — study_cards cache table
-- Run in Supabase Dashboard > SQL Editor
-- ============================================================

-- Cards are shared across all students on the same course.
-- First generation serves everyone. Keyed by (course_id, topic, depth).

create table if not exists study_cards (
  course_id   uuid    not null references courses(id) on delete cascade,
  topic       text    not null,
  depth       smallint not null check (depth between 0 and 4),
  cards_json  jsonb   not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  primary key (course_id, topic, depth)
);

-- Index for fast lookup
create index if not exists idx_study_cards_course on study_cards(course_id);

-- RLS
alter table study_cards enable row level security;

-- Any authenticated user can read cards for any course (academic content, not personal)
create policy "Authenticated users can read study cards"
  on study_cards for select
  using (auth.role() = 'authenticated');

-- Any authenticated user can insert/upsert (first-generation shared benefit)
create policy "Authenticated users can upsert study cards"
  on study_cards for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update study cards"
  on study_cards for update
  using (auth.role() = 'authenticated');

-- Auto-update updated_at
create or replace function update_study_cards_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_study_cards_updated_at
  before update on study_cards
  for each row execute function update_study_cards_updated_at();
