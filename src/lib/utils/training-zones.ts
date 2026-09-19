import type { Discipline, IntensityZone } from "@/lib/types/domain"
import { INTENSITY_ZONES } from "@/lib/types/domain"
import { computeZoneRanges, formatZoneRange, type ZoneRanges } from "@/lib/utils/zones"

// Zones per sport. Heart rate stays the fallback everywhere; a sport uses its
// own measure as soon as the athlete has entered the matching number:
//   bike  -> power, from FTP (functional threshold power)
//   run   -> pace, from threshold pace (about what you could hold for an hour)
//   swim  -> pace, from CSS (critical swim speed, per 100 m)

export const FTP_LIMITS = { min: 50, max: 600 } as const
export const RUN_PACE_LIMITS = { min: 150, max: 600 } as const // seconds per km
export const SWIM_CSS_LIMITS = { min: 50, max: 300 } as const // seconds per 100 m

type Band = readonly [number | null, number | null]

// Bike: percent of FTP, the 5-zone grouping of Coggan's power levels.
// Z1 active recovery, Z2 endurance, Z3 tempo, Z4 threshold, Z5 VO2max and above.
const POWER_BANDS: Record<IntensityZone, Band> = {
  z1: [null, 55],
  z2: [55, 75],
  z3: [75, 90],
  z4: [90, 105],
  z5: [105, null],
}

// Run and swim: percent of threshold pace as a *time*, so a bigger number is
// slower. Each band is [fast end, slow end]; null means "no limit" on that side.
// Run follows the widely used Friel pace zones; swim uses the same idea with
// tighter bands, since pace differences in water are small.
const RUN_PACE_BANDS: Record<IntensityZone, Band> = {
  z1: [129, null],
  z2: [114, 129],
  z3: [106, 114],
  z4: [99, 106],
  z5: [null, 99],
}
const SWIM_PACE_BANDS: Record<IntensityZone, Band> = {
  z1: [118, null],
  z2: [108, 118],
  z3: [103, 108],
  z4: [98, 103],
  z5: [null, 98],
}

export type ZoneGuide = {
  hr: ZoneRanges | null
  ftpWatts: number | null
  runThresholdPaceSec: number | null
  swimCssSec: number | null
}

export type ZoneGuideInput = {
  max_heart_rate?: number | null
  resting_heart_rate?: number | null
  ftp_watts?: number | null
  run_threshold_pace_sec?: number | null
  swim_css_sec?: number | null
}

function within(value: number | null | undefined, limits: { min: number; max: number }): number | null {
  return value && value >= limits.min && value <= limits.max ? value : null
}

/** Everything needed to turn a target zone into numbers, from the profile. Unusable inputs are ignored. */
export function buildZoneGuide(profile: ZoneGuideInput | null | undefined): ZoneGuide {
  return {
    hr: computeZoneRanges(profile?.max_heart_rate, profile?.resting_heart_rate),
    ftpWatts: within(profile?.ftp_watts, FTP_LIMITS),
    runThresholdPaceSec: within(profile?.run_threshold_pace_sec, RUN_PACE_LIMITS),
    swimCssSec: within(profile?.swim_css_sec, SWIM_CSS_LIMITS),
  }
}

// ---- pace text ("5:12") ---------------------------------------------------

export function formatPace(totalSeconds: number): string {
  const s = Math.round(totalSeconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

/** "5:12" -> 312. Null for anything that is not minutes:seconds. */
export function parsePace(text: string): number | null {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(text.trim())
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

// ---- ranges ---------------------------------------------------------------

type Range = { from: number | null; to: number | null }

/** Power zones in watts (`from` inclusive, `to` exclusive; null = no limit). */
export function powerRanges(ftp: number): Record<IntensityZone, Range> {
  const out = {} as Record<IntensityZone, Range>
  for (const z of INTENSITY_ZONES) {
    const [lo, hi] = POWER_BANDS[z]
    out[z] = { from: lo === null ? null : Math.round((ftp * lo) / 100), to: hi === null ? null : Math.round((ftp * hi) / 100) }
  }
  return out
}

/** Pace zones in seconds (`from` = the fast end, `to` = the slow end; null = no limit). */
export function paceRanges(thresholdSec: number, bands: Record<IntensityZone, Band>): Record<IntensityZone, Range> {
  const out = {} as Record<IntensityZone, Range>
  for (const z of INTENSITY_ZONES) {
    const [fast, slow] = bands[z]
    out[z] = {
      from: fast === null ? null : Math.round((thresholdSec * fast) / 100),
      to: slow === null ? null : Math.round((thresholdSec * slow) / 100),
    }
  }
  return out
}

const runRanges = (sec: number) => paceRanges(sec, RUN_PACE_BANDS)
const swimRanges = (sec: number) => paceRanges(sec, SWIM_PACE_BANDS)

function powerText(r: Range): string {
  if (r.from === null) return `under ${r.to} W`
  if (r.to === null) return `over ${r.from} W`
  return `${r.from}–${r.to} W`
}

function paceText(r: Range, unit: string): string {
  if (r.from === null) return `faster than ${formatPace(r.to!)} ${unit}`
  if (r.to === null) return `slower than ${formatPace(r.from)} ${unit}`
  return `${formatPace(r.from)}–${formatPace(r.to)} ${unit}`
}

/** What a zone means for a sport, in that sport's own unit: "140–188 W", "5:40–6:10 /km" or "114–133 bpm". Null when nothing is known. */
export function zoneTarget(guide: ZoneGuide | null | undefined, discipline: Discipline, zone: IntensityZone): string | null {
  if (!guide) return null
  if (discipline === "bike" && guide.ftpWatts) return powerText(powerRanges(guide.ftpWatts)[zone])
  if (discipline === "run" && guide.runThresholdPaceSec) return paceText(runRanges(guide.runThresholdPaceSec)[zone], "/km")
  if (discipline === "swim" && guide.swimCssSec) return paceText(swimRanges(guide.swimCssSec)[zone], "/100m")
  return guide.hr ? formatZoneRange(guide.hr[zone]) : null
}

// ---- which zone an activity was in ----------------------------------------

export type ActivityEffort = {
  avgPowerWatts: number | null
  avgHeartRate: number | null
  durationSeconds: number
  distanceKm: number | null
}

export type ActivityZone = { zone: IntensityZone; measure: "power" | "pace" | "heart rate" }

function zoneOfValue(value: number, ranges: Record<IntensityZone, Range>): IntensityZone {
  for (const z of INTENSITY_ZONES) {
    const { from, to } = ranges[z]
    if ((from === null || value >= from) && (to === null || value < to)) return z
  }
  return "z5"
}

/**
 * The zone an activity's averages fall in: power for rides, pace for runs and
 * swims, and heart rate when the sport's own number is missing. Null when there
 * is nothing to compare with. An average hides the hard and easy parts, so this
 * is a guide, not a verdict.
 */
export function zoneOfActivity(
  guide: ZoneGuide | null | undefined,
  discipline: Discipline,
  effort: ActivityEffort
): ActivityZone | null {
  if (!guide) return null
  if (discipline === "bike" && guide.ftpWatts && effort.avgPowerWatts) {
    return { zone: zoneOfValue(effort.avgPowerWatts, powerRanges(guide.ftpWatts)), measure: "power" }
  }
  const km = effort.distanceKm
  if (km && km > 0 && effort.durationSeconds > 0) {
    if (discipline === "run" && guide.runThresholdPaceSec) {
      return { zone: zoneOfValue(effort.durationSeconds / km, runRanges(guide.runThresholdPaceSec)), measure: "pace" }
    }
    if (discipline === "swim" && guide.swimCssSec) {
      return { zone: zoneOfValue(effort.durationSeconds / (km * 10), swimRanges(guide.swimCssSec)), measure: "pace" }
    }
  }
  if (guide.hr && effort.avgHeartRate) {
    const hr = effort.avgHeartRate
    const zone = INTENSITY_ZONES.find((z) => hr < guide.hr![z].max) ?? "z5"
    return { zone, measure: "heart rate" }
  }
  return null
}

// ---- for the coach ----------------------------------------------------------

/** One line per measure the athlete has set up, for the AI coach's context. */
export function describeZonesForCoach(guide: ZoneGuide): string[] {
  const line = (label: string, text: (z: IntensityZone) => string) =>
    `${label}: ${INTENSITY_ZONES.map((z) => `${z.toUpperCase()} ${text(z)}`).join(", ")}.`
  const lines: string[] = []
  if (guide.hr) lines.push(line("Heart-rate zones", (z) => formatZoneRange(guide.hr![z])))
  if (guide.ftpWatts) {
    const r = powerRanges(guide.ftpWatts)
    lines.push(line(`Bike power zones (FTP ${guide.ftpWatts} W)`, (z) => powerText(r[z])))
  }
  if (guide.runThresholdPaceSec) {
    const r = runRanges(guide.runThresholdPaceSec)
    lines.push(line(`Run pace zones (threshold ${formatPace(guide.runThresholdPaceSec)} /km)`, (z) => paceText(r[z], "/km")))
  }
  if (guide.swimCssSec) {
    const r = swimRanges(guide.swimCssSec)
    lines.push(line(`Swim pace zones (CSS ${formatPace(guide.swimCssSec)} /100m)`, (z) => paceText(r[z], "/100m")))
  }
  return lines
}

/** The five zones of one sport as label + text rows, for the Settings preview. */
export function zoneTable(guide: ZoneGuide, discipline: "bike" | "run" | "swim"): { zone: IntensityZone; text: string }[] {
  return INTENSITY_ZONES.flatMap((zone) => {
    const text = zoneTarget({ ...guide, hr: null }, discipline, zone)
    return text ? [{ zone, text }] : []
  })
}
