import type { Discipline } from "@/lib/types/domain"
import { activityDate, durationMinutes, externalActivityId } from "@/lib/import/summary"
import type { ParsedActivity } from "@/lib/import/types"

/** The bits of a planned workout needed to decide whether an activity is that workout. */
export type PlannedCandidate = {
  id: number
  target_date: string
  title: string | null
  discipline: Discipline
  planned_duration_minutes: number | null
}

export type ImportRow = {
  /** Stable id for the row inside one import (file + position). */
  key: string
  activity: ParsedActivity
  /** What the activity will be saved as (detected, or changed by the user). */
  discipline: Discipline
  date: string
  externalId: string
  /** Already imported earlier, or repeated in this batch: it will not be saved again. */
  duplicate: boolean
  /** The planned workout this completes, or null to save it as an extra activity. */
  plannedId: number | null
}

/**
 * The planned workout an activity most likely is: same day, same discipline,
 * not yet completed. With several candidates, the closest planned duration wins.
 */
export function matchPlanned(
  date: string,
  discipline: Discipline,
  minutes: number,
  planned: PlannedCandidate[],
  taken: ReadonlySet<number>
): number | null {
  const gap = (w: PlannedCandidate) =>
    w.planned_duration_minutes === null ? Number.MAX_SAFE_INTEGER : Math.abs(w.planned_duration_minutes - minutes)
  const candidates = planned
    .filter((w) => w.target_date === date && w.discipline === discipline && !taken.has(w.id))
    .sort((a, b) => gap(a) - gap(b) || a.id - b.id)
  return candidates[0]?.id ?? null
}

/**
 * Turns the parsed activities into the rows the preview shows. Rows are handled
 * in start-time order, and a planned workout is claimed by at most one of them.
 */
export function buildRows(
  activities: ParsedActivity[],
  disciplineOverrides: Readonly<Record<string, Discipline>>,
  planned: PlannedCandidate[],
  completedPlannedIds: ReadonlySet<number>,
  existingExternalIds: ReadonlySet<string>
): ImportRow[] {
  const claimed = new Set(completedPlannedIds)
  const seen = new Set(existingExternalIds)

  return activities
    .map((activity, index) => ({ activity, key: `${activity.fileName}#${index}` }))
    .sort((a, b) => a.activity.startTime.getTime() - b.activity.startTime.getTime())
    .map(({ activity, key }) => {
      const discipline = disciplineOverrides[key] ?? activity.discipline
      const date = activityDate(activity)
      const externalId = externalActivityId(activity)
      const duplicate = seen.has(externalId)
      seen.add(externalId)

      let plannedId: number | null = null
      if (!duplicate) {
        plannedId = matchPlanned(date, discipline, durationMinutes(activity.durationSeconds), planned, claimed)
        if (plannedId !== null) claimed.add(plannedId)
      }
      return { key, activity, discipline, date, externalId, duplicate, plannedId }
    })
}
