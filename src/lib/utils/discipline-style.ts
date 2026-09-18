import { Activity, Bike, Dumbbell, Footprints, Waves, type LucideIcon } from "lucide-react"

import type { Discipline } from "@/lib/types/domain"

// Deliberately multi-hue and distinct from the app's blue/cyan chrome: this
// is a categorical legend (swim vs. bike vs. run...), and a legend only
// works if each category has its own recognizable color.
export const DISCIPLINE_STYLES: Record<Discipline, { badge: string; dot: string }> = {
  swim: {
    badge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
    dot: "bg-cyan-500",
  },
  bike: {
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  run: {
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  strength: {
    badge: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
    dot: "bg-violet-500",
  },
  other: {
    badge: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
    dot: "bg-slate-500",
  },
}

export const DISCIPLINE_ICONS: Record<Discipline, LucideIcon> = {
  swim: Waves,
  bike: Bike,
  run: Footprints,
  strength: Dumbbell,
  other: Activity,
}
