-- A planned workout should have at most one completion linked to it — the
-- app previously allowed logging a completion against an already-completed
-- workout with no guard, silently creating duplicates. Enforce it at the
-- database level as well as in the UI. NULL planned_workout_id (unplanned/
-- standalone completions) are intentionally exempt via the partial index.

create unique index completed_workouts_planned_workout_id_unique
  on public.completed_workouts (planned_workout_id)
  where planned_workout_id is not null;
