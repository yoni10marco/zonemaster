import { addDays, differenceInCalendarWeeks, format, parseISO } from "date-fns"
import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database, Tables } from "@/lib/types/database.types"
import { DISCIPLINES, DISCIPLINE_LABELS, INTENSITY_ZONES } from "@/lib/types/domain"
import { computeZoneRanges, formatZoneRange } from "@/lib/utils/zones"
import { toISODate } from "@/lib/utils/dates"
import { formatDistance } from "@/lib/utils/distance"

type Completed = Tables<"completed_workouts">
type Planned = Tables<"planned_workouts">

const HISTORY_DAYS = 28
const UPCOMING_DAYS = 14
const MAX_COMPLETED_LISTED = 40
const MAX_UPCOMING_LISTED = 30
const MAX_MISSED_LISTED = 15

// Titles/notes are user-authored free text; keep them short and single-line
// so they can't bloat the prompt or fake structure in it.
function clean(text: string | null, max = 60): string {
  if (!text) return ""
  return text.replace(/\s+/g, " ").trim().slice(0, max)
}

function describeCompleted(c: Completed): string {
  const parts = [c.execution_date, DISCIPLINE_LABELS[c.discipline]]
  if (c.actual_duration_minutes) parts.push(`${c.actual_duration_minutes} min`)
  if (c.actual_distance_km) parts.push(formatDistance(c.actual_distance_km, c.discipline))
  if (c.avg_heart_rate) parts.push(`avg HR ${c.avg_heart_rate}`)
  if (c.avg_pace_or_power) parts.push(c.avg_pace_or_power)
  if (c.rpe) parts.push(`RPE ${c.rpe}`)
  return `- ${parts.join(", ")} [${c.planned_workout_id ? "planned" : "unplanned"}]`
}

function describePlanned(p: Planned): string {
  const parts = [p.target_date, DISCIPLINE_LABELS[p.discipline]]
  if (p.planned_duration_minutes) parts.push(`${p.planned_duration_minutes} min`)
  if (p.planned_distance_km) parts.push(formatDistance(p.planned_distance_km, p.discipline))
  if (p.target_zone) parts.push(p.target_zone.toUpperCase())
  const title = clean(p.title)
  return `- ${parts.join(", ")}${title ? ` ("${title}")` : ""}`
}

function disciplineTotals(completed: Completed[]): string {
  const lines = DISCIPLINES.map((d) => {
    const rows = completed.filter((c) => c.discipline === d)
    if (rows.length === 0) return null
    const minutes = rows.reduce((sum, c) => sum + (c.actual_duration_minutes ?? 0), 0)
    const km = rows.reduce((sum, c) => sum + (c.actual_distance_km ?? 0), 0)
    return `- ${DISCIPLINE_LABELS[d]}: ${rows.length} sessions, ${minutes} min, ${formatDistance(km, d)}`
  }).filter((line): line is string => line !== null)
  return lines.length > 0 ? lines.join("\n") : "- none logged"
}

/**
 * Builds a compact, plain-text snapshot of the athlete for the coach prompt.
 * `today` comes from the browser so "today" is the athlete's local day, not
 * the server's.
 */
export async function buildTrainingContext(
  supabase: SupabaseClient<Database>,
  userId: string,
  today: string
): Promise<string> {
  const todayDate = parseISO(today)
  const historyStart = toISODate(addDays(todayDate, -HISTORY_DAYS))
  const upcomingEnd = toISODate(addDays(todayDate, UPCOMING_DAYS))

  const [profileRes, completedRes, plannedRes] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "fitness_level, primary_discipline, target_race_date, target_race_distance, max_heart_rate, resting_heart_rate"
      )
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("completed_workouts")
      .select("*")
      .gte("execution_date", historyStart)
      .lte("execution_date", today)
      .order("execution_date", { ascending: false }),
    supabase
      .from("planned_workouts")
      .select("*")
      .gte("target_date", historyStart)
      .lte("target_date", upcomingEnd)
      .order("target_date", { ascending: true }),
  ])

  const profile = profileRes.data
  const completed = completedRes.data ?? []
  const planned = plannedRes.data ?? []

  const linkedIds = new Set(
    completed.map((c) => c.planned_workout_id).filter((id): id is number => id !== null)
  )
  const past = planned.filter((p) => p.target_date < today)
  const missed = past.filter((p) => !linkedIds.has(p.id))
  const upcoming = planned.filter((p) => p.target_date >= today)
  const plannedDone = past.length - missed.length

  const lines: string[] = []
  lines.push(`Today: ${today} (${format(todayDate, "EEEE")}). Weeks run Monday to Sunday.`)

  if (profile) {
    const goal = profile.target_race_date
      ? `${profile.target_race_distance || "race"} on ${profile.target_race_date} (${Math.max(
          0,
          differenceInCalendarWeeks(parseISO(profile.target_race_date), todayDate, { weekStartsOn: 1 })
        )} weeks away)`
      : "no target race set"
    lines.push(
      `Athlete: ${profile.fitness_level} level, primary discipline ${DISCIPLINE_LABELS[profile.primary_discipline]}, goal: ${goal}.`
    )
    const zones = computeZoneRanges(profile.max_heart_rate, profile.resting_heart_rate)
    if (zones) {
      lines.push(
        `Heart-rate zones: ${INTENSITY_ZONES.map((z) => `${z.toUpperCase()} ${formatZoneRange(zones[z])}`).join(", ")}.`
      )
    }
  }

  lines.push("")
  lines.push(`Completed in the last ${HISTORY_DAYS} days, totals by discipline:`)
  lines.push(disciplineTotals(completed))
  lines.push(
    `Plan adherence over the last ${HISTORY_DAYS} days: ${plannedDone} of ${past.length} planned sessions completed.`
  )

  lines.push("")
  lines.push(`Completed workouts (most recent first, up to ${MAX_COMPLETED_LISTED}):`)
  lines.push(
    completed.length > 0
      ? completed.slice(0, MAX_COMPLETED_LISTED).map(describeCompleted).join("\n")
      : "- none"
  )

  lines.push("")
  lines.push("Planned sessions that were not completed:")
  lines.push(
    missed.length > 0
      ? missed.slice(-MAX_MISSED_LISTED).map(describePlanned).join("\n")
      : "- none"
  )

  lines.push("")
  lines.push(`Planned sessions coming up (next ${UPCOMING_DAYS} days):`)
  lines.push(
    upcoming.length > 0
      ? upcoming.slice(0, MAX_UPCOMING_LISTED).map(describePlanned).join("\n")
      : "- nothing planned"
  )

  return lines.join("\n")
}
