-- Self-service account deletion. Deleting the auth user cascades to everything
-- the person owns: profile, planned and completed workouts, coach chat,
-- friendships and their sessions memberships. A shared session they started
-- stays for the others (creator becomes null); a session that would be left
-- with fewer than two people is removed by the existing cleanup trigger.
--
-- Callable by signed-in users only, and only ever deletes the caller.

create or replace function public.delete_my_account()
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
  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
