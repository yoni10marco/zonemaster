"use client"

import { useCallback, useEffect, useState } from "react"

import { createClient } from "@/lib/supabase/client"
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/types/database.types"
import { toISODate } from "@/lib/utils/dates"

export type CompletedWorkout = Tables<"completed_workouts">
export type CompletedWorkoutInsert = TablesInsert<"completed_workouts">
export type CompletedWorkoutUpdate = TablesUpdate<"completed_workouts">

// null start/end means unbounded ("all time") — RLS still scopes results to
// the current user, so this never leaks other users' data.
export function useCompletedWorkouts(rangeStart: Date | null, rangeEnd: Date | null) {
  const [completions, setCompletions] = useState<CompletedWorkout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const startISO = rangeStart ? toISODate(rangeStart) : null
  const endISO = rangeEnd ? toISODate(rangeEnd) : null

  const refetch = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    let query = supabase.from("completed_workouts").select("*")
    if (startISO) query = query.gte("execution_date", startISO)
    if (endISO) query = query.lte("execution_date", endISO)
    const { data, error } = await query.order("execution_date", { ascending: true })

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

  async function deleteCompletion(id: number) {
    const supabase = createClient()
    const { error } = await supabase.from("completed_workouts").delete().eq("id", id)
    if (error) throw new Error(error.message)
    setCompletions((prev) => prev.filter((c) => c.id !== id))
  }

  return {
    completions,
    loading,
    error,
    refetch,
    logCompletion,
    deleteCompletion,
  }
}
