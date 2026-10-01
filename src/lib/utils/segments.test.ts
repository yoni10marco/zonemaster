import { describe, expect, it } from "vitest"

import {
  buildExtraSegments,
  completedLegs,
  disciplinesOf,
  isMultiSport,
  parseExtraCompletedSegments,
  parseExtraPlannedSegments,
  plannedLegs,
  type PlannedSegment,
} from "@/lib/utils/segments"

const planned = (over: Partial<Parameters<typeof plannedLegs>[0]> = {}) => ({
  discipline: "bike" as const,
  planned_duration_minutes: 60,
  planned_distance_km: 30,
  target_zone: "z2" as const,
  extra_segments: null,
  ...over,
})

const completed = (over: Partial<Parameters<typeof completedLegs>[0]> = {}) => ({
  discipline: "bike" as const,
  actual_duration_minutes: 58,
  actual_distance_km: 29,
  avg_heart_rate: 140,
  avg_pace_or_power: "180 W",
  extra_segments: null,
  ...over,
})

describe("parseExtraPlannedSegments", () => {
  it("is empty for an ordinary (non-multi-sport) workout", () => {
    expect(parseExtraPlannedSegments(null)).toEqual([])
  })

  it("parses a valid extra leg", () => {
    expect(parseExtraPlannedSegments([{ discipline: "run", planned_duration_minutes: 20, planned_distance_km: null, target_zone: "z3" }])).toEqual([
      { discipline: "run", planned_duration_minutes: 20, planned_distance_km: null, target_zone: "z3" },
    ])
  })

  it("drops entries with no discipline, and ignores garbage instead of throwing", () => {
    expect(parseExtraPlannedSegments("not an array" as never)).toEqual([])
    expect(parseExtraPlannedSegments([{ planned_duration_minutes: 20 }] as never)).toEqual([])
    expect(parseExtraPlannedSegments([null, 5, "x", { discipline: "unicycle" }] as never)).toEqual([])
  })

  it("treats a missing number or zone as null rather than crashing", () => {
    expect(parseExtraPlannedSegments([{ discipline: "run" }] as never)).toEqual([
      { discipline: "run", planned_duration_minutes: null, planned_distance_km: null, target_zone: null },
    ])
  })
})

describe("parseExtraCompletedSegments", () => {
  it("parses a valid extra completed leg", () => {
    expect(
      parseExtraCompletedSegments([
        { discipline: "run", actual_duration_minutes: 19, actual_distance_km: 5, avg_heart_rate: 155, avg_pace_or_power: "4:30 /km" },
      ])
    ).toEqual([{ discipline: "run", actual_duration_minutes: 19, actual_distance_km: 5, avg_heart_rate: 155, avg_pace_or_power: "4:30 /km" }])
  })

  it("drops malformed entries", () => {
    expect(parseExtraCompletedSegments([{ actual_duration_minutes: 19 }] as never)).toEqual([])
  })
})

describe("plannedLegs / completedLegs", () => {
  it("puts leg 1 (the row's own columns) first, for an ordinary workout", () => {
    expect(plannedLegs(planned())).toEqual([{ discipline: "bike", planned_duration_minutes: 60, planned_distance_km: 30, target_zone: "z2" }])
  })

  it("appends the extra legs after leg 1, in order", () => {
    const legs = plannedLegs(
      planned({
        extra_segments: [
          { discipline: "run", planned_duration_minutes: 20, planned_distance_km: null, target_zone: null },
          { discipline: "swim", planned_duration_minutes: null, planned_distance_km: 0.5, target_zone: "z1" },
        ],
      })
    )
    expect(legs.map((l) => l.discipline)).toEqual(["bike", "run", "swim"])
  })

  it("works the same way for completions", () => {
    const legs = completedLegs(
      completed({ extra_segments: [{ discipline: "run", actual_duration_minutes: 19, actual_distance_km: 5, avg_heart_rate: null, avg_pace_or_power: null }] })
    )
    expect(legs.map((l) => l.discipline)).toEqual(["bike", "run"])
    expect(legs[1].actual_duration_minutes).toBe(19)
  })
})

describe("isMultiSport / disciplinesOf", () => {
  it("is false for an ordinary workout, true once it has an extra leg", () => {
    expect(isMultiSport(planned())).toBe(false)
    expect(isMultiSport(planned({ extra_segments: [{ discipline: "run", planned_duration_minutes: 20, planned_distance_km: null, target_zone: null }] }))).toBe(true)
  })

  it("lists each distinct discipline once, in leg order", () => {
    const brick = planned({
      extra_segments: [
        { discipline: "run", planned_duration_minutes: 20, planned_distance_km: null, target_zone: null },
        { discipline: "run", planned_duration_minutes: 10, planned_distance_km: null, target_zone: null },
      ],
    })
    expect(disciplinesOf(brick)).toEqual(["bike", "run"])
  })

  it("works for a completed row too", () => {
    expect(disciplinesOf(completed({ extra_segments: [{ discipline: "run", actual_duration_minutes: 19, actual_distance_km: null, avg_heart_rate: null, avg_pace_or_power: null }] }))).toEqual([
      "bike",
      "run",
    ])
  })
})

describe("buildExtraSegments", () => {
  const leg = (over: Partial<PlannedSegment> = {}): PlannedSegment => ({
    discipline: "run",
    planned_duration_minutes: 20,
    planned_distance_km: null,
    target_zone: null,
    ...over,
  })

  it("is null with no extra legs", () => {
    expect(buildExtraSegments([])).toBeNull()
  })

  it("keeps legs that have a duration or a distance", () => {
    expect(buildExtraSegments([leg()])).toEqual([leg()])
  })

  it("drops a leg with neither (an incomplete row from a half-filled form)", () => {
    expect(buildExtraSegments([leg({ planned_duration_minutes: null })])).toBeNull()
    expect(buildExtraSegments([leg(), leg({ planned_duration_minutes: null })])).toEqual([leg()])
  })

  it("caps at the database's maximum of 4 extra legs", () => {
    const many = Array.from({ length: 6 }, () => leg())
    expect(buildExtraSegments(many)).toHaveLength(4)
  })
})
