import type { IntensityZone } from "@/lib/types/domain"
import { INTENSITY_ZONES } from "@/lib/types/domain"

export type ZoneRange = { min: number; max: number }
export type ZoneRanges = Record<IntensityZone, ZoneRange>

// Share of the heart-rate range each zone covers (the common 5-zone model).
const ZONE_BANDS: Record<IntensityZone, readonly [number, number]> = {
  z1: [0.5, 0.6],
  z2: [0.6, 0.7],
  z3: [0.7, 0.8],
  z4: [0.8, 0.9],
  z5: [0.9, 1.0],
}

export const MAX_HR_LIMITS = { min: 100, max: 230 } as const
export const RESTING_HR_LIMITS = { min: 30, max: 120 } as const

/**
 * Heart-rate zones in bpm. With only a max heart rate the zones are plain
 * percentages of it; with a resting heart rate too they use the Karvonen
 * (heart-rate reserve) method, which tracks fitness better. Returns null when
 * there is no usable max heart rate, so callers can simply hide the numbers.
 */
export function computeZoneRanges(
  maxHr: number | null | undefined,
  restingHr?: number | null
): ZoneRanges | null {
  if (!maxHr || maxHr < MAX_HR_LIMITS.min || maxHr > MAX_HR_LIMITS.max) return null
  const base =
    restingHr && restingHr >= RESTING_HR_LIMITS.min && restingHr < maxHr ? restingHr : 0
  const span = maxHr - base

  const ranges = {} as ZoneRanges
  for (const zone of INTENSITY_ZONES) {
    const [from, to] = ZONE_BANDS[zone]
    ranges[zone] = { min: Math.round(base + span * from), max: Math.round(base + span * to) }
  }
  return ranges
}

export function formatZoneRange(range: ZoneRange): string {
  return `${range.min}–${range.max} bpm`
}
