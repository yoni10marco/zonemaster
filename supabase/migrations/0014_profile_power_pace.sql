-- Inputs for power and pace training zones. All optional and independent:
--   ftp_watts             bike functional threshold power (watts)
--   run_threshold_pace_sec run threshold pace, seconds per km
--   swim_css_sec          swim critical speed pace, seconds per 100 m
-- Zones are computed in the app from these. Existing owner-only RLS on profiles
-- already covers the new columns.

alter table public.profiles
  add column ftp_watts smallint
    constraint profiles_ftp_watts_range check (ftp_watts between 50 and 600),
  add column run_threshold_pace_sec smallint
    constraint profiles_run_threshold_pace_range check (run_threshold_pace_sec between 150 and 600),
  add column swim_css_sec smallint
    constraint profiles_swim_css_range check (swim_css_sec between 50 and 300);
