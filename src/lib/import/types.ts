import type { Discipline } from "@/lib/types/domain"

// One activity found in a file. Only this summary is ever saved; the file itself
// (with its GPS track and second-by-second data) never leaves the browser.
export type ParsedActivity = {
  /** Which file it came from, for the preview list. */
  fileName: string
  /** When it started (an exact instant). */
  startTime: Date
  discipline: Discipline
  durationSeconds: number
  distanceKm: number | null
  avgHeartRate: number | null
  avgPowerWatts: number | null
}

/** A message that is safe to show the user as-is. */
export class ImportError extends Error {}
