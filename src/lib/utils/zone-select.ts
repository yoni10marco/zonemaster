import type { IntensityZone } from "@/lib/types/domain"

// Radix Select reserves the empty string for "nothing selected" (it's what
// shows the placeholder), so a "no specific zone" choice needs an explicit
// item with some other value — these two functions are the only place that
// value is named, translating it to/from the "" the rest of the app already
// uses for "no zone".
export const NO_ZONE_VALUE = "none"

/** What to pass as the Select's `value`. */
export function zoneSelectValue(zone: IntensityZone | "" | null | undefined): string {
  return zone || NO_ZONE_VALUE
}

/** What to store, from the Select's `onValueChange`. */
export function zoneFromSelectValue(value: string): IntensityZone | "" {
  return value === NO_ZONE_VALUE ? "" : (value as IntensityZone)
}
