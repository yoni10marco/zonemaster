"use client"

import { useCallback, useEffect, useState } from "react"

import { createClient } from "@/lib/supabase/client"
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/types/database.types"
import { addDaysISO, toISODate } from "@/lib/utils/dates"
import { shiftWorkouts } from "@/lib/utils/repeat"

export type PlannedWorkout = Tables<"planned_workouts">
export type PlannedWorkoutInsert = TablesInsert<"planned_workouts">
export type PlannedWorkoutUpdate = TablesUpdate<"planned_workouts">

// null start/end means unbounded ("all time") — RLS still scopes results to
// the current user, so this never leaks other users' data.
export function usePlannedWorkouts(rangeStart: Date | null, rangeEnd: Date | null) {
  const [workouts, setWorkouts] = useState<PlannedWorkout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const startISO = rangeStart ? toISODate(rangeStart) : null
  const endISO = rangeEnd ? toISODate(rangeEnd) : null

  const refetch = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    let query = supabase.from("planned_workouts").select("*")
    if (startISO) query = query.gte("target_date", startISO)
    if (endISO) query = query.lte("target_date", endISO)
    const { data, error } = await query.order("target_date", { ascending: true })

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

  // Insert several workouts at once (repeat / duplicate / copy week). Only the
  // ones that fall inside the visible range are added to local state; the rest
  // simply show up when the user navigates there.
  async function createWorkouts(inputs: Omit<PlannedWorkoutInsert, "user_id">[]) {
    if (inputs.length === 0) return []
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    const { data, error } = await supabase
      .from("planned_workouts")
      .insert(inputs.map((input) => ({ ...input, user_id: user.id })))
      .select()

    if (error) throw new Error(error.message)
    const visible = data.filter(
      (w) => (!startISO || w.target_date >= startISO) && (!endISO || w.target_date <= endISO)
    )
    if (visible.length > 0) {
      setWorkouts((prev) =>
        [...prev, ...visible].sort((a, b) => a.target_date.localeCompare(b.target_date))
      )
    }
    return data
  }

  async function deleteWorkouts(ids: number[]) {
    if (ids.length === 0) return
    const supabase = createClient()
    const { error } = await supabase.from("planned_workouts").delete().in("id", ids)
    if (error) throw new Error(error.message)
    setWorkouts((prev) => prev.filter((w) => !ids.includes(w.id)))
  }

  // Copy the workouts of the 7 days starting at `sourceStartISO` onto the week
  // `shiftDays` later, skipping anything already identical there.
  async function copyWeek(sourceStartISO: string, shiftDays: number) {
    const supabase = createClient()
    const sourceEnd = addDaysISO(sourceStartISO, 6)
    const targetStart = addDaysISO(sourceStartISO, shiftDays)
    const targetEnd = addDaysISO(sourceEnd, shiftDays)

    const [source, target] = await Promise.all([
      supabase
        .from("planned_workouts")
        .select("*")
        .gte("target_date", sourceStartISO)
        .lte("target_date", sourceEnd),
      supabase
        .from("planned_workouts")
        .select("*")
        .gte("target_date", targetStart)
        .lte("target_date", targetEnd),
    ])
    if (source.error) throw new Error(source.error.message)
    if (target.error) throw new Error(target.error.message)

    return createWorkouts(shiftWorkouts(source.data, target.data, shiftDays))
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
    createWorkouts,
    copyWeek,
    updateWorkout,
    deleteWorkout,
    deleteWorkouts,
    rescheduleWorkout,
  }
}
