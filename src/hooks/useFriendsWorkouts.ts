"use client"

import { useCallback, useEffect, useState } from "react"

import { createClient } from "@/lib/supabase/client"
import type { Discipline, IntensityZone } from "@/lib/types/domain"
import type { Json } from "@/lib/types/database.types"
import { addDaysISO, toISODate } from "@/lib/utils/dates"

/** A friend's shared planned workout. Shaped to match segments.ts's PlannedRow
 *  Pick type exactly, so plannedLegs() works on it unmodified. */
export type FriendWorkout = {
  workoutId: number
  ownerId: string
  username: string | null
  target_date: string
  title: string | null
  notes: string | null
  discipline: Discipline
  planned_duration_minutes: number | null
  planned_distance_km: number | null
  target_zone: IntensityZone | null
  extra_segments: Json | null
}

/** Friends' planned workouts from 7 days ago through 7 days from now — only
 *  from friends who have sharing on (see profiles.share_planned_workouts),
 *  via the list_friends_workouts security-definer function (no direct table
 *  access to other users' rows is ever granted). */
export function useFriendsWorkouts() {
  const [workouts, setWorkouts] = useState<FriendWorkout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const today = toISODate(new Date())
    const { data, error } = await supabase.rpc("list_friends_workouts", {
      p_from: addDaysISO(today, -7),
      p_to: addDaysISO(today, 7),
    })

    if (error) {
      setError(error.message)
    } else {
      setError(null)
      setWorkouts(
        data.map((row) => ({
          workoutId: row.workout_id,
          ownerId: row.owner_id,
          username: row.username,
          target_date: row.target_date,
          title: row.title,
          notes: row.notes,
          discipline: row.discipline,
          planned_duration_minutes: row.planned_duration_minutes,
          planned_distance_km: row.planned_distance_km,
          target_zone: row.target_zone,
          extra_segments: row.extra_segments,
        }))
      )
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // Standard fetch-on-mount pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch()
  }, [refetch])

  return { workouts, loading, error, refetch }
}
