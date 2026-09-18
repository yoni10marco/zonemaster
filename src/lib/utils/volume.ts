import type { Discipline } from "@/lib/types/domain"
import { DISCIPLINES } from "@/lib/types/domain"
import type { Tables } from "@/lib/types/database.types"

type PlannedWorkout = Tables<"planned_workouts">
type CompletedWorkout = Tables<"completed_workouts">

export type DisciplineVolume = {
  discipline: Discipline
  plannedMinutes: number
  plannedKm: number
  actualMinutes: number
  actualKm: number
}

export function aggregateVolume(
  planned: PlannedWorkout[],
  completed: CompletedWorkout[]
): DisciplineVolume[] {
  return DISCIPLINES.map((discipline) => {
    const plannedForDiscipline = planned.filter((w) => w.discipline === discipline)
    const completedForDiscipline = completed.filter((w) => w.discipline === discipline)

    return {
      discipline,
      plannedMinutes: sum(plannedForDiscipline, "planned_duration_minutes"),
      plannedKm: sum(plannedForDiscipline, "planned_distance_km"),
      actualMinutes: sum(completedForDiscipline, "actual_duration_minutes"),
      actualKm: sum(completedForDiscipline, "actual_distance_km"),
    }
  }).filter((v) => v.plannedMinutes || v.plannedKm || v.actualMinutes || v.actualKm)
}

function sum<T extends Record<string, unknown>>(rows: T[], key: keyof T): number {
  return rows.reduce((total, row) => {
    const value = row[key]
    return total + (typeof value === "number" ? value : 0)
  }, 0)
}

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

export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10
}
