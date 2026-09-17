import type { Discipline } from "@/lib/types/domain"

export const DISCIPLINE_STYLES: Record<Discipline, { badge: string; dot: string }> = {
  swim: {
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  bike: {
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
    dot: "bg-orange-500",
  },
  run: {
    badge: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
    dot: "bg-green-500",
  },
  strength: {
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
    dot: "bg-purple-500",
  },
  other: {
    badge: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
    dot: "bg-zinc-500",
  },
}
