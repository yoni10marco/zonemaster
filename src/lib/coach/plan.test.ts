import { describe, expect, it } from "vitest"

import { parsePlan } from "@/lib/coach/plan"

const WEEK = "2026-09-21" // a Monday

function plan(drafts: unknown[], summary = "Base week") {
  return parsePlan(JSON.stringify({ summary, drafts }), WEEK)
}

describe("parsePlan", () => {
  it("keeps valid drafts, sorted by date", () => {
    const result = plan([
      { date: "2026-09-24", discipline: "bike", durationMinutes: 90, zone: "z2", title: "Long ride" },
      { date: "2026-09-21", discipline: "run", durationMinutes: 45, title: "Easy run" },
    ])
    expect(result.summary).toBe("Base week")
    expect(result.drafts.map((d) => d.date)).toEqual(["2026-09-21", "2026-09-24"])
    expect(result.drafts[1].zone).toBe("z2")
  })

  it("drops drafts outside the requested week", () => {
    const result = plan([
      { date: "2026-09-20", discipline: "run", durationMinutes: 30, title: "Sunday before" },
      { date: "2026-09-28", discipline: "run", durationMinutes: 30, title: "Monday after" },
      { date: "2026-09-27", discipline: "run", durationMinutes: 30, title: "Last day" },
    ])
    expect(result.drafts.map((d) => d.title)).toEqual(["Last day"])
  })

  it("drops malformed drafts without failing the whole plan", () => {
    const result = plan([
      "not an object",
      { date: "24/09", discipline: "run", durationMinutes: 30 },
      { date: "2026-09-22", discipline: "yoga", durationMinutes: 30 },
      { date: "2026-09-22", discipline: "run", durationMinutes: 30, title: "ok" },
    ])
    expect(result.drafts).toHaveLength(1)
  })

  it("requires a duration or a distance, and rejects absurd durations", () => {
    const result = plan([
      { date: "2026-09-22", discipline: "bike", title: "nothing to do" },
      { date: "2026-09-22", discipline: "bike", durationMinutes: 9000, title: "too long" },
      { date: "2026-09-22", discipline: "bike", durationMinutes: 4, title: "too short" },
    ])
    expect(result.drafts).toEqual([])
  })

  it("drops distance for strength sessions and falls back to a label title", () => {
    const [draft] = plan([
      { date: "2026-09-22", discipline: "strength", durationMinutes: 40, distanceKm: 5, title: "  " },
    ]).drafts
    expect(draft.distanceKm).toBeNull()
    expect(draft.title).toBe("Strength")
  })

  it("keeps swim distances in km but understands meters", () => {
    const km = (d: number) => plan([{ date: "2026-09-22", discipline: "swim", distanceKm: d, title: "s" }]).drafts[0]?.distanceKm
    expect(km(1.5)).toBe(1.5)
    expect(km(0.75)).toBe(0.75)
    expect(km(1500)).toBe(1.5) // clearly meters
    expect(km(3800)).toBe(3.8)
    expect(km(25000)).toBeUndefined() // 25 km swim is not plausible
  })

  it("caps run/bike distances", () => {
    const km = (d: number) => plan([{ date: "2026-09-22", discipline: "run", distanceKm: d, title: "r" }]).drafts[0]?.distanceKm
    expect(km(10.04)).toBe(10)
    expect(km(500)).toBeUndefined()
  })

  it("never returns more than 14 drafts", () => {
    const many = Array.from({ length: 30 }, () => ({ date: "2026-09-22", discipline: "run", durationMinutes: 30, title: "r" }))
    expect(plan(many).drafts).toHaveLength(14)
  })

  it("throws a friendly error for output that is not a plan", () => {
    expect(() => parsePlan("not json", WEEK)).toThrow(/unexpected format/)
    expect(() => parsePlan(JSON.stringify({ summary: "x" }), WEEK)).toThrow(/unexpected format/)
  })
})
