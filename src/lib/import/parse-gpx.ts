import { disciplineFromSport } from "@/lib/import/sport"
import { ImportError, type ParsedActivity } from "@/lib/import/types"

const EARTH_RADIUS_KM = 6371

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

/** GPX: a track of timed points. Distance is summed along the track; heart rate comes from the Garmin extension when present. */
export function parseGpx(xml: string, fileName: string): ParsedActivity[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml")
  if (doc.getElementsByTagName("parsererror").length > 0) throw new ImportError(`${fileName} isn't a valid GPX file.`)

  const activities: ParsedActivity[] = []
  for (const track of Array.from(doc.getElementsByTagName("trk"))) {
    const points = Array.from(track.getElementsByTagName("trkpt"))
    const times = points
      .map((p) => new Date(p.getElementsByTagName("time")[0]?.textContent ?? "").getTime())
      .filter((t) => !Number.isNaN(t))
    if (times.length < 2) continue

    let km = 0
    for (let i = 1; i < points.length; i++) {
      const [a, b] = [points[i - 1], points[i]]
      const c = [a.getAttribute("lat"), a.getAttribute("lon"), b.getAttribute("lat"), b.getAttribute("lon")].map(Number)
      if (c.every(Number.isFinite)) km += haversineKm(c[0], c[1], c[2], c[3])
    }

    // Garmin's <gpxtpx:hr>, matched by local name because the prefix varies.
    const hrs = Array.from(track.getElementsByTagName("*"))
      .filter((el) => el.localName === "hr")
      .map((el) => Number(el.textContent))
      .filter((n) => Number.isFinite(n) && n > 0)

    const start = Math.min(...times)
    const end = Math.max(...times)
    activities.push({
      fileName,
      startTime: new Date(start),
      discipline: disciplineFromSport(track.getElementsByTagName("type")[0]?.textContent),
      durationSeconds: (end - start) / 1000,
      distanceKm: km > 0 ? km : null,
      avgHeartRate: hrs.length > 0 ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : null,
      avgPowerWatts: null,
    })
  }
  return activities
}
