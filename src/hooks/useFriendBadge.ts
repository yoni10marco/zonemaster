"use client"

import { useCallback, useEffect, useState } from "react"

import { FRIENDS_CHANGED_EVENT } from "@/hooks/useFriends"
import { createClient } from "@/lib/supabase/client"

const REFRESH_MS = 60_000

/**
 * How many things are waiting for you (friend requests now, session invites
 * later) — the number on the menu badge. Refreshed on load, when you return to
 * the tab, once a minute, and straight after you act on a request.
 */
export function useFriendBadge(): number {
  const [count, setCount] = useState(0)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase.rpc("pending_counts")
    if (error) return // a failed badge is not worth an error message
    const row = data[0]
    setCount((row?.friend_requests ?? 0) + (row?.session_invites ?? 0))
  }, [])

  useEffect(() => {
    // Standard fetch-on-mount pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    const onVisible = () => {
      if (document.visibilityState === "visible") load()
    }
    const timer = setInterval(load, REFRESH_MS)
    window.addEventListener("focus", load)
    window.addEventListener(FRIENDS_CHANGED_EVENT, load)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearInterval(timer)
      window.removeEventListener("focus", load)
      window.removeEventListener(FRIENDS_CHANGED_EVENT, load)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [load])

  return count
}
