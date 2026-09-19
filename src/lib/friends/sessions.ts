import { overviewRowsToMap, type SessionMember } from "@/lib/friends/shared-session"
import { createClient } from "@/lib/supabase/client"
import type { Discipline, IntensityZone } from "@/lib/types/domain"

// Thin wrappers over the database functions (the browser has no direct access
// to the shared-session tables). Each throws an Error with the database's
// human-readable message on failure.

function fail(error: { message: string } | null): asserts error is null {
  if (error) throw new Error(error.message)
}

/** Turn one of your workouts into a shared session and invite these friends. */
export async function createSharedSession(workoutId: number, friendIds: string[]): Promise<number> {
  const { data, error } = await createClient().rpc("create_shared_session", {
    p_planned_workout_id: workoutId,
    p_friend_ids: friendIds,
  })
  fail(error)
  return data
}

export async function inviteToSharedSession(sessionId: number, friendIds: string[]): Promise<void> {
  const { error } = await createClient().rpc("invite_to_shared_session", {
    p_session_id: sessionId,
    p_friend_ids: friendIds,
  })
  fail(error)
}

export async function leaveSharedSession(sessionId: number): Promise<void> {
  const { error } = await createClient().rpc("leave_shared_session", { p_session_id: sessionId })
  fail(error)
}

/** Who is in each of these sessions (only sessions you have accepted come back). */
export async function fetchSessionOverview(sessionIds: number[]): Promise<Map<number, SessionMember[]>> {
  if (sessionIds.length === 0) return new Map()

  const { data, error } = await createClient().rpc("shared_session_overview", { p_session_ids: sessionIds })
  fail(error)
  return overviewRowsToMap(data ?? [])
}

export type SessionInvite = {
  sessionId: number
  creatorUsername: string | null
  targetDate: string
  discipline: Discipline
  title: string | null
  notes: string | null
  durationMinutes: number | null
  distanceKm: number | null
  zone: IntensityZone | null
  otherMembers: string[]
}

export async function fetchSessionInvites(): Promise<SessionInvite[]> {
  const { data, error } = await createClient().rpc("list_session_invites")
  fail(error)
  return (data ?? []).map((row) => ({
    sessionId: row.session_id,
    creatorUsername: row.creator_username,
    targetDate: row.target_date,
    discipline: row.discipline,
    title: row.title,
    notes: row.notes,
    durationMinutes: row.planned_duration_minutes,
    distanceKm: row.planned_distance_km,
    zone: row.target_zone,
    otherMembers: row.other_members ?? [],
  }))
}

/** Accepting adds the session to your calendar and returns that workout's id; declining returns null. */
export async function respondToSessionInvite(sessionId: number, accept: boolean): Promise<number | null> {
  const { data, error } = await createClient().rpc("respond_session_invite", {
    p_session_id: sessionId,
    p_accept: accept,
  })
  fail(error)
  return data
}
