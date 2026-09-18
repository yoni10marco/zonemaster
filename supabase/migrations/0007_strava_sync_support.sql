-- Strava sync support.
--
-- 1. integrations stores OAuth tokens. With the original owner-only RLS policy
--    the browser could read its own access/refresh token, which is the whole
--    credential. Tokens are now only readable/writable through the service
--    role (server code); the browser gets column-level SELECT on the harmless
--    status columns and may delete its own row (disconnect).
-- 2. last_synced_at drives incremental imports.
-- 3. A unique (user_id, external_activity_id) makes re-imports idempotent.
--    NULLs (manual logs) are distinct in Postgres, so they are unaffected.

alter table public.integrations
  add column last_synced_at timestamptz;

revoke all on public.integrations from anon, authenticated;

grant select (id, user_id, provider, athlete_id, connected_at, created_at, expires_at, last_synced_at)
  on public.integrations to authenticated;
grant delete on public.integrations to authenticated;

alter table public.completed_workouts
  add constraint completed_workouts_user_external_activity_unique
  unique (user_id, external_activity_id);
