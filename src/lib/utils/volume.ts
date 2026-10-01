import type { Discipline } from "@/lib/types/domain"
import { DISCIPLINES } from "@/lib/types/domain"
import type { Tables } from "@/lib/types/database.types"
import { disciplinesOf } from "@/lib/utils/segments"

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
//
// A multi-sport ("brick") completion counts once for EACH discipline it
// covers — a single bike+run session adds 1 to bike and 1 to run — even
// though it is still one row (one session) everywhere else, such as the
// session-completion rate above.
export function activityCounts(completed: CompletedWorkout[]): DisciplineActivityCount[] {
  const counts = new Map<Discipline, number>()
  for (const w of completed) {
    for (const discipline of disciplinesOf(w)) {
      counts.set(discipline, (counts.get(discipline) ?? 0) + 1)
    }
  }
  return DISCIPLINES.map((discipline) => ({ discipline, count: counts.get(discipline) ?? 0 })).filter(
    (d) => d.count > 0
  )
}
