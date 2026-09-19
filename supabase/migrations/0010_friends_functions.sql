-- Friends, slice 1: the functions clients call. See 0009 for the tables and the privacy model.

-- ---------------------------------------------------------------------------
-- Functions (all run as the owner, pin search_path, and are callable only by
-- signed-in users).
-- ---------------------------------------------------------------------------

-- Find one person by their exact username AND friend ID. Behaves as "not found"
-- for yourself, for unknown pairs and for anyone with a block between you.
create or replace function public.find_user(p_username text, p_friend_code text)
returns table (user_id uuid, username text, relationship text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  me uuid := auth.uid();
  uname text := lower(btrim(coalesce(p_username, '')));
  code text := upper(regexp_replace(coalesce(p_friend_code, ''), '[\s-]', '', 'g'));
  target public.profiles%rowtype;
  fs public.friendships%rowtype;
  fs_found boolean;
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  delete from public.friend_actions a where a.created_at < now() - interval '2 days';
  if (select count(*) from public.friend_actions a
        where a.user_id = me and a.kind = 'lookup' and a.created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Too many searches. Please try again in a while.' using errcode = 'P0001';
  end if;
  insert into public.friend_actions (user_id, kind) values (me, 'lookup');

  select * into target from public.profiles pr
    where pr.username = uname and pr.friend_code = code and pr.id <> me;
  if not found then
    return;
  end if;

  select * into fs from public.friendships f
    where least(f.requester_id, f.addressee_id) = least(me, target.id)
      and greatest(f.requester_id, f.addressee_id) = greatest(me, target.id);
  fs_found := found;

  if fs_found and fs.status = 'blocked' then
    return;
  end if;

  return query select
    target.id,
    target.username,
    case
      when not fs_found then 'none'
      when fs.status = 'accepted' then 'friends'
      when fs.requester_id = me then 'pending_out'
      else 'pending_in'
    end;
end;
$$;

create or replace function public.send_friend_request(p_user_id uuid)
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  my_username text;
  existing public.friendships%rowtype;
  new_id bigint;
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if p_user_id is null or p_user_id = me then
    raise exception 'You can''t add yourself.' using errcode = 'P0001';
  end if;

  select pr.username into my_username from public.profiles pr where pr.id = me;
  if my_username is null then
    raise exception 'Choose a username in Settings first, so your friend can see who the request is from.'
      using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.profiles pr where pr.id = p_user_id and pr.username is not null) then
    raise exception 'Couldn''t send that request.' using errcode = 'P0001';
  end if;

  if (select count(*) from public.friend_actions a
        where a.user_id = me and a.kind = 'request' and a.created_at > now() - interval '1 day') >= 20 then
    raise exception 'You''ve sent a lot of requests today. Please try again tomorrow.' using errcode = 'P0001';
  end if;

  select * into existing from public.friendships f
    where least(f.requester_id, f.addressee_id) = least(me, p_user_id)
      and greatest(f.requester_id, f.addressee_id) = greatest(me, p_user_id);

  if found then
    if existing.status = 'blocked' then
      raise exception 'Couldn''t send that request.' using errcode = 'P0001';
    elsif existing.status = 'accepted' then
      raise exception 'You are already friends.' using errcode = 'P0001';
    elsif existing.requester_id = me then
      raise exception 'You already sent a request to this person.' using errcode = 'P0001';
    end if;
    -- They had already asked you: sending one back simply accepts theirs.
    update public.friendships set status = 'accepted', responded_at = now() where id = existing.id;
    return existing.id;
  end if;

  insert into public.friend_actions (user_id, kind) values (me, 'request');
  insert into public.friendships (requester_id, addressee_id) values (me, p_user_id) returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.respond_friend_request(p_friendship_id bigint, p_accept boolean)
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

  if p_accept then
    update public.friendships set status = 'accepted', responded_at = now()
      where id = p_friendship_id and addressee_id = me and status = 'pending';
  else
    delete from public.friendships
      where id = p_friendship_id and addressee_id = me and status = 'pending';
  end if;
  if not found then
    raise exception 'That request is no longer available.' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.cancel_friend_request(p_friendship_id bigint)
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
  delete from public.friendships
    where id = p_friendship_id and requester_id = me and status = 'pending';
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
    -- If they already blocked you, their block stands and nothing changes.
    if existing.status <> 'blocked' then
      update public.friendships set status = 'blocked', blocked_by = me, responded_at = now()
        where id = existing.id;
    end if;
  else
    insert into public.friendships (requester_id, addressee_id, status, blocked_by, responded_at)
      values (me, p_user_id, 'blocked', me, now());
  end if;
end;
$$;

create or replace function public.unblock_user(p_user_id uuid)
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
      and f.status = 'blocked' and f.blocked_by = me;
end;
$$;

-- Your friends, incoming/outgoing requests and the people you blocked, with the
-- other person's username only.
create or replace function public.list_friendships()
returns table (friendship_id bigint, other_user_id uuid, username text, kind text, created_at timestamptz)
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
      f.id,
      o.id,
      o.username,
      case
        when f.status = 'accepted' then 'friend'
        when f.status = 'blocked' then 'blocked'
        when f.requester_id = me then 'outgoing'
        else 'incoming'
      end,
      f.created_at
    from public.friendships f
    join public.profiles o
      on o.id = case when f.requester_id = me then f.addressee_id else f.requester_id end
    where me in (f.requester_id, f.addressee_id)
      and (f.status <> 'blocked' or f.blocked_by = me)
    order by f.created_at desc;
end;
$$;

-- Numbers for the menu badge (session invites arrive in a later slice).
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
      0;
end;
$$;

-- Only signed-in users may call any of these.
revoke all on function public.find_user(text, text) from public, anon;
revoke all on function public.send_friend_request(uuid) from public, anon;
revoke all on function public.respond_friend_request(bigint, boolean) from public, anon;
revoke all on function public.cancel_friend_request(bigint) from public, anon;
revoke all on function public.remove_friend(uuid) from public, anon;
revoke all on function public.block_user(uuid) from public, anon;
revoke all on function public.unblock_user(uuid) from public, anon;
revoke all on function public.list_friendships() from public, anon;
revoke all on function public.pending_counts() from public, anon;

grant execute on function public.find_user(text, text) to authenticated;
grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.respond_friend_request(bigint, boolean) to authenticated;
grant execute on function public.cancel_friend_request(bigint) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;
grant execute on function public.list_friendships() to authenticated;
grant execute on function public.pending_counts() to authenticated;
