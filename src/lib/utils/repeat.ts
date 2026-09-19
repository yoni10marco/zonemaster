import type { PlannedWorkout, PlannedWorkoutInsert } from "@/hooks/usePlannedWorkouts"
import { addDaysISO } from "@/lib/utils/dates"

/** How many extra weeks a workout can be repeated for (the "Repeat" menu). */
export const REPEAT_WEEK_OPTIONS = [1, 2, 3, 4, 5] as const
export const MAX_REPEAT_WEEKS = 5

export type WorkoutFields = Omit<PlannedWorkoutInsert, "user_id">

/** Dates of the copies: the same weekday, 1..extraWeeks weeks after `startISO`. */
export function repeatDates(startISO: string, extraWeeks: number): string[] {
  const count = Math.max(0, Math.min(MAX_REPEAT_WEEKS, Math.floor(extraWeeks) || 0))
  return Array.from({ length: count }, (_, i) => addDaysISO(startISO, 7 * (i + 1)))
}

/** The copyable fields of a workout (no id, owner or timestamps), on a new date. */
export function copyFields(workout: PlannedWorkout, targetDate: string): WorkoutFields {
  return {
    target_date: targetDate,
    discipline: workout.discipline,
    title: workout.title,
    notes: workout.notes,
    planned_duration_minutes: workout.planned_duration_minutes,
    planned_distance_km: workout.planned_distance_km,
    target_zone: workout.target_zone,
  }
}

type Comparable = Pick<
  PlannedWorkout,
  | "target_date"
  | "discipline"
  | "title"
  | "planned_duration_minutes"
  | "planned_distance_km"
  | "target_zone"
>

function sameWorkout(a: Comparable, b: Comparable): boolean {
  return (
    a.target_date === b.target_date &&
    a.discipline === b.discipline &&
    (a.title ?? "") === (b.title ?? "") &&
    (a.planned_duration_minutes ?? null) === (b.planned_duration_minutes ?? null) &&
    (a.planned_distance_km ?? null) === (b.planned_distance_km ?? null) &&
    (a.target_zone ?? null) === (b.target_zone ?? null)
  )
}

/**
 * Inputs for copying a set of workouts `shiftDays` later. Anything that already
 * exists on the target day with identical details is skipped, so pressing
 * "Copy last week" twice never doubles the plan.
 */
export function shiftWorkouts(
  source: PlannedWorkout[],
  existing: PlannedWorkout[],
  shiftDays: number
): WorkoutFields[] {
  const created: WorkoutFields[] = []
  for (const workout of source) {
    const fields = copyFields(workout, addDaysISO(workout.target_date, shiftDays))
    const alreadyThere =
      existing.some((e) => sameWorkout(e, fields as Comparable)) ||
      created.some((c) => sameWorkout(c as Comparable, fields as Comparable))
    if (!alreadyThere) created.push(fields)
  }
  return created
}
