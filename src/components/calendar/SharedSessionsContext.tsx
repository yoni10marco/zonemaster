"use client"

import { createContext, useContext } from "react"

import type { SessionMember } from "@/lib/friends/shared-session"

// Members of the shared sessions visible on the calendar, provided once by the
// calendar page so each card can show "With bobby" without prop drilling.
const SharedSessionsContext = createContext<Map<number, SessionMember[]> | null>(null)

export const SharedSessionsProvider = SharedSessionsContext.Provider

/** The people in a session, or undefined for an ordinary workout / not loaded yet. */
export function useSharedMembers(sessionId: number | null): SessionMember[] | undefined {
  const all = useContext(SharedSessionsContext)
  return sessionId === null ? undefined : all?.get(sessionId)
}
