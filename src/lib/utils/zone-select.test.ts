import { describe, expect, it } from "vitest"

import { NO_ZONE_VALUE, zoneFromSelectValue, zoneSelectValue } from "@/lib/utils/zone-select"

describe("zoneSelectValue", () => {
  it("passes a real zone through unchanged", () => {
    expect(zoneSelectValue("z2")).toBe("z2")
  })

  it("maps nothing picked (empty string, null, undefined) to the 'no zone' sentinel", () => {
    expect(zoneSelectValue("")).toBe(NO_ZONE_VALUE)
    expect(zoneSelectValue(null)).toBe(NO_ZONE_VALUE)
    expect(zoneSelectValue(undefined)).toBe(NO_ZONE_VALUE)
  })
})

describe("zoneFromSelectValue", () => {
  it("passes a real zone through unchanged", () => {
    expect(zoneFromSelectValue("z4")).toBe("z4")
  })

  it("maps the 'no zone' sentinel back to an empty string — the bug this fixes: without this item, there was no way back to 'no zone' once any zone had been picked", () => {
    expect(zoneFromSelectValue(NO_ZONE_VALUE)).toBe("")
  })

  it("round-trips through both directions", () => {
    for (const z of ["z1", "z2", "z3", "z4", "z5"] as const) {
      expect(zoneFromSelectValue(zoneSelectValue(z))).toBe(z)
    }
    expect(zoneFromSelectValue(zoneSelectValue(""))).toBe("")
  })
})
