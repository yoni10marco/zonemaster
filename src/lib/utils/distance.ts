import type { Discipline } from "@/lib/types/domain"

// Distances are stored in kilometers for every discipline (so existing data
// and totals stay comparable), but swims are typed and shown in meters — a
// 1,500 m pool session reads far more naturally than "1.5 km".

export function usesMeters(discipline: Discipline): boolean {
  return discipline === "swim"
}

export function distanceUnit(discipline: Discipline): "m" | "km" {
  return usesMeters(discipline) ? "m" : "km"
}

/** Stored kilometers -> the number a person sees/types for this discipline. */
export function kmToDisplayValue(km: number, discipline: Discipline): number {
  return usesMeters(discipline) ? Math.round(km * 1000) : km
}

/** The number a person typed for this discipline -> kilometers to store. */
export function displayValueToKm(value: number, discipline: Discipline): number {
  return usesMeters(discipline) ? Math.round(value) / 1000 : value
}

export function formatDistance(km: number, discipline: Discipline): string {
  return usesMeters(discipline)
    ? `${Math.round(km * 1000)} m`
    : `${Math.round(km * 100) / 100} km`
}
