import { disciplineFromSport } from "@/lib/import/sport"
import { ImportError, type ParsedActivity } from "@/lib/import/types"

function text(parent: Element, tag: string): string | null {
  return parent.getElementsByTagName(tag)[0]?.textContent?.trim() || null
}

function num(parent: Element, tag: string): number | null {
  const raw = text(parent, tag)
  const value = Number(raw)
  return raw !== null && Number.isFinite(value) ? value : null
}

/** TCX: one or more <Activity>, each made of <Lap>s with total time, distance and average heart rate. */
export function parseTcx(xml: string, fileName: string): ParsedActivity[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml")
  if (doc.getElementsByTagName("parsererror").length > 0) throw new ImportError(`${fileName} isn't a valid TCX file.`)

  const activities: ParsedActivity[] = []
  for (const activity of Array.from(doc.getElementsByTagName("Activity"))) {
    const laps = Array.from(activity.getElementsByTagName("Lap"))
    const start = new Date(text(activity, "Id") ?? laps[0]?.getAttribute("StartTime") ?? "")
    if (laps.length === 0 || Number.isNaN(start.getTime())) continue

    let seconds = 0
    let meters = 0
    let hrWeighted = 0
    let hrSeconds = 0
    for (const lap of laps) {
      const lapSeconds = num(lap, "TotalTimeSeconds") ?? 0
      seconds += lapSeconds
      meters += num(lap, "DistanceMeters") ?? 0
      const avgHr = lap.getElementsByTagName("AverageHeartRateBpm")[0]
      const hr = avgHr ? num(avgHr, "Value") : null
      if (hr !== null && lapSeconds > 0) {
        hrWeighted += hr * lapSeconds
        hrSeconds += lapSeconds
      }
    }
    if (seconds <= 0 && meters <= 0) continue

    activities.push({
      fileName,
      startTime: start,
      discipline: disciplineFromSport(activity.getAttribute("Sport")),
      durationSeconds: seconds,
      distanceKm: meters > 0 ? meters / 1000 : null,
      avgHeartRate: hrSeconds > 0 ? Math.round(hrWeighted / hrSeconds) : null,
      avgPowerWatts: null,
    })
  }
  return activities
}
