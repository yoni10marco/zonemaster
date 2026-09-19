import { describe, expect, it } from "vitest"

import type { PlannedWorkout } from "@/hooks/usePlannedWorkouts"
import { REPEAT_WEEK_OPTIONS, copyFields, repeatDates, shiftWorkouts } from "@/lib/utils/repeat"

function workout(overrides: Partial<PlannedWorkout> = {}): PlannedWorkout {
  return {
    id: 1,
    user_id: "u1",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    target_date: "2026-09-14",
    discipline: "run",
    title: "Easy run",
    notes: null,
    planned_duration_minutes: 45,
    planned_distance_km: null,
    target_zone: "z2",
    ...overrides,
  }
}

describe("repeatDates", () => {
  it("returns the same weekday for each extra week", () => {
    expect(repeatDates("2026-09-14", 3)).toEqual(["2026-09-21", "2026-09-28", "2026-10-05"])
  })

  it("crosses month and year boundaries correctly", () => {
    expect(repeatDates("2026-12-28", 2)).toEqual(["2027-01-04", "2027-01-11"])
  })

  it("offers exactly 1 to 5 weeks, in steps of one", () => {
    expect([...REPEAT_WEEK_OPTIONS]).toEqual([1, 2, 3, 4, 5])
  })

  it("returns nothing for zero, negative or junk counts, and caps very large ones", () => {
    expect(repeatDates("2026-09-14", 0)).toEqual([])
    expect(repeatDates("2026-09-14", -3)).toEqual([])
    expect(repeatDates("2026-09-14", Number.NaN)).toEqual([])
    expect(repeatDates("2026-09-14", 500)).toHaveLength(5)
  })
})

describe("copyFields", () => {
  it("copies the plan details onto a new date and drops identity fields", () => {
    const copy = copyFields(workout({ id: 9, notes: "keep it easy" }), "2026-09-21")
    expect(copy).toEqual({
      target_date: "2026-09-21",
      discipline: "run",
      title: "Easy run",
      notes: "keep it easy",
      planned_duration_minutes: 45,
      planned_distance_km: null,
      target_zone: "z2",
    })
    expect(copy).not.toHaveProperty("id")
    expect(copy).not.toHaveProperty("user_id")
  })
})

describe("shiftWorkouts", () => {
  const lastWeek = [
    workout({ id: 1, target_date: "2026-09-14" }),
    workout({ id: 2, target_date: "2026-09-16", discipline: "swim", title: "Pool", planned_distance_km: 1.5, planned_duration_minutes: null, target_zone: null }),
  ]

  it("shifts every workout by the given number of days", () => {
    const result = shiftWorkouts(lastWeek, [], 7)
    expect(result.map((r) => [r.target_date, r.discipline])).toEqual([
      ["2026-09-21", "run"],
      ["2026-09-23", "swim"],
    ])
  })

  it("skips workouts that already exist identically on the target day", () => {
    const existing = [workout({ id: 50, target_date: "2026-09-21" })]
    const result = shiftWorkouts(lastWeek, existing, 7)
    expect(result.map((r) => r.discipline)).toEqual(["swim"])
  })

  it("still copies a workout that only differs in its details", () => {
    const existing = [workout({ id: 50, target_date: "2026-09-21", planned_duration_minutes: 30 })]
    expect(shiftWorkouts(lastWeek, existing, 7)).toHaveLength(2)
  })

  it("does not create the same workout twice from duplicate sources", () => {
    const twins = [workout({ id: 1 }), workout({ id: 2 })]
    expect(shiftWorkouts(twins, [], 7)).toHaveLength(1)
  })

  it("returns nothing for an empty source", () => {
    expect(shiftWorkouts([], [], 7)).toEqual([])
  })
})
