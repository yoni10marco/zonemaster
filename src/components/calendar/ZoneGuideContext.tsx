"use client"

import { createContext, useContext } from "react"

import type { ZoneGuide } from "@/lib/utils/training-zones"

// The signed-in athlete's zone numbers (heart rate, bike power, run and swim
// pace). Provided once by the calendar page so the cards, the workout form and
// the import preview can show "Z2 · 138–188 W" without threading a prop through
// the week/month/day components. Null outside the provider.
const ZoneGuideContext = createContext<ZoneGuide | null>(null)

export const ZoneGuideProvider = ZoneGuideContext.Provider

export function useZoneGuide(): ZoneGuide | null {
  return useContext(ZoneGuideContext)
}
