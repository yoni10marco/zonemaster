import { describe, expect, it } from "vitest"

import { raceCountdown, weekStreak, weeklyTrend } from "@/lib/utils/progress"

// Fri 2026-09-18 — that week is Mon 2026-09-14 .. Sun 2026-09-20.
const TODAY = new Date(2026, 8, 18)

describe("weeklyTrend", () => {
  it("buckets sessions into Monday-based weeks, oldest first", () => {
    const trend = weeklyTrend(
      ["2026-09-14", "2026-09-20", "2026-09-07", "2026-08-01"], // the last one is outside 3 weeks
      ["2026-09-15", "2026-09-08", "2026-09-09", "2026-09-10"],
      3,
      TODAY
    )
    expect(trend.map((w) => w.start)).toEqual(["2026-08-31", "2026-09-07", "2026-09-14"])
    expect(trend.map((w) => [w.planned, w.completed])).toEqual([
      [0, 0],
      [1, 3],
      [2, 1],
    ])
    expect(trend.map((w) => w.isCurrent)).toEqual([false, false, true])
  })

  it("puts a Sunday session in the week that started the previous Monday", () => {
    const trend = weeklyTrend([], ["2026-09-13"], 2, TODAY) // a Sunday
    expect(trend[0]).toMatchObject({ start: "2026-09-07", completed: 1 })
    expect(trend[1]).toMatchObject({ start: "2026-09-14", completed: 0 })
  })
})

describe("weekStreak", () => {
  it("counts consecutive weeks ending at the current week", () => {
    const dates = ["2026-09-15", "2026-09-08", "2026-09-01", "2026-08-11"]
    expect(weekStreak(dates, TODAY)).toEqual({ current: 3, best: 3 })
  })

  it("does not break the streak just because this week has no workout yet", () => {
    const dates = ["2026-09-08", "2026-09-01"] // nothing in the current week
    expect(weekStreak(dates, TODAY)).toEqual({ current: 2, best: 2 })
  })

  it("resets after a missed full week and remembers the best run", () => {
    const dates = ["2026-09-15", "2026-08-25", "2026-08-18", "2026-08-11", "2026-08-04"]
    expect(weekStreak(dates, TODAY)).toEqual({ current: 1, best: 4 })
  })

  it("is zero with no workouts, or when the last workout is long ago", () => {
    expect(weekStreak([], TODAY)).toEqual({ current: 0, best: 0 })
    expect(weekStreak(["2026-06-01"], TODAY)).toEqual({ current: 0, best: 1 })
  })

  it("counts several workouts in one week as one week", () => {
    expect(weekStreak(["2026-09-14", "2026-09-15", "2026-09-16"], TODAY)).toEqual({
      current: 1,
      best: 1,
    })
  })
})

describe("raceCountdown", () => {
  it("splits the time into weeks and days", () => {
    expect(raceCountdown("2026-10-25", TODAY)).toEqual({
      days: 37,
      weeks: 5,
      extraDays: 2,
      isToday: false,
      isPast: false,
    })
  })

  it("handles race day and past races", () => {
    expect(raceCountdown("2026-09-18", TODAY)).toMatchObject({ days: 0, isToday: true, isPast: false })
    expect(raceCountdown("2026-09-01", TODAY)).toMatchObject({ days: 0, isPast: true })
  })

  it("returns null without a usable date", () => {
    expect(raceCountdown(null, TODAY)).toBeNull()
    expect(raceCountdown("", TODAY)).toBeNull()
    expect(raceCountdown("not-a-date", TODAY)).toBeNull()
  })
})
