import { z } from "zod"

import { DISCIPLINES, FITNESS_LEVELS } from "@/lib/types/domain"
import { FTP_LIMITS, RUN_PACE_LIMITS, SWIM_CSS_LIMITS, formatPace, parsePace } from "@/lib/utils/training-zones"
import { MAX_HR_LIMITS, RESTING_HR_LIMITS } from "@/lib/utils/zones"

export const signupSchema = z
  .object({
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    fitnessLevel: z.enum(FITNESS_LEVELS),
    primaryDiscipline: z.enum(DISCIPLINES),
    targetRaceDate: z.string().optional().or(z.literal("")),
    targetRaceDistance: z.string().max(100).optional().or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type SignupInput = z.infer<typeof signupSchema>

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

export type LoginInput = z.infer<typeof loginSchema>

// Whole numbers (heart rate, watts), kept as strings like the other numeric form fields and range-checked here.
function wholeNumberField(limits: { min: number; max: number }) {
  return z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || (/^\d+$/.test(v) && Number(v) >= limits.min && Number(v) <= limits.max), {
      message: `Enter a whole number between ${limits.min} and ${limits.max}`,
    })
}

// "5:12" style pace, kept as a string and range-checked in seconds.
function paceField(limits: { min: number; max: number }) {
  return z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => {
        if (!v) return true
        const seconds = parsePace(v)
        return seconds !== null && seconds >= limits.min && seconds <= limits.max
      },
      { message: `Enter minutes:seconds between ${formatPace(limits.min)} and ${formatPace(limits.max)}, like ${formatPace(Math.round((limits.min + limits.max) / 2 / 10) * 10)}` }
    )
}

export const profileSchema = z
  .object({
    fitnessLevel: z.enum(FITNESS_LEVELS),
    primaryDiscipline: z.enum(DISCIPLINES),
    targetRaceDate: z.string().optional().or(z.literal("")),
    targetRaceDistance: z.string().max(100).optional().or(z.literal("")),
    maxHeartRate: wholeNumberField(MAX_HR_LIMITS),
    restingHeartRate: wholeNumberField(RESTING_HR_LIMITS),
    ftpWatts: wholeNumberField(FTP_LIMITS),
    runThresholdPace: paceField(RUN_PACE_LIMITS),
    swimCss: paceField(SWIM_CSS_LIMITS),
  })
  .refine(
    (data) =>
      !data.maxHeartRate || !data.restingHeartRate || Number(data.restingHeartRate) < Number(data.maxHeartRate),
    { message: "Resting heart rate must be lower than max heart rate", path: ["restingHeartRate"] }
  )

export type ProfileInput = z.infer<typeof profileSchema>
