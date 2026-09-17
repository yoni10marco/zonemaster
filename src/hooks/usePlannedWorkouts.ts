"use client"

import { useCallback, useEffect, useState } from "react"

import { createClient } from "@/lib/supabase/client"
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/types/database.types"
import { toISODate } from "@/lib/utils/dates"

export type PlannedWorkout = Tables<"planned_workouts">
export type PlannedWorkoutInsert = TablesInsert<"planned_workouts">
export type PlannedWorkoutUpdate = TablesUpdate<"planned_workouts">

export function usePlannedWorkouts(rangeStart: Date, rangeEnd: Date) {
  const [workouts, setWorkouts] = useState<PlannedWorkout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const startISO = toISODate(rangeStart)
  const endISO = toISODate(rangeEnd)

  const refetch = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from("planned_workouts")
      .select("*")
      .gte("target_date", startISO)
      .lte("target_date", endISO)
      .order("target_date", { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      setError(null)
      setWorkouts(data)
    }
    setLoading(false)
  }, [startISO, endISO])

  useEffect(() => {
    // Standard fetch-on-mount/range-change pattern; refetch's internal
    // setLoading(true) is a false positive for this rule.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch()
  }, [refetch])

  async function createWorkout(input: Omit<PlannedWorkoutInsert, "user_id">) {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    const { data, error } = await supabase
      .from("planned_workouts")
      .insert({ ...input, user_id: user.id })
      .select()
      .single()

    if (error) throw new Error(error.message)
    setWorkouts((prev) => [...prev, data].sort((a, b) => a.target_date.localeCompare(b.target_date)))
    return data
  }

  async function updateWorkout(id: number, input: PlannedWorkoutUpdate) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("planned_workouts")
      .update(input)
      .eq("id", id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    setWorkouts((prev) => prev.map((w) => (w.id === id ? data : w)))
    return data
  }

  async function deleteWorkout(id: number) {
    const supabase = createClient()
    const { error } = await supabase.from("planned_workouts").delete().eq("id", id)
    if (error) throw new Error(error.message)
    setWorkouts((prev) => prev.filter((w) => w.id !== id))
  }

  async function rescheduleWorkout(id: number, newDate: string) {
    const previous = workouts
    setWorkouts((prev) => prev.map((w) => (w.id === id ? { ...w, target_date: newDate } : w)))

    const supabase = createClient()
    const { error } = await supabase
      .from("planned_workouts")
      .update({ target_date: newDate })
      .eq("id", id)

    if (error) {
      setWorkouts(previous)
      throw new Error(error.message)
    }
  }

  return {
    workouts,
    loading,
    error,
    refetch,
    createWorkout,
    updateWorkout,
    deleteWorkout,
    rescheduleWorkout,
  }
}
