import { format as formatDate } from "date-fns"

import type { ParsedActivity } from "@/lib/import/types"

/** The day it happened on the user's clock (what the calendar uses). */
export function activityDate(activity: Pick<ParsedActivity, "startTime">): string {
  return formatDate(activity.startTime, "yyyy-MM-dd")
}

/** Whole minutes, at least 1 so a short activity still counts. */
export function durationMinutes(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60))
}

/** Two decimals, the precision the database keeps. Null when there is no distance. */
export function roundKm(km: number | null): number | null {
  return km === null || km <= 0 ? null : Math.round(km * 100) / 100
}

/** The same activity in two files (or imported twice) gets the same id, so it is only saved once. */
export function externalActivityId(activity: Pick<ParsedActivity, "startTime" | "durationSeconds">): string {
  return `file:${activity.startTime.toISOString()}:${Math.round(activity.durationSeconds)}`
}

function clock(totalSeconds: number): string {
  const s = Math.round(totalSeconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

/**
 * A short intensity line for the saved activity: pace for runs and swims,
 * power (or speed) for rides. Null when there is nothing meaningful to say.
 */
export function intensityText(
  a: Pick<ParsedActivity, "discipline" | "durationSeconds" | "distanceKm" | "avgPowerWatts">
): string | null {
  const km = a.distanceKm
  if (a.discipline === "bike") {
    if (a.avgPowerWatts) return `${Math.round(a.avgPowerWatts)} W`
    if (km && a.durationSeconds > 0) return `${((km / a.durationSeconds) * 3600).toFixed(1)} km/h`
    return null
  }
  if (!km || a.durationSeconds <= 0) return null
  if (a.discipline === "run") return `${clock(a.durationSeconds / km)} /km`
  if (a.discipline === "swim") return `${clock(a.durationSeconds / (km * 10))} /100m`
  return null
}
