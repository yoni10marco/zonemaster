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
    // "0" = don't repeat; otherwise how many more weeks to copy this workout to.
    repeatWeeks: z.string().regex(/^\d{1,2}$/).optional(),
  })
  .refine((data) => hasValue(data.plannedDurationMinutes) || hasValue(data.plannedDistanceKm), {
    message: "Enter a duration or a distance",
    path: ["plannedDurationMinutes"],
  })

export type PlannedWorkoutInput = z.infer<typeof plannedWorkoutSchema>

export function parseOptionalNumber(value: string | undefined): number | null {
  if (!hasValue(value)) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}
