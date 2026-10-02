-- Friends' training feed: a second, narrower exception to the "a friendship
-- shows a friend NOTHING of your calendar" rule from 0009. A user can share
-- their planned workouts (not completed-workout history, not anything else)
-- with their friends for a rolling window; the client always asks for +/-7
-- days around today. On by default (product decision), reversible any time
-- from Settings. Direct table access stays exactly as locked down as before —
-- only this one function can see across users, the same way
-- shared_session_overview and list_session_invites already do.

alter table public.profiles
  add column share_planned_workouts boolean not null default true;

create or replace function public.list_friends_workouts(p_from date, p_to date)
returns table (
  workout_id bigint,
  owner_id uuid,
  username text,
  target_date date,
  discipline public.discipline,
  title text,
  notes text,
  planned_duration_minutes integer,
  planned_distance_km numeric,
  target_zone public.intensity_zone,
  extra_segments jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if p_from is null or p_to is null or p_to < p_from or (p_to - p_from) > 31 then
    raise exception 'Invalid date range.' using errcode = 'P0001';
  end if;
  return query
    select pw.id, pw.user_id, pr.username, pw.target_date, pw.discipline, pw.title, pw.notes,
           pw.planned_duration_minutes, pw.planned_distance_km, pw.target_zone, pw.extra_segments
    from public.planned_workouts pw
    join public.profiles pr on pr.id = pw.user_id
    where pw.user_id <> me
      and pr.share_planned_workouts = true
      and pw.target_date between p_from and p_to
      and public.are_friends(me, pw.user_id)
    order by pw.target_date, pr.username;
end;
$$;

revoke all on function public.list_friends_workouts(date, date) from public, anon;
grant execute on function public.list_friends_workouts(date, date) to authenticated;
