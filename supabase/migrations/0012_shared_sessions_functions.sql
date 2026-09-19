-- Friends, slice 2: shared sessions (functions). See 0011 for the tables.
--
-- What a session member can learn about the others: their usernames, whether
-- they accepted, and a yes/no "completed". Never durations, distances, notes or
-- anything else from their calendar. Every function pins search_path and is
-- callable by signed-in users only; the internal helpers are not callable by
-- clients at all.

-- ---------------------------------------------------------------------------
-- Internal helpers (no client access)
-- ---------------------------------------------------------------------------
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and least(f.requester_id, f.addressee_id) = least(a, b)
      and greatest(f.requester_id, f.addressee_id) = greatest(a, b)
  );
$$;

-- A session with fewer than two people still in it (accepted or invited) is
-- just a normal workout again, so it is removed. Declines are kept until then
-- so the creator can see them.
create or replace function public.prune_shared_session(p_session_id bigint)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.shared_session_members m
        where m.session_id = p_session_id and m.status in ('accepted', 'invited')) < 2 then
    delete from public.shared_sessions where id = p_session_id;
  end if;
end;
$$;

-- When two people stop being friends (or one blocks the other), they leave each
-- other's shared sessions: the one who was invited is removed from sessions the
-- other started. Their calendar copies stay, as ordinary workouts.
create or replace function public.detach_members_between(a uuid, b uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  affected bigint[];
begin
  with removed as (
    delete from public.shared_session_members m
    using public.shared_sessions s
    where m.session_id = s.id
      and ((s.creator_id = a and m.user_id = b) or (s.creator_id = b and m.user_id = a))
    returning m.session_id, m.planned_workout_id
  ), unlinked as (
    update public.planned_workouts w set shared_session_id = null
    from removed r
    where w.id = r.planned_workout_id
    returning w.id
  )
  select coalesce(array_agg(distinct r.session_id), '{}'::bigint[]) into affected from removed r;

  perform public.prune_shared_session(sid) from unnest(affected) as t(sid);
end;
$$;

-- Deleting your own copy of a shared workout means leaving the session.
create or replace function public.leave_session_on_workout_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.shared_session_id is not null then
    delete from public.shared_session_members m
      where m.session_id = old.shared_session_id and m.user_id = old.user_id;
    perform public.prune_shared_session(old.shared_session_id);
  end if;
  return old;
end;
$$;

-- AFTER delete: pruning a session updates other workouts, and must not touch
-- the row that is being deleted.
create trigger planned_workouts_leave_session
  after delete on public.planned_workouts
  for each row execute function public.leave_session_on_workout_delete();

revoke all on function public.are_friends(uuid, uuid) from public, anon, authenticated;
revoke all on function public.prune_shared_session(bigint) from public, anon, authenticated;
revoke all on function public.detach_members_between(uuid, uuid) from public, anon, authenticated;
revoke all on function public.leave_session_on_workout_delete() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Creating and inviting
-- ---------------------------------------------------------------------------

-- Turn one of YOUR workouts into a shared session and invite friends to it.
create or replace function public.create_shared_session(p_planned_workout_id bigint, p_friend_ids uuid[])
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  w public.planned_workouts%rowtype;
  ids uuid[];
  fid uuid;
  new_id bigint;
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  select * into w from public.planned_workouts pw where pw.id = p_planned_workout_id and pw.user_id = me;
  if not found then
    raise exception 'That workout was not found.' using errcode = 'P0001';
  end if;
  if w.shared_session_id is not null then
    raise exception 'This workout is already shared. Invite more friends from its details.' using errcode = 'P0001';
  end if;

  select coalesce(array_agg(distinct t.x), '{}'::uuid[]) into ids
    from unnest(p_friend_ids) as t(x) where t.x is not null and t.x <> me;
  if coalesce(array_length(ids, 1), 0) = 0 then
    raise exception 'Choose at least one friend.' using errcode = 'P0001';
  end if;
  if array_length(ids, 1) > 7 then
    raise exception 'A session can have up to 8 people.' using errcode = 'P0001';
  end if;
  foreach fid in array ids loop
    if not public.are_friends(me, fid) then
      raise exception 'You can only invite your friends.' using errcode = 'P0001';
    end if;
  end loop;

  insert into public.shared_sessions
    (creator_id, target_date, discipline, title, notes, planned_duration_minutes, planned_distance_km, target_zone)
    values (me, w.target_date, w.discipline, w.title, w.notes, w.planned_duration_minutes, w.planned_distance_km, w.target_zone)
    returning id into new_id;

  insert into public.shared_session_members (session_id, user_id, status, planned_workout_id, responded_at)
    values (new_id, me, 'accepted', w.id, now());
  update public.planned_workouts set shared_session_id = new_id where id = w.id;

  insert into public.shared_session_members (session_id, user_id)
    select new_id, t.x from unnest(ids) as t(x);

  return new_id;
end;
$$;

-- The person who started a session can invite more friends (up to 8 people),
-- or invite again someone who declined.
create or replace function public.invite_to_shared_session(p_session_id bigint, p_friend_ids uuid[])
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  ids uuid[];
  fid uuid;
  current_count int;
  new_count int;
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.shared_sessions s
      join public.shared_session_members m on m.session_id = s.id and m.user_id = me and m.status = 'accepted'
    where s.id = p_session_id and s.creator_id = me
  ) then
    raise exception 'Only the person who started this session can invite more friends.' using errcode = 'P0001';
  end if;

  select coalesce(array_agg(distinct t.x), '{}'::uuid[]) into ids
    from unnest(p_friend_ids) as t(x) where t.x is not null and t.x <> me;
  if coalesce(array_length(ids, 1), 0) = 0 then
    raise exception 'Choose at least one friend.' using errcode = 'P0001';
  end if;
  foreach fid in array ids loop
    if not public.are_friends(me, fid) then
      raise exception 'You can only invite your friends.' using errcode = 'P0001';
    end if;
  end loop;

  select count(*) into current_count from public.shared_session_members m where m.session_id = p_session_id;
  select count(*) into new_count from unnest(ids) as t(x)
    where not exists (select 1 from public.shared_session_members m where m.session_id = p_session_id and m.user_id = t.x);
  if current_count + new_count > 8 then
    raise exception 'A session can have up to 8 people.' using errcode = 'P0001';
  end if;

  insert into public.shared_session_members (session_id, user_id)
    select p_session_id, t.x from unnest(ids) as t(x)
  on conflict (session_id, user_id) do update
    set status = 'invited', invited_at = now(), responded_at = null
    where public.shared_session_members.status = 'declined';
end;
$$;

-- ---------------------------------------------------------------------------
-- Answering invitations
-- ---------------------------------------------------------------------------
create or replace function public.list_session_invites()
returns table (
  session_id bigint,
  creator_username text,
  target_date date,
  discipline public.discipline,
  title text,
  notes text,
  planned_duration_minutes integer,
  planned_distance_km numeric,
  target_zone public.intensity_zone,
  other_members text[],
  invited_at timestamptz
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
  return query
    select
      s.id,
      cu.username,
      s.target_date,
      s.discipline,
      s.title,
      s.notes,
      s.planned_duration_minutes,
      s.planned_distance_km,
      s.target_zone,
      coalesce((
        select array_agg(op.username order by op.username)
        from public.shared_session_members om
        join public.profiles op on op.id = om.user_id
        where om.session_id = s.id and om.user_id <> me and om.user_id is distinct from s.creator_id
          and om.status <> 'declined' and op.username is not null
      ), '{}'::text[]),
      m.invited_at
    from public.shared_session_members m
    join public.shared_sessions s on s.id = m.session_id
    left join public.profiles cu on cu.id = s.creator_id
    where m.user_id = me and m.status = 'invited'
    order by s.target_date, s.id;
end;
$$;

-- Accepting adds the session to YOUR calendar as your own workout and returns
-- its id; declining returns null.
create or replace function public.respond_session_invite(p_session_id bigint, p_accept boolean)
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  s public.shared_sessions%rowtype;
  new_workout bigint;
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  perform 1 from public.shared_session_members m
    where m.session_id = p_session_id and m.user_id = me and m.status = 'invited'
    for update;
  if not found then
    raise exception 'That invitation is no longer available.' using errcode = 'P0001';
  end if;

  if not p_accept then
    update public.shared_session_members set status = 'declined', responded_at = now()
      where session_id = p_session_id and user_id = me;
    return null;
  end if;

  select * into s from public.shared_sessions ss where ss.id = p_session_id;
  insert into public.planned_workouts
    (user_id, target_date, discipline, planned_duration_minutes, planned_distance_km, target_zone, title, notes, shared_session_id)
    values (me, s.target_date, s.discipline, s.planned_duration_minutes, s.planned_distance_km, s.target_zone, s.title, s.notes, s.id)
    returning id into new_workout;
  update public.shared_session_members
    set status = 'accepted', planned_workout_id = new_workout, responded_at = now()
    where session_id = p_session_id and user_id = me;
  return new_workout;
end;
$$;

-- Leave a session (or withdraw from an invitation). Your own workout stays on
-- your calendar as an ordinary workout.
create or replace function public.leave_shared_session(p_session_id bigint)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  workout_id bigint;
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  delete from public.shared_session_members m
    where m.session_id = p_session_id and m.user_id = me
    returning m.planned_workout_id into workout_id;
  if not found then
    return;
  end if;

  if workout_id is not null then
    update public.planned_workouts set shared_session_id = null where id = workout_id and user_id = me;
  end if;
  perform public.prune_shared_session(p_session_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- What the other people in my sessions look like: usernames, who accepted, and
-- a yes/no "completed". Only for sessions I have accepted.
-- ---------------------------------------------------------------------------
create or replace function public.shared_session_overview(p_session_ids bigint[])
returns table (
  session_id bigint,
  user_id uuid,
  username text,
  status text,
  completed boolean,
  is_me boolean,
  is_creator boolean
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
  if coalesce(array_length(p_session_ids, 1), 0) > 200 then
    raise exception 'Too many sessions requested.' using errcode = 'P0001';
  end if;
  return query
    select
      m.session_id,
      m.user_id,
      p.username,
      m.status,
      (m.planned_workout_id is not null and exists (
        select 1 from public.completed_workouts c where c.planned_workout_id = m.planned_workout_id
      )),
      (m.user_id = me),
      (s.creator_id is not distinct from m.user_id)
    from public.shared_session_members m
    join public.shared_sessions s on s.id = m.session_id
    join public.profiles p on p.id = m.user_id
    where m.session_id = any (p_session_ids)
      and exists (
        select 1 from public.shared_session_members mine
        where mine.session_id = m.session_id and mine.user_id = me and mine.status = 'accepted'
      )
    order by m.session_id, (m.user_id = me) desc, p.username;
end;
$$;

-- ---------------------------------------------------------------------------
-- Updated from slice 1: session invites now count for the badge, and unfriending
-- or blocking someone takes you out of each other's sessions.
-- ---------------------------------------------------------------------------
create or replace function public.pending_counts()
returns table (friend_requests integer, session_invites integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  return query
    select
      (select count(*)::integer from public.friendships f where f.addressee_id = me and f.status = 'pending'),
      (select count(*)::integer from public.shared_session_members m where m.user_id = me and m.status = 'invited');
end;
$$;

create or replace function public.remove_friend(p_user_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  delete from public.friendships f
    where least(f.requester_id, f.addressee_id) = least(me, p_user_id)
      and greatest(f.requester_id, f.addressee_id) = greatest(me, p_user_id)
      and f.status = 'accepted';
  perform public.detach_members_between(me, p_user_id);
end;
$$;

create or replace function public.block_user(p_user_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  existing public.friendships%rowtype;
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if p_user_id is null or p_user_id = me then
    raise exception 'You can''t block yourself.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.profiles pr where pr.id = p_user_id) then
    raise exception 'Couldn''t block that person.' using errcode = 'P0001';
  end if;

  select * into existing from public.friendships f
    where least(f.requester_id, f.addressee_id) = least(me, p_user_id)
      and greatest(f.requester_id, f.addressee_id) = greatest(me, p_user_id);

  if found then
    if existing.status <> 'blocked' then
      update public.friendships set status = 'blocked', blocked_by = me, responded_at = now()
        where id = existing.id;
    end if;
  else
    insert into public.friendships (requester_id, addressee_id, status, blocked_by, responded_at)
      values (me, p_user_id, 'blocked', me, now());
  end if;

  perform public.detach_members_between(me, p_user_id);
end;
$$;

-- Only signed-in users may call the public functions.
revoke all on function public.create_shared_session(bigint, uuid[]) from public, anon;
revoke all on function public.invite_to_shared_session(bigint, uuid[]) from public, anon;
revoke all on function public.list_session_invites() from public, anon;
revoke all on function public.respond_session_invite(bigint, boolean) from public, anon;
revoke all on function public.leave_shared_session(bigint) from public, anon;
revoke all on function public.shared_session_overview(bigint[]) from public, anon;
revoke all on function public.pending_counts() from public, anon;
revoke all on function public.remove_friend(uuid) from public, anon;
revoke all on function public.block_user(uuid) from public, anon;

grant execute on function public.create_shared_session(bigint, uuid[]) to authenticated;
grant execute on function public.invite_to_shared_session(bigint, uuid[]) to authenticated;
grant execute on function public.list_session_invites() to authenticated;
grant execute on function public.respond_session_invite(bigint, boolean) to authenticated;
grant execute on function public.leave_shared_session(bigint) to authenticated;
grant execute on function public.shared_session_overview(bigint[]) to authenticated;
grant execute on function public.pending_counts() to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.block_user(uuid) to authenticated;
