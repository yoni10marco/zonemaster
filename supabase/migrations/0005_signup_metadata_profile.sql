-- Fix: when email confirmation is required, signUp() returns no session, so
-- a client-side profiles UPDATE right after signUp is silently blocked by
-- RLS (anon role, no auth.uid()). Instead, read onboarding fields from
-- auth.users.raw_user_meta_data (passed via signUp's options.data), which
-- the security-definer trigger can access regardless of session state.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_fitness_level public.fitness_level;
  v_primary_discipline public.discipline;
  v_target_race_date date;
begin
  begin
    v_fitness_level := (meta ->> 'fitness_level')::public.fitness_level;
  exception when others then
    v_fitness_level := null;
  end;

  begin
    v_primary_discipline := (meta ->> 'primary_discipline')::public.discipline;
  exception when others then
    v_primary_discipline := null;
  end;

  begin
    v_target_race_date := nullif(meta ->> 'target_race_date', '')::date;
  exception when others then
    v_target_race_date := null;
  end;

  insert into public.profiles (
    id, email, fitness_level, primary_discipline, target_race_date, target_race_distance
  )
  values (
    new.id,
    new.email,
    coalesce(v_fitness_level, 'intermediate'),
    coalesce(v_primary_discipline, 'run'),
    v_target_race_date,
    nullif(meta ->> 'target_race_distance', '')
  );
  return new;
end;
$$;
