-- Friends, slice 1: identity (username + immutable friend ID) and friendships.
--
-- Privacy model: a friendship shows a friend NOTHING of your calendar. Nothing
-- in this migration lets one user read another user's profile or workouts.
-- Clients never write to the friend tables directly; every action goes through
-- one of the security-definer functions below, which return only the minimum
-- (a username and the state of the relationship).

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Friend ID: 8 characters from a 32-character alphabet without look-alikes
-- (no 0/O/1/I), drawn from a cryptographic source. 32^8 ~ 10^12 possibilities.
-- ---------------------------------------------------------------------------
create or replace function public.generate_friend_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  bytes bytea;
  candidate text;
  i int;
begin
  loop
    bytes := extensions.gen_random_bytes(8);
    candidate := '';
    for i in 0..7 loop
      -- 256 is a multiple of 32, so the low 5 bits of a byte are unbiased.
      candidate := candidate || substr(alphabet, (get_byte(bytes, i) & 31) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.profiles p where p.friend_code = candidate);
  end loop;
  return candidate;
end;
$$;

revoke all on function public.generate_friend_code() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Profiles: username (chosen, changeable, not unique) + friend_code (permanent).
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column username text,
  add column friend_code text;

-- Existing accounts get a friend ID now; new signups get one from the default.
update public.profiles set friend_code = public.generate_friend_code() where friend_code is null;

alter table public.profiles
  alter column friend_code set default public.generate_friend_code(),
  alter column friend_code set not null,
  add constraint profiles_friend_code_unique unique (friend_code),
  add constraint profiles_friend_code_format check (friend_code ~ '^[2-9A-HJ-NP-Z]{8}$'),
  add constraint profiles_username_format check (username is null or username ~ '^[a-z0-9_]{3,20}$');

-- The friend ID can never change, not even for the owner or the service role.
create or replace function public.protect_friend_code()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.friend_code is distinct from old.friend_code then
    raise exception 'The friend ID cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_friend_code
  before update on public.profiles
  for each row execute function public.protect_friend_code();

-- ---------------------------------------------------------------------------
-- Friendships: one row per pair of people, whichever way the request went.
-- ---------------------------------------------------------------------------
create table public.friendships (
  id bigint generated always as identity primary key,
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  blocked_by uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_not_self check (requester_id <> addressee_id),
  constraint friendships_blocker_is_participant
    check (blocked_by is null or blocked_by in (requester_id, addressee_id)),
  constraint friendships_blocker_matches_status check ((status = 'blocked') = (blocked_by is not null))
);

-- At most one row per pair, in either direction.
create unique index friendships_pair_unique
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_requester_idx on public.friendships (requester_id);
create index friendships_addressee_idx on public.friendships (addressee_id);
create index friendships_blocked_by_idx on public.friendships (blocked_by) where blocked_by is not null;

alter table public.friendships enable row level security;

-- Participants may read their own rows; a block is visible only to whoever set it.
create policy friendships_select_participant
  on public.friendships for select
  to authenticated
  using (
    (select auth.uid()) in (requester_id, addressee_id)
    and (status <> 'blocked' or blocked_by = (select auth.uid()))
  );

-- No insert/update/delete access at all from the browser: functions only.
revoke all on public.friendships from anon, authenticated;
grant select on public.friendships to authenticated;

-- ---------------------------------------------------------------------------
-- Rate-limit log for searches and requests (touched only by the functions).
-- ---------------------------------------------------------------------------
create table public.friend_actions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('lookup', 'request')),
  created_at timestamptz not null default now()
);
create index friend_actions_user_kind_created_idx on public.friend_actions (user_id, kind, created_at desc);
alter table public.friend_actions enable row level security;
revoke all on public.friend_actions from anon, authenticated;
