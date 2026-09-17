-- Advisor fix: handle_new_user is a SECURITY DEFINER trigger function and was
-- flagged as callable via PostgREST RPC by anon/authenticated. It can only
-- ever run correctly as an AFTER INSERT trigger on auth.users, but revoke
-- direct EXECUTE as defense in depth.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
