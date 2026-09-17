import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns"

const WEEK_OPTIONS = { weekStartsOn: 1 as const } // weeks start on Monday

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

export function weekRange(anchor: Date) {
  const start = startOfWeek(anchor, WEEK_OPTIONS)
  const end = endOfWeek(anchor, WEEK_OPTIONS)
  return { start, end, days: eachDayOfInterval({ start, end }) }
}

export function monthRange(anchor: Date) {
  const start = startOfMonth(anchor)
  const end = endOfMonth(anchor)
  // Pad to full weeks so the month grid has no partial rows.
  const gridStart = startOfWeek(start, WEEK_OPTIONS)
  const gridEnd = endOfWeek(end, WEEK_OPTIONS)
  return { start, end, days: eachDayOfInterval({ start: gridStart, end: gridEnd }) }
}

export function nextAnchor(anchor: Date, view: "week" | "month") {
  return view === "week" ? addWeeks(anchor, 1) : addMonths(anchor, 1)
}

export function prevAnchor(anchor: Date, view: "week" | "month") {
  return view === "week" ? subWeeks(anchor, 1) : subMonths(anchor, 1)
}

export function addDaysISO(isoDate: string, days: number): string {
  return toISODate(addDays(new Date(`${isoDate}T00:00:00`), days))
}

export { format }
