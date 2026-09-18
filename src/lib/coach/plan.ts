import { addDays, parseISO } from "date-fns"
import { z } from "zod"

import { DISCIPLINES, DISCIPLINE_LABELS, INTENSITY_ZONES, type Discipline } from "@/lib/types/domain"
import { toISODate } from "@/lib/utils/dates"

const MAX_DRAFTS = 14

export type WorkoutDraft = {
  date: string
  discipline: Discipline
  durationMinutes: number | null
  distanceKm: number | null
  zone: (typeof INTENSITY_ZONES)[number] | null
  title: string
  notes: string | null
}

// Gemini response schema (OpenAPI subset). It steers the model; the zod
// schema below is what we actually trust.
export const PLAN_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    drafts: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          date: { type: "STRING" },
          discipline: { type: "STRING", enum: [...DISCIPLINES] },
          durationMinutes: { type: "INTEGER", nullable: true },
          distanceKm: { type: "NUMBER", nullable: true },
          zone: { type: "STRING", enum: [...INTENSITY_ZONES], nullable: true },
          title: { type: "STRING" },
          notes: { type: "STRING", nullable: true },
        },
        required: ["date", "discipline", "title"],
      },
    },
  },
  required: ["summary", "drafts"],
}

const rawDraftSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  discipline: z.enum(DISCIPLINES),
  durationMinutes: z.number().nullish(),
  distanceKm: z.number().nullish(),
  zone: z.enum(INTENSITY_ZONES).nullish(),
  title: z.string().nullish(),
  notes: z.string().nullish(),
})

const rawPlanSchema = z.object({
  summary: z.string().nullish(),
  drafts: z.array(z.unknown()),
})

// Distance isn't a meaningful target for strength/other sessions. Swims are
// tracked in meters, so they keep 3 decimals of a km (750 m stays 750 m) and a
// value that is clearly meters (e.g. 1500) is converted instead of being
// mistaken for 1,500 km.
function normalizeDistanceKm(raw: number | null | undefined, discipline: Discipline): number | null {
  if (raw == null || !(raw > 0)) return null
  if (discipline === "strength" || discipline === "other") return null
  if (discipline === "swim") {
    const km = raw >= 50 ? raw / 1000 : raw
    return km <= 20 ? Math.round(km * 1000) / 1000 : null
  }
  return raw <= 400 ? Math.round(raw * 10) / 10 : null
}

export type ParsedPlan = { summary: string; drafts: WorkoutDraft[] }

/**
 * Turns model output into safe drafts. Model output is untrusted: anything
 * that isn't valid JSON is an error, and individual drafts that are out of
 * range or malformed are silently dropped rather than failing the whole plan.
 */
export function parsePlan(rawText: string, weekStart: string): ParsedPlan {
  let json: unknown
  try {
    json = JSON.parse(rawText)
  } catch {
    throw new Error("The AI returned a plan in an unexpected format — please try again")
  }

  const plan = rawPlanSchema.safeParse(json)
  if (!plan.success) throw new Error("The AI returned a plan in an unexpected format — please try again")

  const weekEnd = toISODate(addDays(parseISO(weekStart), 6))
  const drafts: WorkoutDraft[] = []

  for (const item of plan.data.drafts) {
    if (drafts.length >= MAX_DRAFTS) break
    const parsed = rawDraftSchema.safeParse(item)
    if (!parsed.success) continue
    const d = parsed.data

    if (d.date < weekStart || d.date > weekEnd) continue

    const durationMinutes =
      d.durationMinutes != null && d.durationMinutes >= 5 && d.durationMinutes <= 480
        ? Math.round(d.durationMinutes)
        : null
    const distanceKm = normalizeDistanceKm(d.distanceKm, d.discipline)

    // The database requires a duration or a distance on every planned workout.
    if (durationMinutes === null && distanceKm === null) continue

    drafts.push({
      date: d.date,
      discipline: d.discipline,
      durationMinutes,
      distanceKm,
      zone: d.zone ?? null,
      title: (d.title?.trim() || DISCIPLINE_LABELS[d.discipline]).slice(0, 120),
      notes: d.notes?.trim() ? d.notes.trim().slice(0, 500) : null,
    })
  }

  drafts.sort((a, b) => a.date.localeCompare(b.date))
  return { summary: plan.data.summary?.trim().slice(0, 600) ?? "", drafts }
}
