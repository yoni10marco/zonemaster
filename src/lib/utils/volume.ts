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

export function completionRate(volumes: DisciplineVolume[]): number | null {
  const plannedTotal = volumes.reduce((sum, v) => sum + v.plannedMinutes, 0)
  const actualTotal = volumes.reduce((sum, v) => sum + v.actualMinutes, 0)
  if (plannedTotal === 0) return null
  return Math.round((actualTotal / plannedTotal) * 100)
}

export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10
}
