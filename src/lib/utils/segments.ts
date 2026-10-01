// Multi-sport ("brick") workouts: one calendar entry made of more than one
// discipline leg, e.g. a 60-minute bike followed by a 20-minute run. The
// workout/completion row's own discipline/duration/distance/zone columns are
// always leg 1; any further legs live in the row's `extra_segments` JSON
// column (validated by a CHECK constraint in migration 0017 — same shape as
// the types below). These helpers are the one place that turns a raw row into
// "the list of legs" and back, so every screen that needs to loop over a
// workout's disciplines agrees on what that means.

import type { Tables } from "@/lib/types/database.types"
import type { Discipline, IntensityZone } from "@/lib/types/domain"

export const MAX_EXTRA_SEGMENTS = 4

export type PlannedSegment = {
  discipline: Discipline
  planned_duration_minutes: number | null
  planned_distance_km: number | null
  target_zone: IntensityZone | null
}

export type CompletedSegment = {
  discipline: Discipline
  actual_duration_minutes: number | null
  actual_distance_km: number | null
  avg_heart_rate: number | null
  avg_pace_or_power: string | null
}

type PlannedRow = Pick<
  Tables<"planned_workouts">,
  "discipline" | "planned_duration_minutes" | "planned_distance_km" | "target_zone" | "extra_segments"
>
type CompletedRow = Pick<
  Tables<"completed_workouts">,
  "discipline" | "actual_duration_minutes" | "actual_distance_km" | "avg_heart_rate" | "avg_pace_or_power" | "extra_segments"
>

const DISCIPLINE_VALUES = new Set<string>(["swim", "bike", "run", "strength", "other"])
const ZONE_VALUES = new Set<string>(["z1", "z2", "z3", "z4", "z5"])

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}
function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}
function asDiscipline(value: unknown): Discipline | null {
  return typeof value === "string" && DISCIPLINE_VALUES.has(value) ? (value as Discipline) : null
}
function asZone(value: unknown): IntensityZone | null {
  return typeof value === "string" && ZONE_VALUES.has(value) ? (value as IntensityZone) : null
}

/**
 * Parses the `extra_segments` JSON into typed rows, dropping anything that
 * doesn't look right instead of throwing — the database already validates new
 * writes, but old data or a future column shape should never crash the UI.
 */
export function parseExtraPlannedSegments(json: PlannedRow["extra_segments"]): PlannedSegment[] {
  if (!Array.isArray(json)) return []
  return json.flatMap((raw) => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return []
    const discipline = asDiscipline((raw as Record<string, unknown>).discipline)
    if (!discipline) return []
    return [
      {
        discipline,
        planned_duration_minutes: asNumber((raw as Record<string, unknown>).planned_duration_minutes),
        planned_distance_km: asNumber((raw as Record<string, unknown>).planned_distance_km),
        target_zone: asZone((raw as Record<string, unknown>).target_zone),
      },
    ]
  })
}

export function parseExtraCompletedSegments(json: CompletedRow["extra_segments"]): CompletedSegment[] {
  if (!Array.isArray(json)) return []
  return json.flatMap((raw) => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return []
    const discipline = asDiscipline((raw as Record<string, unknown>).discipline)
    if (!discipline) return []
    return [
      {
        discipline,
        actual_duration_minutes: asNumber((raw as Record<string, unknown>).actual_duration_minutes),
        actual_distance_km: asNumber((raw as Record<string, unknown>).actual_distance_km),
        avg_heart_rate: asNumber((raw as Record<string, unknown>).avg_heart_rate),
        avg_pace_or_power: asString((raw as Record<string, unknown>).avg_pace_or_power),
      },
    ]
  })
}

/** Every leg of a planned workout, leg 1 (the row's own columns) first. */
export function plannedLegs(workout: PlannedRow): PlannedSegment[] {
  return [
    {
      discipline: workout.discipline,
      planned_duration_minutes: workout.planned_duration_minutes,
      planned_distance_km: workout.planned_distance_km,
      target_zone: workout.target_zone,
    },
    ...parseExtraPlannedSegments(workout.extra_segments),
  ]
}

/** Every leg of a completed workout, leg 1 first. */
export function completedLegs(completion: CompletedRow): CompletedSegment[] {
  return [
    {
      discipline: completion.discipline,
      actual_duration_minutes: completion.actual_duration_minutes,
      actual_distance_km: completion.actual_distance_km,
      avg_heart_rate: completion.avg_heart_rate,
      avg_pace_or_power: completion.avg_pace_or_power,
    },
    ...parseExtraCompletedSegments(completion.extra_segments),
  ]
}

export function isMultiSport(workout: Pick<PlannedRow, "extra_segments">): boolean {
  return parseExtraPlannedSegments(workout.extra_segments).length > 0
}

/** The distinct disciplines a workout touches, in leg order — what the dashboard counts "+1" for each of. */
export function disciplinesOf(workout: PlannedRow | CompletedRow): Discipline[] {
  const legs = "planned_duration_minutes" in workout ? plannedLegs(workout) : completedLegs(workout)
  return [...new Set(legs.map((l) => l.discipline))]
}

/**
 * Builds the `extra_segments` value to save, from the rows the form has for
 * legs 2+. Returns null (not an empty array) when there are none, matching
 * the column's "ordinary workout" default.
 */
export function buildExtraSegments(legs: PlannedSegment[]): PlannedSegment[] | null {
  const capped = legs.slice(0, MAX_EXTRA_SEGMENTS).filter((l) => l.planned_duration_minutes !== null || l.planned_distance_km !== null)
  return capped.length > 0 ? capped : null
}
