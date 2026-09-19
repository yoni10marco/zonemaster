import { describe, expect, it } from "vitest"

import { displayValueToKm, distanceUnit, formatDistance, kmToDisplayValue } from "@/lib/utils/distance"

describe("distance units", () => {
  it("uses meters for swims and kilometers for everything else", () => {
    expect(distanceUnit("swim")).toBe("m")
    for (const d of ["bike", "run", "strength", "other"] as const) expect(distanceUnit(d)).toBe("km")
  })

  it("formats swims in meters, without float noise", () => {
    expect(formatDistance(1.5, "swim")).toBe("1500 m")
    expect(formatDistance(0.05, "swim")).toBe("50 m") // 0.05 * 1000 = 50.00000000000001
    expect(formatDistance(0.75, "swim")).toBe("750 m")
  })

  it("formats other disciplines in kilometers", () => {
    expect(formatDistance(8.2, "run")).toBe("8.2 km")
    expect(formatDistance(35, "bike")).toBe("35 km")
    expect(formatDistance(10.456, "run")).toBe("10.46 km")
  })

  it("converts between stored km and the typed value", () => {
    expect(kmToDisplayValue(2.4, "swim")).toBe(2400)
    expect(kmToDisplayValue(2.4, "bike")).toBe(2.4)
    expect(displayValueToKm(1500, "swim")).toBe(1.5)
    expect(displayValueToKm(1500.4, "swim")).toBe(1.5)
    expect(displayValueToKm(8.2, "run")).toBe(8.2)
  })

  it("round-trips common pool distances exactly", () => {
    for (const m of [25, 50, 400, 750, 1500, 3800]) {
      expect(kmToDisplayValue(displayValueToKm(m, "swim"), "swim")).toBe(m)
    }
  })
})
