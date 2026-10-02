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
 * (so every nav link can reach `start`) and place `<NavigationProgressOverlay>`
 * anywhere inside it — it covers the full viewport itself (`position: fixed`),
 * deliberately including the nav, since the nav isn't pinned to the screen and
 * can be scrolled out of view, which would otherwise leave a gap showing
 * stale content from the page being navigated away from.
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

  // Lock background scrolling while the overlay is up, so it can't scroll out
  // of view on a page that was taller than the viewport. `overflow: hidden`
  // alone hides the scrollbar and blocks keyboard scrolling, but some
  // trackpad/touch input still gets through it in at least some browsers, so
  // a non-passive wheel/touchmove listener backs it up by refusing the
  // scroll outright.
  useEffect(() => {
    if (!active) return
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = "hidden"
    body.style.overflow = "hidden"
    const prevent = (e: Event) => e.preventDefault()
    document.addEventListener("wheel", prevent, { passive: false })
    document.addEventListener("touchmove", prevent, { passive: false })
    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
      document.removeEventListener("wheel", prevent)
      document.removeEventListener("touchmove", prevent)
    }
  }, [active])

  return (
    <NavigationProgressContext.Provider value={{ active, start }}>{children}</NavigationProgressContext.Provider>
  )
}

/** Renders the branded loading overlay while a tracked navigation is in progress; nothing otherwise. */
export function NavigationProgressOverlay() {
  const ctx = useContext(NavigationProgressContext)
  if (!ctx?.active) return null
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
      <ZoneLogo className="size-10 animate-spin" />
      <p className="text-sm">Loading…</p>
    </div>
  )
}
