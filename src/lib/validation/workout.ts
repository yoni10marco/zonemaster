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

export const completionSchema = z
  .object({
    executionDate: z.string().min(1, "Date is required"),
    discipline: z.enum(DISCIPLINES),
    actualDurationMinutes: z.string().optional(),
    actualDistanceKm: z.string().optional(),
    rpe: z.number().min(1, "RPE must be between 1 and 10").max(10, "RPE must be between 1 and 10"),
    notes: z.string().max(2000).optional(),
  })
  .refine((data) => hasValue(data.actualDurationMinutes) || hasValue(data.actualDistanceKm), {
    message: "Enter a duration or a distance",
    path: ["actualDurationMinutes"],
  })

export type CompletionInput = z.infer<typeof completionSchema>

export function parseOptionalNumber(value: string | undefined): number | null {
  if (!hasValue(value)) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}
