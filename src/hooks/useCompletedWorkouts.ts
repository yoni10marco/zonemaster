"use client"

import { useCallback, useEffect, useState } from "react"

import { createClient } from "@/lib/supabase/client"
import type { Tables, TablesInsert } from "@/lib/types/database.types"
import type { Discipline } from "@/lib/types/domain"
import { toISODate } from "@/lib/utils/dates"

export type CompletedWorkout = Tables<"completed_workouts">
export type CompletedWorkoutInsert = TablesInsert<"completed_workouts">

export function useCompletedWorkouts(rangeStart: Date, rangeEnd: Date) {
  const [completions, setCompletions] = useState<CompletedWorkout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const startISO = toISODate(rangeStart)
  const endISO = toISODate(rangeEnd)

  const refetch = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from("completed_workouts")
      .select("*")
      .gte("execution_date", startISO)
      .lte("execution_date", endISO)
      .order("execution_date", { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      setError(null)
      setCompletions(data)
    }
    setLoading(false)
  }, [startISO, endISO])

  useEffect(() => {
    // Standard fetch-on-mount/range-change pattern; refetch's internal
    // setLoading(true) is a false positive for this rule.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch()
  }, [refetch])

  async function logCompletion(input: Omit<CompletedWorkoutInsert, "user_id">) {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    const { data, error } = await supabase
      .from("completed_workouts")
      .insert({ ...input, user_id: user.id })
      .select()
      .single()

    if (error) throw new Error(error.message)
    setCompletions((prev) => [...prev, data])
    return data
  }

  // Find an existing planned workout for the same date+discipline with no
  // linked completion yet, so a standalone log can prompt to link to it.
  // Returns the planned duration/distance too, so a completion left blank
  // can default to "completed as planned" rather than an empty actual.
  async function findLinkCandidate(executionDate: string, discipline: Discipline) {
    const supabase = createClient()
    const { data: planned, error: plannedError } = await supabase
      .from("planned_workouts")
      .select("id, planned_duration_minutes, planned_distance_km")
      .eq("target_date", executionDate)
      .eq("discipline", discipline)

    if (plannedError || !planned || planned.length === 0) return null

    const { data: linked, error: linkedError } = await supabase
      .from("completed_workouts")
      .select("planned_workout_id")
      .in(
        "planned_workout_id",
        planned.map((p) => p.id)
      )

    if (linkedError) return null

    const linkedIds = new Set(linked.map((l) => l.planned_workout_id))
    const candidates = planned.filter((p) => !linkedIds.has(p.id))

    return candidates.length === 1 ? candidates[0] : null
  }

  return { completions, loading, error, refetch, logCompletion, findLinkCandidate }
}
