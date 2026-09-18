import { Activity, Bike, Dumbbell, Footprints, Waves, type LucideIcon } from "lucide-react"

import type { Discipline } from "@/lib/types/domain"

// Each discipline gets its own clearly different hue (teal / amber / rose /
// fuchsia) so the color alone tells you the activity at a glance — and none of
// them is green, which is reserved for the "completed" check. Cards use a
// solid tint plus a thick left accent bar, not a faint gradient, so activities
// stay distinguishable side by side in a week.
export const DISCIPLINE_STYLES: Record<
  Discipline,
  { badge: string; dot: string; card: string; iconBg: string; text: string }
> = {
  swim: {
    badge: "bg-teal-300 text-teal-950 dark:bg-teal-800 dark:text-teal-100",
    dot: "bg-teal-500",
    card: "border-teal-300 border-l-4 border-l-teal-600 bg-teal-100 dark:border-teal-800 dark:border-l-teal-400 dark:bg-teal-950/70",
    iconBg: "bg-teal-600 text-white dark:bg-teal-500 dark:text-teal-950",
    text: "text-teal-800 dark:text-teal-300",
  },
  bike: {
    badge: "bg-amber-300 text-amber-950 dark:bg-amber-800 dark:text-amber-100",
    dot: "bg-amber-500",
    card: "border-amber-300 border-l-4 border-l-amber-600 bg-amber-100 dark:border-amber-800 dark:border-l-amber-400 dark:bg-amber-950/70",
    iconBg: "bg-amber-600 text-white dark:bg-amber-500 dark:text-amber-950",
    text: "text-amber-800 dark:text-amber-300",
  },
  run: {
    badge: "bg-rose-300 text-rose-950 dark:bg-rose-800 dark:text-rose-100",
    dot: "bg-rose-500",
    card: "border-rose-300 border-l-4 border-l-rose-600 bg-rose-100 dark:border-rose-800 dark:border-l-rose-400 dark:bg-rose-950/70",
    iconBg: "bg-rose-600 text-white dark:bg-rose-500 dark:text-rose-950",
    text: "text-rose-800 dark:text-rose-300",
  },
  strength: {
    badge: "bg-fuchsia-300 text-fuchsia-950 dark:bg-fuchsia-800 dark:text-fuchsia-100",
    dot: "bg-fuchsia-500",
    card: "border-fuchsia-300 border-l-4 border-l-fuchsia-600 bg-fuchsia-100 dark:border-fuchsia-800 dark:border-l-fuchsia-400 dark:bg-fuchsia-950/70",
    iconBg: "bg-fuchsia-600 text-white dark:bg-fuchsia-500 dark:text-fuchsia-950",
    text: "text-fuchsia-800 dark:text-fuchsia-300",
  },
  other: {
    badge: "bg-slate-300 text-slate-950 dark:bg-slate-800 dark:text-slate-100",
    dot: "bg-slate-500",
    card: "border-slate-300 border-l-4 border-l-slate-600 bg-slate-100 dark:border-slate-800 dark:border-l-slate-400 dark:bg-slate-950/70",
    iconBg: "bg-slate-600 text-white dark:bg-slate-500 dark:text-slate-950",
    text: "text-slate-800 dark:text-slate-300",
  },
}

export const DISCIPLINE_ICONS: Record<Discipline, LucideIcon> = {
  swim: Waves,
  bike: Bike,
  run: Footprints,
  strength: Dumbbell,
  other: Activity,
}
