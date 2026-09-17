import { z } from "zod"

import { DISCIPLINES, FITNESS_LEVELS } from "@/lib/types/domain"

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

export const profileSchema = z.object({
  fitnessLevel: z.enum(FITNESS_LEVELS),
  primaryDiscipline: z.enum(DISCIPLINES),
  targetRaceDate: z.string().optional().or(z.literal("")),
  targetRaceDistance: z.string().max(100).optional().or(z.literal("")),
})

export type ProfileInput = z.infer<typeof profileSchema>
