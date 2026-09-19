"use client"

import { useCallback, useEffect, useState } from "react"

import { fetchSessionOverview } from "@/lib/friends/sessions"
import type { SessionMember } from "@/lib/friends/shared-session"

/**
 * Who is in each of the given shared sessions (the ones visible on the current
 * calendar page). Reloads when the set of sessions changes, or when `refreshKey`
 * changes (for example after you tick a workout done, which changes who has completed it).
 */
export function useSharedSessions(sessionIds: number[], refreshKey = "") {
  const [members, setMembers] = useState<Map<number, SessionMember[]>>(new Map())

  // A stable key, so a new array with the same ids does not refetch.
  const key = [...new Set(sessionIds)].sort((a, b) => a - b).join(",")

  const refetch = useCallback(async () => {
    const ids = key ? key.split(",").map(Number) : []
    try {
      setMembers(await fetchSessionOverview(ids))
    } catch {
      // Without it the cards simply don't show who else is in the session.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshKey only exists to retrigger this
  }, [key, refreshKey])

  useEffect(() => {
    // Standard fetch-on-change pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch()
  }, [refetch])

  return { members, refetch }
}
