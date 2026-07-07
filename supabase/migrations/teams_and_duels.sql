-- ============================================================
-- Adwen — Teams & Duels Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ─── TEAMS ───────────────────────────────────────────────────

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  visibility text not null default 'open' check (visibility in ('open', 'invite_only')),
  created_at timestamptz default now()
);

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz default now(),
  unique(team_id, user_id)
);

create table if not exists team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  invited_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz default now(),
  unique(team_id, invited_user_id)
);

create table if not exists team_courses (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  added_by uuid not null references auth.users(id),
  added_at timestamptz default now(),
  unique(team_id, course_id)
);

-- ─── DUELS ───────────────────────────────────────────────────

create table if not exists duels (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references auth.users(id),
  opponent_id uuid not null references auth.users(id),
  course_id uuid not null references courses(id),
  item_ids uuid[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'in_progress', 'completed', 'expired')),
  challenger_correct integer,
  challenger_total integer default 20,
  challenger_time_ms integer,
  opponent_correct integer,
  opponent_total integer default 20,
  opponent_time_ms integer,
  winner_id uuid references auth.users(id),
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '48 hours')
);

create table if not exists duel_responses (
  id uuid primary key default gen_random_uuid(),
  duel_id uuid not null references duels(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  item_id uuid not null references items(id),
  chosen_index integer not null,
  is_correct boolean not null,
  latency_ms integer not null,
  question_number integer not null,
  created_at timestamptz default now()
);

-- ─── RLS POLICIES ────────────────────────────────────────────

alter table teams enable row level security;
alter table team_members enable row level security;
alter table team_invites enable row level security;
alter table team_courses enable row level security;
alter table duels enable row level security;
alter table duel_responses enable row level security;

-- Teams: anyone can read, only owner can insert/update/delete
create policy "Teams readable by all authenticated" on teams for select to authenticated using (true);
create policy "Teams insertable by authenticated" on teams for insert to authenticated with check (auth.uid() = owner_id);
create policy "Teams updatable by owner" on teams for update to authenticated using (auth.uid() = owner_id);
create policy "Teams deletable by owner" on teams for delete to authenticated using (auth.uid() = owner_id);

-- Team members: readable by all, insertable by self, deletable by self or team owner
create policy "Team members readable" on team_members for select to authenticated using (true);
create policy "Team members insertable" on team_members for insert to authenticated with check (auth.uid() = user_id);
create policy "Team members deletable" on team_members for delete to authenticated using (
  auth.uid() = user_id or
  auth.uid() in (select owner_id from teams where id = team_id)
);

-- Team invites: readable by invited user or team owner
create policy "Team invites readable" on team_invites for select to authenticated using (
  auth.uid() = invited_user_id or
  auth.uid() in (select owner_id from teams where id = team_id)
);
create policy "Team invites insertable by team owner" on team_invites for insert to authenticated with check (
  auth.uid() in (select owner_id from teams where id = team_id)
);
create policy "Team invites updatable by invited user" on team_invites for update to authenticated using (
  auth.uid() = invited_user_id
);

-- Team courses: readable by all, manageable by team owner
create policy "Team courses readable" on team_courses for select to authenticated using (true);
create policy "Team courses insertable by owner" on team_courses for insert to authenticated with check (
  auth.uid() in (select owner_id from teams where id = team_id)
);
create policy "Team courses deletable by owner" on team_courses for delete to authenticated using (
  auth.uid() in (select owner_id from teams where id = team_id)
);

-- Duels: readable by participants
create policy "Duels readable by participants" on duels for select to authenticated using (
  auth.uid() = challenger_id or auth.uid() = opponent_id
);
create policy "Duels insertable" on duels for insert to authenticated with check (auth.uid() = challenger_id);
create policy "Duels updatable by participants" on duels for update to authenticated using (
  auth.uid() = challenger_id or auth.uid() = opponent_id
);

-- Duel responses: readable by duel participants, insertable by self
create policy "Duel responses readable" on duel_responses for select to authenticated using (
  auth.uid() = user_id or
  duel_id in (select id from duels where challenger_id = auth.uid() or opponent_id = auth.uid())
);
create policy "Duel responses insertable" on duel_responses for insert to authenticated with check (auth.uid() = user_id);

-- ─── INDEXES ─────────────────────────────────────────────────

create index if not exists idx_team_members_team on team_members(team_id);
create index if not exists idx_team_members_user on team_members(user_id);
create index if not exists idx_team_invites_user on team_invites(invited_user_id);
create index if not exists idx_team_courses_team on team_courses(team_id);
create index if not exists idx_duels_challenger on duels(challenger_id);
create index if not exists idx_duels_opponent on duels(opponent_id);
create index if not exists idx_duels_status on duels(status);
create index if not exists idx_duel_responses_duel on duel_responses(duel_id);
