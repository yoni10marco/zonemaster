"use client"

import { useCallback, useEffect, useState } from "react"

import { FRIENDS_CHANGED_EVENT } from "@/hooks/useFriends"
import { fetchSessionInvites, respondToSessionInvite, type SessionInvite } from "@/lib/friends/sessions"

/** Invitations from friends to plan a session together. */
export function useSessionInvites() {
  const [invites, setInvites] = useState<SessionInvite[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    try {
      setInvites(await fetchSessionInvites())
    } catch {
      // The Friends page already reports load problems for the rest of its data.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Standard fetch-on-mount pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch()
  }, [refetch])

  /** Accepting puts the session on your calendar; declining just clears the invite. */
  async function respond(sessionId: number, accept: boolean) {
    await respondToSessionInvite(sessionId, accept)
    await refetch()
    window.dispatchEvent(new Event(FRIENDS_CHANGED_EVENT))
  }

  return { invites, loading, refetch, respond }
}
