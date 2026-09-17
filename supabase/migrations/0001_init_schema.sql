-- Zone Master Phase 1 core schema: profiles, planned_workouts, completed_workouts.

create type public.discipline as enum ('swim', 'bike', 'run', 'strength', 'other');
create type public.intensity_zone as enum ('z1', 'z2', 'z3', 'z4', 'z5');
create type public.workout_source as enum ('manual', 'strava');
create type public.fitness_level as enum ('beginner', 'intermediate', 'advanced');

-- Profile table extending auth.users (1:1, PK = auth.users.id).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  fitness_level public.fitness_level not null default 'intermediate',
  primary_discipline public.discipline not null default 'run',
  target_race_date date,
  target_race_distance text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Planned workouts: the calendar's core entity.
create table public.planned_workouts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  target_date date not null,
  discipline public.discipline not null,
  planned_duration_minutes integer,
  planned_distance_km numeric(6, 2),
  target_zone public.intensity_zone,
  title text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planned_workouts_duration_or_distance check (
    planned_duration_minutes is not null or planned_distance_km is not null
  )
);

create index planned_workouts_user_date_idx on public.planned_workouts (user_id, target_date);

-- Completed workouts: manual for Phase 1; source/columns anticipate Strava sync.
create table public.completed_workouts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  planned_workout_id bigint references public.planned_workouts (id) on delete set null,
  source public.workout_source not null default 'manual',
  execution_date date not null,
  discipline public.discipline not null,
  actual_duration_minutes integer,
  actual_distance_km numeric(6, 2),
  rpe smallint check (rpe between 1 and 10),
  avg_heart_rate integer,
  avg_pace_or_power text,
  external_activity_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint completed_workouts_duration_or_distance check (
    actual_duration_minutes is not null or actual_distance_km is not null
  )
);

create index completed_workouts_user_date_idx on public.completed_workouts (user_id, execution_date);
create index completed_workouts_planned_workout_id_idx on public.completed_workouts (planned_workout_id);

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Shared updated_at maintenance trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger planned_workouts_set_updated_at
  before update on public.planned_workouts
  for each row execute function public.set_updated_at();

create trigger completed_workouts_set_updated_at
  before update on public.completed_workouts
  for each row execute function public.set_updated_at();
