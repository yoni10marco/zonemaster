"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { createClient } from "@/lib/supabase/client"
import type { Tables } from "@/lib/types/database.types"
import { computeZoneRanges } from "@/lib/utils/zones"

export type Profile = Pick<
  Tables<"profiles">,
  | "fitness_level"
  | "primary_discipline"
  | "target_race_date"
  | "target_race_distance"
  | "max_heart_rate"
  | "resting_heart_rate"
  | "username"
  | "friend_code"
>

const PROFILE_COLUMNS =
  "fitness_level, primary_discipline, target_race_date, target_race_distance, max_heart_rate, resting_heart_rate, username, friend_code"

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    const { data } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", user.id).single()
    setProfile(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    // Standard fetch-on-mount pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch()
  }, [refetch])

  const zoneRanges = useMemo(
    () => computeZoneRanges(profile?.max_heart_rate, profile?.resting_heart_rate),
    [profile?.max_heart_rate, profile?.resting_heart_rate]
  )

  return { profile, zoneRanges, loading, refetch }
}
