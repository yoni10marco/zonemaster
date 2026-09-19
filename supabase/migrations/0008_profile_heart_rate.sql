-- Heart-rate inputs for training zones. Both are optional; zones are computed
-- in the app from these (percent of max, or heart-rate reserve when a resting
-- rate is also given). Existing owner-only RLS on profiles already covers them.

alter table public.profiles
  add column max_heart_rate smallint
    constraint profiles_max_heart_rate_range check (max_heart_rate between 100 and 230),
  add column resting_heart_rate smallint
    constraint profiles_resting_heart_rate_range check (resting_heart_rate between 30 and 120),
  add constraint profiles_resting_below_max
    check (resting_heart_rate is null or max_heart_rate is null or resting_heart_rate < max_heart_rate);
