import type { Enums } from "@/lib/types/database.types"

export type Discipline = Enums<"discipline">
export type IntensityZone = Enums<"intensity_zone">
export type WorkoutSource = Enums<"workout_source">
export type FitnessLevel = Enums<"fitness_level">

// `as const` tuples (not just typed arrays) so zod's z.enum() can infer the
// exact literal union instead of widening to `string`.
export const DISCIPLINES = [
  "swim",
  "bike",
  "run",
  "strength",
  "other",
] as const satisfies readonly Discipline[]

export const INTENSITY_ZONES = [
  "z1",
  "z2",
  "z3",
  "z4",
  "z5",
] as const satisfies readonly IntensityZone[]

export const FITNESS_LEVELS = [
  "beginner",
  "intermediate",
  "advanced",
] as const satisfies readonly FitnessLevel[]

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  swim: "Swim",
  bike: "Bike",
  run: "Run",
  strength: "Strength",
  other: "Other",
}

export const ZONE_LABELS: Record<IntensityZone, string> = {
  z1: "Z1 · Recovery",
  z2: "Z2 · Endurance",
  z3: "Z3 · Tempo",
  z4: "Z4 · Threshold",
  z5: "Z5 · VO2 Max",
}
