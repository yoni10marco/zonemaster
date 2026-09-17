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

// A discipline's plan may be tracked by duration, by distance, or both (e.g.
// a distance-only bike ride has plannedMinutes = 0). Falling back to km keeps
// distance-only disciplines from being silently dropped out of the rate.
export function completionRate(volumes: DisciplineVolume[]): number | null {
  const rates = volumes
    .map((v) => {
      if (v.plannedMinutes > 0) return v.actualMinutes / v.plannedMinutes
      if (v.plannedKm > 0) return v.actualKm / v.plannedKm
      return null
    })
    .filter((rate): rate is number => rate !== null)

  if (rates.length === 0) return null
  const average = rates.reduce((sum, rate) => sum + rate, 0) / rates.length
  return Math.round(average * 100)
}

export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10
}
