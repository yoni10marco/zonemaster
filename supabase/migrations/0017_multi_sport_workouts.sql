-- Multi-sport ("brick") workouts: one calendar entry that covers more than one
-- discipline (e.g. a bike leg then a run leg), instead of two separate
-- workouts. The existing discipline/duration/distance/zone columns keep
-- describing the FIRST leg exactly as before (every existing row and every
-- query that only knows about those columns keeps working unchanged); extra
-- legs go in a new nullable `extra_segments` column, one JSON object per leg.
-- Owner-only RLS already covers the whole row, so no policy changes are needed.

-- A planned leg: discipline plus duration and/or distance and an optional zone.
create or replace function public.valid_planned_segments(data jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    jsonb_typeof(data) = 'array'
    and jsonb_array_length(data) between 1 and 4
    and not exists (
      select 1 from jsonb_array_elements(data) as seg
      where jsonb_typeof(seg) <> 'object'
        or not (seg ->> 'discipline') = any (enum_range(null::public.discipline)::text[])
        or (seg ->> 'planned_duration_minutes') is not null
           and (seg ->> 'planned_duration_minutes') !~ '^\d+$'
        or (seg ->> 'planned_distance_km') is not null
           and (seg ->> 'planned_distance_km')::numeric <= 0
        or (seg ->> 'target_zone') is not null
           and not (seg ->> 'target_zone') = any (enum_range(null::public.intensity_zone)::text[])
        or (seg ->> 'planned_duration_minutes') is null and (seg ->> 'planned_distance_km') is null
    )
$$;

-- A completed leg: discipline plus how it actually went.
create or replace function public.valid_completed_segments(data jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    jsonb_typeof(data) = 'array'
    and jsonb_array_length(data) between 1 and 4
    and not exists (
      select 1 from jsonb_array_elements(data) as seg
      where jsonb_typeof(seg) <> 'object'
        or not (seg ->> 'discipline') = any (enum_range(null::public.discipline)::text[])
        or (seg ->> 'actual_duration_minutes') is not null
           and (seg ->> 'actual_duration_minutes') !~ '^\d+$'
        or (seg ->> 'actual_distance_km') is not null
           and (seg ->> 'actual_distance_km')::numeric <= 0
        or (seg ->> 'actual_duration_minutes') is null and (seg ->> 'actual_distance_km') is null
    )
$$;

alter table public.planned_workouts
  add column extra_segments jsonb,
  add constraint planned_workouts_extra_segments_shape
    check (extra_segments is null or public.valid_planned_segments(extra_segments));

alter table public.completed_workouts
  add column extra_segments jsonb,
  add constraint completed_workouts_extra_segments_shape
    check (extra_segments is null or public.valid_completed_segments(extra_segments));

-- Execute is deliberately left at its default (PUBLIC) for these two: a CHECK
-- constraint runs as the writing role, not the function owner, so revoking it
-- from `authenticated` here would break every insert/update instead of just
-- hiding an RPC. They are pure, stateless and read nothing, so being callable
-- directly costs nothing.
