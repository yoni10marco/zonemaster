import { differenceInCalendarDays, format, parseISO, startOfWeek, subWeeks } from "date-fns"

const WEEK_OPTIONS = { weekStartsOn: 1 as const } // weeks start on Monday

function weekStartISO(date: Date): string {
  return format(startOfWeek(date, WEEK_OPTIONS), "yyyy-MM-dd")
}

export type WeekBucket = {
  /** Monday of the week, yyyy-MM-dd. */
  start: string
  planned: number
  completed: number
  isCurrent: boolean
}

/**
 * The last `weeks` weeks (oldest first, current week last): how many sessions
 * were planned and how many were actually done in each.
 */
export function weeklyTrend(
  plannedDates: string[],
  completedDates: string[],
  weeks: number,
  today: Date
): WeekBucket[] {
  const currentStart = startOfWeek(today, WEEK_OPTIONS)
  const buckets = new Map<string, WeekBucket>()
  for (let i = weeks - 1; i >= 0; i--) {
    const start = weekStartISO(subWeeks(currentStart, i))
    buckets.set(start, { start, planned: 0, completed: 0, isCurrent: i === 0 })
  }
  for (const date of plannedDates) {
    const bucket = buckets.get(weekStartISO(parseISO(date)))
    if (bucket) bucket.planned++
  }
  for (const date of completedDates) {
    const bucket = buckets.get(weekStartISO(parseISO(date)))
    if (bucket) bucket.completed++
  }
  return [...buckets.values()]
}

export type WeekStreak = { current: number; best: number }

/**
 * Consecutive weeks with at least one completed workout. The current week only
 * counts once it has a workout, but an empty current week does not break a
 * streak (it is still in progress), so the number does not drop to 0 every Monday.
 */
export function weekStreak(completedDates: string[], today: Date): WeekStreak {
  const weeks = new Set(completedDates.map((d) => weekStartISO(parseISO(d))))
  if (weeks.size === 0) return { current: 0, best: 0 }

  const sorted = [...weeks].sort()
  let best = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    const gapDays = differenceInCalendarDays(parseISO(sorted[i]), parseISO(sorted[i - 1]))
    run = gapDays === 7 ? run + 1 : 1
    best = Math.max(best, run)
  }

  const thisWeek = startOfWeek(today, WEEK_OPTIONS)
  let cursor = weeks.has(weekStartISO(thisWeek)) ? thisWeek : subWeeks(thisWeek, 1)
  let current = 0
  while (weeks.has(weekStartISO(cursor))) {
    current++
    cursor = subWeeks(cursor, 1)
  }
  return { current, best }
}

export type RaceCountdown = {
  days: number
  weeks: number
  /** Days left over after the whole weeks. */
  extraDays: number
  isToday: boolean
  isPast: boolean
}

export function raceCountdown(raceDate: string | null | undefined, today: Date): RaceCountdown | null {
  if (!raceDate) return null
  const days = differenceInCalendarDays(parseISO(raceDate), today)
  if (Number.isNaN(days)) return null
  const remaining = Math.max(days, 0)
  return {
    days: remaining,
    weeks: Math.floor(remaining / 7),
    extraDays: remaining % 7,
    isToday: days === 0,
    isPast: days < 0,
  }
}
