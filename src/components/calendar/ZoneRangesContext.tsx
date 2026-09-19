"use client"

import { createContext, useContext } from "react"

import type { ZoneRanges } from "@/lib/utils/zones"

// Heart-rate zone ranges for the signed-in athlete (null when they haven't
// entered a max heart rate). Provided once by the calendar page so the cards
// and the workout form can show "Z2 · 114–133 bpm" without threading a prop
// through the week/month/day components.
const ZoneRangesContext = createContext<ZoneRanges | null>(null)

export const ZoneRangesProvider = ZoneRangesContext.Provider

export function useZoneRanges(): ZoneRanges | null {
  return useContext(ZoneRangesContext)
}
