import type { Discipline } from "@/lib/types/domain"
import { DISCIPLINES } from "@/lib/types/domain"
import type { Tables } from "@/lib/types/database.types"

type PlannedWorkout = Tables<"planned_workouts">
type CompletedWorkout = Tables<"completed_workouts">

export type SessionCompletion = { completed: number; total: number }

// Session-count completion sidesteps the unit problem entirely (a discipline
// can be tracked by duration, distance, or both, sometimes session to
// session) — a planned workout counts as done as soon as anything is
// completed against it, regardless of which metric(s) were logged.
export function sessionCompletion(
  planned: PlannedWorkout[],
  completed: CompletedWorkout[]
): SessionCompletion {
  const linkedIds = new Set(
    completed.map((c) => c.planned_workout_id).filter((id): id is number => id !== null)
  )
  const completedCount = planned.filter((w) => linkedIds.has(w.id)).length
  return { completed: completedCount, total: planned.length }
}

export type DisciplineActivityCount = {
  discipline: Discipline
  count: number
}

// A plain count per discipline, deliberately with no duration/distance
// mixed in — those units aren't comparable across disciplines (or even
// within one, since the same discipline can be tracked either way from
// session to session), so the dashboard shows "how many", not "how much".
export function activityCounts(completed: CompletedWorkout[]): DisciplineActivityCount[] {
  return DISCIPLINES.map((discipline) => ({
    discipline,
    count: completed.filter((w) => w.discipline === discipline).length,
  })).filter((d) => d.count > 0)
}
