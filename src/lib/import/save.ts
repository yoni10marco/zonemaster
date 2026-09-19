import { createClient } from "@/lib/supabase/client"
import type { TablesInsert } from "@/lib/types/database.types"
import { buildRows, type ImportRow, type PlannedCandidate } from "@/lib/import/plan"
import { activityDate, durationMinutes, intensityText, roundKm } from "@/lib/import/summary"
import type { ParsedActivity } from "@/lib/import/types"

/** What the preview needs to know about the account before deciding what each activity is. */
export type ImportContext = {
  planned: PlannedCandidate[]
  completedPlannedIds: Set<number>
  existingExternalIds: Set<string>
}

/** Looks up planned workouts on the days involved, which of them are already done, and which activities were imported before. */
export async function fetchImportContext(activities: ParsedActivity[], externalIds: string[]): Promise<ImportContext> {
  const supabase = createClient()
  const dates = activities.map(activityDate).sort()

  const { data: planned, error } = await supabase
    .from("planned_workouts")
    .select("id, target_date, title, discipline, planned_duration_minutes")
    .gte("target_date", dates[0])
    .lte("target_date", dates[dates.length - 1])
  if (error) throw new Error(error.message)

  const plannedIds = (planned ?? []).map((w) => w.id)
  const [completedByPlan, completedByFile] = await Promise.all([
    plannedIds.length > 0
      ? supabase.from("completed_workouts").select("planned_workout_id").in("planned_workout_id", plannedIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("completed_workouts").select("external_activity_id").in("external_activity_id", externalIds),
  ])
  if (completedByPlan.error) throw new Error(completedByPlan.error.message)
  if (completedByFile.error) throw new Error(completedByFile.error.message)

  return {
    planned: planned ?? [],
    completedPlannedIds: new Set((completedByPlan.data ?? []).flatMap((c) => (c.planned_workout_id === null ? [] : [c.planned_workout_id]))),
    existingExternalIds: new Set((completedByFile.data ?? []).flatMap((c) => (c.external_activity_id === null ? [] : [c.external_activity_id]))),
  }
}

export function rowsFor(
  activities: ParsedActivity[],
  overrides: Parameters<typeof buildRows>[1],
  context: ImportContext
): ImportRow[] {
  return buildRows(activities, overrides, context.planned, context.completedPlannedIds, context.existingExternalIds)
}

/** The completed-workout record saved for one row (only a summary of the file). */
export function toCompletion(row: ImportRow, userId: string): TablesInsert<"completed_workouts"> {
  const a = row.activity
  return {
    user_id: userId,
    planned_workout_id: row.plannedId,
    source: "file",
    execution_date: row.date,
    discipline: row.discipline,
    actual_duration_minutes: durationMinutes(a.durationSeconds),
    actual_distance_km: roundKm(a.distanceKm),
    avg_heart_rate: a.avgHeartRate,
    avg_pace_or_power: intensityText({ ...a, discipline: row.discipline }),
    external_activity_id: row.externalId,
  }
}

/** Saves the chosen rows. Returns how many were saved. */
export async function saveImportedRows(rows: ImportRow[]): Promise<number> {
  if (rows.length === 0) return 0
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { error } = await supabase.from("completed_workouts").insert(rows.map((r) => toCompletion(r, user.id)))
  if (error) throw new Error(error.message)
  return rows.length
}
