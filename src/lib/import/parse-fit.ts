import { disciplineFromSport } from "@/lib/import/sport"
import { ImportError, type ParsedActivity } from "@/lib/import/types"

/**
 * FIT (what Garmin, Polar, Suunto, Wahoo and most watches export). Every
 * <session> becomes one activity, so a triathlon file gives a swim, a bike and a run.
 */
export async function parseFit(buffer: ArrayBuffer, fileName: string): Promise<ParsedActivity[]> {
  // Loaded on demand: the decoder is large and only needed when someone imports a .fit file.
  const { default: FitParser } = await import("fit-file-parser")
  const parser = new FitParser({ mode: "list", lengthUnit: "km" })

  let data
  try {
    data = await parser.parseAsync(buffer)
  } catch {
    throw new ImportError(`${fileName} isn't a readable FIT file.`)
  }

  const activities: ParsedActivity[] = []
  for (const session of data.sessions ?? []) {
    const start = session.start_time instanceof Date ? session.start_time : new Date(session.start_time ?? "")
    if (Number.isNaN(start.getTime())) continue
    const seconds = session.total_timer_time ?? session.total_elapsed_time ?? 0
    const km = session.total_distance ?? 0
    if (seconds <= 0 && km <= 0) continue

    activities.push({
      fileName,
      startTime: start,
      discipline: disciplineFromSport(String(session.sport ?? "")),
      durationSeconds: seconds,
      distanceKm: km > 0 ? km : null,
      avgHeartRate: session.avg_heart_rate ? Math.round(session.avg_heart_rate) : null,
      avgPowerWatts: session.avg_power ? Math.round(session.avg_power) : null,
    })
  }
  return activities
}
