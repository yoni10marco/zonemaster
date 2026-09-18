import { z } from "zod"

import { DISCIPLINES, INTENSITY_ZONES } from "@/lib/types/domain"

function hasValue(value: string | undefined): boolean {
  return value !== undefined && value.trim() !== ""
}

export const plannedWorkoutSchema = z
  .object({
    targetDate: z.string().min(1, "Date is required"),
    discipline: z.enum(DISCIPLINES),
    plannedDurationMinutes: z.string().optional(),
    plannedDistanceKm: z.string().optional(),
    targetZone: z.enum(INTENSITY_ZONES).optional().or(z.literal("")),
    title: z.string().max(120).optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((data) => hasValue(data.plannedDurationMinutes) || hasValue(data.plannedDistanceKm), {
    message: "Enter a duration or a distance",
    path: ["plannedDurationMinutes"],
  })

export type PlannedWorkoutInput = z.infer<typeof plannedWorkoutSchema>

// Intentionally just "what" and "when" — no duration/distance/RPE/notes.
// Logging a completion is meant to be a single tap, not a data-entry form.
export const completionSchema = z.object({
  executionDate: z.string().min(1, "Date is required"),
  discipline: z.enum(DISCIPLINES),
})

export type CompletionInput = z.infer<typeof completionSchema>

export function parseOptionalNumber(value: string | undefined): number | null {
  if (!hasValue(value)) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}
