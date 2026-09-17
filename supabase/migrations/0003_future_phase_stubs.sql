-- Forward-looking stub tables for Phase 2/3 (Strava sync, Gemini AI coach).
-- Not wired into any Phase 1 UI. RLS is enabled now so later phases are
-- additive-only migrations with no security follow-up required.

create table public.integrations (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'strava',
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  athlete_id text,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  constraint integrations_user_provider_unique unique (user_id, provider)
);

create index integrations_user_id_idx on public.integrations (user_id);

create table public.ai_chat_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index ai_chat_history_user_created_idx on public.ai_chat_history (user_id, created_at);

alter table public.integrations enable row level security;
alter table public.ai_chat_history enable row level security;

create policy integrations_owner_all
  on public.integrations for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy ai_chat_history_owner_all
  on public.ai_chat_history for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
