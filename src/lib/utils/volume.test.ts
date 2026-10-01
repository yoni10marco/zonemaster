import { describe, expect, it } from "vitest"

import { activityCounts, sessionCompletion } from "@/lib/utils/volume"

type Planned = Parameters<typeof sessionCompletion>[0][number]
type Completed = Parameters<typeof sessionCompletion>[1][number]

function planned(id: number, over: Partial<Planned> = {}): Planned {
  return { id, user_id: "u", target_date: "2026-09-22", discipline: "run", planned_duration_minutes: 30, ...over } as Planned
}
function completed(over: Partial<Completed> = {}): Completed {
  return {
    id: Math.random(),
    user_id: "u",
    execution_date: "2026-09-22",
    discipline: "run",
    actual_duration_minutes: 30,
    actual_distance_km: null,
    planned_workout_id: null,
    extra_segments: null,
    ...over,
  } as Completed
}

describe("sessionCompletion", () => {
  it("counts a planned workout as done once anything is logged against it", () => {
    const p = [planned(1), planned(2)]
    const c = [completed({ planned_workout_id: 1 })]
    expect(sessionCompletion(p, c)).toEqual({ completed: 1, total: 2 })
  })

  it("is 0 of 0 with nothing planned", () => {
    expect(sessionCompletion([], [])).toEqual({ completed: 0, total: 0 })
  })

  it("ignores unplanned completions (not linked to any planned workout)", () => {
    const p = [planned(1)]
    const c = [completed({ planned_workout_id: null })]
    expect(sessionCompletion(p, c)).toEqual({ completed: 0, total: 1 })
  })

  it("a multi-sport session still counts as exactly one, not one per discipline", () => {
    const p = [planned(1)]
    const c = [
      completed({
        planned_workout_id: 1,
        discipline: "bike",
        extra_segments: [{ discipline: "run", actual_duration_minutes: 20, actual_distance_km: null, avg_heart_rate: null, avg_pace_or_power: null }],
      }),
    ]
    expect(sessionCompletion(p, c)).toEqual({ completed: 1, total: 1 })
  })
})

describe("activityCounts", () => {
  it("counts one per completed workout, by discipline", () => {
    const c = [completed({ discipline: "run" }), completed({ discipline: "run" }), completed({ discipline: "bike" })]
    expect(activityCounts(c)).toEqual([
      { discipline: "bike", count: 1 },
      { discipline: "run", count: 2 },
    ])
  })

  it("leaves out disciplines with no activity", () => {
    expect(activityCounts([completed({ discipline: "swim" })]).map((d) => d.discipline)).toEqual(["swim"])
  })

  it("is empty with no completions", () => {
    expect(activityCounts([])).toEqual([])
  })

  it("counts a brick session once for each discipline it covers", () => {
    const brick = completed({
      discipline: "bike",
      extra_segments: [{ discipline: "run", actual_duration_minutes: 20, actual_distance_km: null, avg_heart_rate: null, avg_pace_or_power: null }],
    })
    expect(activityCounts([brick])).toEqual([
      { discipline: "bike", count: 1 },
      { discipline: "run", count: 1 },
    ])
  })

  it("does not double-count a brick with two legs of the same discipline", () => {
    const brick = completed({
      discipline: "run",
      extra_segments: [{ discipline: "run", actual_duration_minutes: 10, actual_distance_km: null, avg_heart_rate: null, avg_pace_or_power: null }],
    })
    expect(activityCounts([brick])).toEqual([{ discipline: "run", count: 1 }])
  })

  it("adds a brick's counts on top of ordinary sessions in the same discipline", () => {
    const brick = completed({
      discipline: "bike",
      extra_segments: [{ discipline: "run", actual_duration_minutes: 20, actual_distance_km: null, avg_heart_rate: null, avg_pace_or_power: null }],
    })
    const c = [brick, completed({ discipline: "run" })]
    expect(activityCounts(c)).toEqual([
      { discipline: "bike", count: 1 },
      { discipline: "run", count: 2 },
    ])
  })
})
