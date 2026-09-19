import type { Discipline } from "@/lib/types/domain"

/**
 * Maps the sport name a watch or app writes (FIT "running", TCX "Biking",
 * GPX "cycling", numeric GPX types like "9", ...) to one of our disciplines.
 */
export function disciplineFromSport(sport: string | null | undefined): Discipline {
  const s = (sport ?? "").trim().toLowerCase()
  if (/swim/.test(s)) return "swim"
  if (/bik|cycl|ride|spinning/.test(s)) return "bike"
  if (/run|jog/.test(s)) return "run"
  if (/strength|weight|gym|fitness_equipment|training|crossfit/.test(s)) return "strength"
  // Numeric GPX types some apps write: 1 = ride, 9 = run, 5 = swim.
  if (s === "1") return "bike"
  if (s === "9") return "run"
  if (s === "5") return "swim"
  return "other"
}
