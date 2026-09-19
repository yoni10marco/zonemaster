-- Let a new account choose its username at signup. It arrives in the signup
-- metadata like the other onboarding fields. It is only used when it is a
-- valid username (3-20 lowercase letters, digits or _); anything else is
-- ignored so a bad value can never make signup fail. The user can still set or
-- change it later in Settings.

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
  v_username text := lower(btrim(coalesce(meta ->> 'username', '')));
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

  if v_username !~ '^[a-z0-9_]{3,20}$' then
    v_username := null;
  end if;

  insert into public.profiles (
    id, email, fitness_level, primary_discipline, target_race_date, target_race_distance, username
  )
  values (
    new.id,
    new.email,
    coalesce(v_fitness_level, 'intermediate'),
    coalesce(v_primary_discipline, 'run'),
    v_target_race_date,
    nullif(meta ->> 'target_race_distance', ''),
    v_username
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
