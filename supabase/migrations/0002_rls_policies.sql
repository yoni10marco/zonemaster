-- Row Level Security: owner-only access to profiles, planned_workouts, completed_workouts.

alter table public.profiles enable row level security;
alter table public.planned_workouts enable row level security;
alter table public.completed_workouts enable row level security;

-- profiles: user may read/update their own row. Insert is handled by the
-- security-definer handle_new_user trigger, not direct client inserts.
create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- planned_workouts: full CRUD restricted to the owning user.
create policy planned_workouts_select_own
  on public.planned_workouts for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy planned_workouts_insert_own
  on public.planned_workouts for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy planned_workouts_update_own
  on public.planned_workouts for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy planned_workouts_delete_own
  on public.planned_workouts for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- completed_workouts: full CRUD restricted to the owning user.
create policy completed_workouts_select_own
  on public.completed_workouts for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy completed_workouts_insert_own
  on public.completed_workouts for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy completed_workouts_update_own
  on public.completed_workouts for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy completed_workouts_delete_own
  on public.completed_workouts for delete
  to authenticated
  using ((select auth.uid()) = user_id);
