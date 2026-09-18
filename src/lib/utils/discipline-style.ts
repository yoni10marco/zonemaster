import { Activity, Bike, Dumbbell, Footprints, Waves, type LucideIcon } from "lucide-react"

import type { Discipline } from "@/lib/types/domain"

// Deliberately multi-hue and distinct from the app's blue/cyan chrome: this
// is a categorical legend (swim vs. bike vs. run...), and a legend only
// works if each category has its own recognizable color.
export const DISCIPLINE_STYLES: Record<
  Discipline,
  { badge: string; dot: string; card: string; iconBg: string; text: string }
> = {
  swim: {
    badge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
    dot: "bg-cyan-500",
    card: "border-cyan-200 bg-gradient-to-br from-cyan-50 to-cyan-100/60 dark:border-cyan-900/60 dark:from-cyan-950/50 dark:to-cyan-950/20",
    iconBg: "bg-cyan-500/15 text-cyan-600 dark:bg-cyan-400/15 dark:text-cyan-300",
    text: "text-cyan-700 dark:text-cyan-300",
  },
  bike: {
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    dot: "bg-blue-500",
    card: "border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/60 dark:border-blue-900/60 dark:from-blue-950/50 dark:to-blue-950/20",
    iconBg: "bg-blue-500/15 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300",
    text: "text-blue-700 dark:text-blue-300",
  },
  run: {
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    dot: "bg-emerald-500",
    card: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/60 dark:border-emerald-900/60 dark:from-emerald-950/50 dark:to-emerald-950/20",
    iconBg: "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  strength: {
    badge: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
    dot: "bg-violet-500",
    card: "border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100/60 dark:border-violet-900/60 dark:from-violet-950/50 dark:to-violet-950/20",
    iconBg: "bg-violet-500/15 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300",
    text: "text-violet-700 dark:text-violet-300",
  },
  other: {
    badge: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
    dot: "bg-slate-500",
    card: "border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/60 dark:border-slate-800 dark:from-slate-900/50 dark:to-slate-900/20",
    iconBg: "bg-slate-500/15 text-slate-600 dark:bg-slate-400/15 dark:text-slate-300",
    text: "text-slate-700 dark:text-slate-300",
  },
}

export const DISCIPLINE_ICONS: Record<Discipline, LucideIcon> = {
  swim: Waves,
  bike: Bike,
  run: Footprints,
  strength: Dumbbell,
  other: Activity,
}
