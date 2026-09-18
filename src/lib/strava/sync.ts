import type { AdminClient } from "@/lib/supabase/admin"
import {
  fetchActivitiesPage,
  refreshTokens,
  type StravaActivity,
} from "@/lib/strava/client"
import { activityToCompletion, mapDiscipline } from "@/lib/strava/mapping"

const FIRST_SYNC_LOOKBACK_DAYS = 60
// Re-scan a day before the last sync so an activity uploaded late (e.g. a
// watch that syncs hours after the workout) isn't missed. Re-imports are
// harmless: existing activities are skipped by external id.
const INCREMENTAL_OVERLAP_SECONDS = 24 * 60 * 60
const TOKEN_REFRESH_MARGIN_SECONDS = 5 * 60
const PAGE_SIZE = 100
const MAX_PAGES = 10

export class StravaNotConnectedError extends Error {
  constructor() {
    super("Strava is not connected")
    this.name = "StravaNotConnectedError"
  }
}

export type SyncResult = { imported: number; linked: number }

async function getFreshAccessToken(admin: AdminClient, userId: string) {
  const { data: integration, error } = await admin
    .from("integrations")
    .select("access_token, refresh_token, expires_at, last_synced_at")
    .eq("user_id", userId)
    .eq("provider", "strava")
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!integration?.access_token || !integration.refresh_token) throw new StravaNotConnectedError()

  const nowSeconds = Math.floor(Date.now() / 1000)
  const expiresAtSeconds = integration.expires_at
    ? Math.floor(new Date(integration.expires_at).getTime() / 1000)
    : 0

  if (expiresAtSeconds - nowSeconds > TOKEN_REFRESH_MARGIN_SECONDS) {
    return { accessToken: integration.access_token, lastSyncedAt: integration.last_synced_at }
  }

  const tokens = await refreshTokens(integration.refresh_token)
  const { error: updateError } = await admin
    .from("integrations")
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(tokens.expires_at * 1000).toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", "strava")
  if (updateError) throw new Error(updateError.message)

  return { accessToken: tokens.access_token, lastSyncedAt: integration.last_synced_at }
}

async function fetchNewActivities(accessToken: string, afterEpochSeconds: number) {
  const activities: StravaActivity[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = await fetchActivitiesPage(accessToken, afterEpochSeconds, page, PAGE_SIZE)
    activities.push(...batch)
    if (batch.length < PAGE_SIZE) break
  }
  return activities
}

export async function syncStravaForUser(admin: AdminClient, userId: string): Promise<SyncResult> {
  const syncStartedAt = new Date()
  const { accessToken, lastSyncedAt } = await getFreshAccessToken(admin, userId)

  const afterEpoch = lastSyncedAt
    ? Math.floor(new Date(lastSyncedAt).getTime() / 1000) - INCREMENTAL_OVERLAP_SECONDS
    : Math.floor(syncStartedAt.getTime() / 1000) - FIRST_SYNC_LOOKBACK_DAYS * 24 * 60 * 60

  const fetched = await fetchNewActivities(accessToken, afterEpoch)

  let imported = 0
  let linked = 0

  if (fetched.length > 0) {
    const { data: existingRows, error: existingError } = await admin
      .from("completed_workouts")
      .select("external_activity_id")
      .eq("user_id", userId)
      .in("external_activity_id", fetched.map((a) => String(a.id)))
    if (existingError) throw new Error(existingError.message)

    const existingIds = new Set(existingRows.map((r) => r.external_activity_id))
    const fresh = fetched
      .filter((a) => !existingIds.has(String(a.id)))
      .sort((a, b) => a.start_date_local.localeCompare(b.start_date_local))

    if (fresh.length > 0) {
      const dates = fresh.map((a) => a.start_date_local.slice(0, 10))
      const minDate = dates[0]
      const maxDate = dates[dates.length - 1]

      const [{ data: planned, error: plannedError }, { data: linkedRows, error: linkedError }] =
        await Promise.all([
          admin
            .from("planned_workouts")
            .select("id, target_date, discipline")
            .eq("user_id", userId)
            .gte("target_date", minDate)
            .lte("target_date", maxDate),
          admin
            .from("completed_workouts")
            .select("planned_workout_id")
            .eq("user_id", userId)
            .not("planned_workout_id", "is", null),
        ])
      if (plannedError) throw new Error(plannedError.message)
      if (linkedError) throw new Error(linkedError.message)

      const alreadyLinked = new Set(linkedRows.map((r) => r.planned_workout_id))
      const available = planned.filter((p) => !alreadyLinked.has(p.id))

      for (const activity of fresh) {
        const date = activity.start_date_local.slice(0, 10)
        const discipline = mapDiscipline(activity)
        // Only auto-link when there is exactly one open candidate — with two
        // planned runs on a day we can't know which one this was.
        const candidates = available.filter(
          (p) => p.target_date === date && p.discipline === discipline
        )
        const candidate = candidates.length === 1 ? candidates[0] : null

        const row = activityToCompletion(activity, userId, candidate?.id ?? null)
        let { data: inserted, error } = await admin
          .from("completed_workouts")
          .upsert(row, { onConflict: "user_id,external_activity_id", ignoreDuplicates: true })
          .select("id")

        if (error?.code === "23505" && candidate) {
          // The planned workout got a completion between our read and write.
          ;({ data: inserted, error } = await admin
            .from("completed_workouts")
            .upsert(
              { ...row, planned_workout_id: null },
              { onConflict: "user_id,external_activity_id", ignoreDuplicates: true }
            )
            .select("id"))
          if (!error && inserted?.length) available.splice(available.indexOf(candidate), 1)
        } else if (!error && inserted?.length && candidate) {
          linked++
          available.splice(available.indexOf(candidate), 1)
        }

        if (error) throw new Error(error.message)
        if (inserted?.length) imported++
      }
    }
  }

  const { error: stampError } = await admin
    .from("integrations")
    .update({ last_synced_at: syncStartedAt.toISOString() })
    .eq("user_id", userId)
    .eq("provider", "strava")
  if (stampError) throw new Error(stampError.message)

  return { imported, linked }
}
