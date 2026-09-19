-- Activities imported from a FIT / TCX / GPX file are saved with source 'file'.
-- Additive: existing rows and code are unaffected.
alter type public.workout_source add value if not exists 'file';
