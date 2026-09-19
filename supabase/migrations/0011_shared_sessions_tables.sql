-- Friends, slice 2: shared sessions (tables). See ROADMAP.md.
--
-- A shared session is one record of what was planned together. Every person in
-- it also has their OWN independent workout on their own calendar, linked to
-- the session. Nothing here is readable or writable from the browser: like the
-- friend tables, access is through security-definer functions only (0012).

create table public.shared_sessions (
  id bigint generated always as identity primary key,
  -- Kept (as null) if the creator's account is deleted, so the others keep the session.
  creator_id uuid references auth.users (id) on delete set null,
  target_date date not null,
  discipline public.discipline not null,
  title text,
  notes text,
  planned_duration_minutes integer,
  planned_distance_km numeric(6, 2),
  target_zone public.intensity_zone,
  created_at timestamptz not null default now(),
  constraint shared_sessions_duration_or_distance
    check (planned_duration_minutes is not null or planned_distance_km is not null)
);
create index shared_sessions_creator_idx on public.shared_sessions (creator_id);

create table public.shared_session_members (
  session_id bigint not null references public.shared_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'accepted', 'declined')),
  -- The member's own copy on their calendar (set once they accept).
  planned_workout_id bigint references public.planned_workouts (id) on delete set null,
  invited_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (session_id, user_id)
);
create index shared_session_members_user_status_idx on public.shared_session_members (user_id, status);
create index shared_session_members_workout_idx
  on public.shared_session_members (planned_workout_id) where planned_workout_id is not null;

-- Lets a calendar card know it belongs to a shared session.
alter table public.planned_workouts
  add column shared_session_id bigint references public.shared_sessions (id) on delete set null;
create index planned_workouts_shared_session_idx
  on public.planned_workouts (shared_session_id) where shared_session_id is not null;

-- Only the database functions may link a workout to a session (the browser can
-- edit its own workouts, but not this column).
create or replace function public.guard_shared_session_link()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon')
     and ((tg_op = 'INSERT' and new.shared_session_id is not null)
       or (tg_op = 'UPDATE' and new.shared_session_id is distinct from old.shared_session_id)) then
    raise exception 'A workout can only be linked to a shared session by inviting or accepting an invitation'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger planned_workouts_guard_shared_session
  before insert or update on public.planned_workouts
  for each row execute function public.guard_shared_session_link();

-- No direct access from the browser at all.
alter table public.shared_sessions enable row level security;
alter table public.shared_session_members enable row level security;
revoke all on public.shared_sessions from anon, authenticated;
revoke all on public.shared_session_members from anon, authenticated;

-- Explicit "no rows for anyone" policies (the tables above and the rate-limit
-- log from 0009), so it is obvious the lack of access is deliberate.
create policy shared_sessions_no_direct_access on public.shared_sessions
  for all to authenticated using (false) with check (false);
create policy shared_session_members_no_direct_access on public.shared_session_members
  for all to authenticated using (false) with check (false);
create policy friend_actions_no_direct_access on public.friend_actions
  for all to authenticated using (false) with check (false);
