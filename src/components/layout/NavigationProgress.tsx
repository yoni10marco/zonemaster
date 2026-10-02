"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"

import { ZoneLogo } from "@/components/layout/ZoneLogo"

// A failsafe: whatever happens (clicking the page you're already on, a
// cancelled navigation, an error), the overlay below can never stay up for
// longer than this. Getting stuck forever is exactly the bug this works
// around not reintroducing — see ROADMAP.md on loading.tsx.
const MAX_OVERLAY_MS = 4000

type NavigationProgress = { active: boolean; start: () => void }
const NavigationProgressContext = createContext<NavigationProgress | null>(null)

/** Call from a nav link's onClick to show the loading overlay right away. */
export function useStartNavigationProgress(): () => void {
  const ctx = useContext(NavigationProgressContext)
  if (!ctx) throw new Error("useStartNavigationProgress must be used within NavigationProgressProvider")
  return ctx.start
}

/**
 * Brings back the instant "something is happening" feedback a route-level
 * loading.tsx used to give — without Suspense or a route-level fallback,
 * which is what made that version hang the app (see ROADMAP.md). This is
 * plain client state: a nav link's onClick flips it on, and it goes off again
 * the moment the new page's content actually mounts (or after MAX_OVERLAY_MS,
 * whichever comes first, so it can never get stuck). Wrap the whole layout
 * (so every nav link can reach `start`), and place `<NavigationProgressOverlay>`
 * wherever the overlay should actually render — typically just inside `<main>`,
 * so the nav around it stays visible and interactive while it shows.
 */
export function NavigationProgressProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false)
  const pathname = usePathname()
  const mounted = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function start() {
    setActive(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setActive(false), MAX_OVERLAY_MS)
  }

  useEffect(() => {
    // Skip the very first render; only clear once a navigation actually lands.
    if (mounted.current) {
      setActive(false)
      if (timer.current) clearTimeout(timer.current)
    }
    mounted.current = true
  }, [pathname])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  return (
    <NavigationProgressContext.Provider value={{ active, start }}>{children}</NavigationProgressContext.Provider>
  )
}

/** Renders the branded loading overlay while a tracked navigation is in progress; nothing otherwise. */
export function NavigationProgressOverlay() {
  const ctx = useContext(NavigationProgressContext)
  if (!ctx?.active) return null
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background py-20 text-muted-foreground">
      <ZoneLogo className="size-10 animate-spin" />
      <p className="text-sm">Loading…</p>
    </div>
  )
}
