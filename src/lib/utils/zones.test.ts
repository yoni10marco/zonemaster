import { describe, expect, it } from "vitest"

import { computeZoneRanges, formatZoneRange } from "@/lib/utils/zones"

describe("computeZoneRanges", () => {
  it("uses percentages of max heart rate when there is no resting rate", () => {
    const z = computeZoneRanges(190)!
    expect(z.z1).toEqual({ min: 95, max: 114 })
    expect(z.z2).toEqual({ min: 114, max: 133 })
    expect(z.z5).toEqual({ min: 171, max: 190 })
  })

  it("uses heart-rate reserve (Karvonen) when a resting rate is given", () => {
    const z = computeZoneRanges(190, 50)! // reserve = 140
    expect(z.z1).toEqual({ min: 120, max: 134 })
    expect(z.z3).toEqual({ min: 148, max: 162 })
    expect(z.z5).toEqual({ min: 176, max: 190 })
  })

  it("keeps zones contiguous and increasing", () => {
    const z = computeZoneRanges(178, 58)!
    const order = [z.z1, z.z2, z.z3, z.z4, z.z5]
    order.forEach((r, i) => {
      expect(r.max).toBeGreaterThan(r.min)
      if (i > 0) expect(r.min).toBe(order[i - 1].max)
    })
    expect(z.z5.max).toBe(178)
  })

  it("ignores an unusable resting rate instead of producing nonsense", () => {
    expect(computeZoneRanges(190, 200)).toEqual(computeZoneRanges(190))
    expect(computeZoneRanges(190, 10)).toEqual(computeZoneRanges(190))
  })

  it("returns null without a plausible max heart rate", () => {
    expect(computeZoneRanges(null)).toBeNull()
    expect(computeZoneRanges(undefined)).toBeNull()
    expect(computeZoneRanges(60)).toBeNull()
    expect(computeZoneRanges(400)).toBeNull()
  })

  it("formats a range for display", () => {
    expect(formatZoneRange({ min: 114, max: 133 })).toBe("114–133 bpm")
  })
})
