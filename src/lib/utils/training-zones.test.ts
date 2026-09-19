import { describe, expect, it } from "vitest"

import {
  buildZoneGuide,
  describeZonesForCoach,
  formatPace,
  parsePace,
  paceRanges,
  powerRanges,
  zoneOfActivity,
  zoneTable,
  zoneTarget,
} from "@/lib/utils/training-zones"

const ALL = { max_heart_rate: 190, resting_heart_rate: null, ftp_watts: 250, run_threshold_pace_sec: 300, swim_css_sec: 105 }
const guide = buildZoneGuide(ALL)

describe("buildZoneGuide", () => {
  it("keeps only usable numbers", () => {
    const g = buildZoneGuide({ ftp_watts: 5000, run_threshold_pace_sec: 20, swim_css_sec: 105, max_heart_rate: null })
    expect(g).toEqual({ hr: null, ftpWatts: null, runThresholdPaceSec: null, swimCssSec: 105 })
  })

  it("copes with no profile at all", () => {
    expect(buildZoneGuide(null)).toEqual({ hr: null, ftpWatts: null, runThresholdPaceSec: null, swimCssSec: null })
  })
})

describe("pace text", () => {
  it("formats seconds as minutes:seconds", () => {
    expect(formatPace(312)).toBe("5:12")
    expect(formatPace(65)).toBe("1:05")
  })

  it("parses minutes:seconds and rejects everything else", () => {
    expect(parsePace("5:12")).toBe(312)
    expect(parsePace(" 1:45 ")).toBe(105)
    expect(parsePace("5:75")).toBeNull()
    expect(parsePace("512")).toBeNull()
    expect(parsePace("5.12")).toBeNull()
    expect(parsePace("")).toBeNull()
  })
})

describe("zone ranges", () => {
  it("power zones are the Coggan percentages of FTP, in watts", () => {
    const r = powerRanges(250)
    expect(r.z1).toEqual({ from: null, to: 138 })
    expect(r.z2).toEqual({ from: 138, to: 188 })
    expect(r.z3).toEqual({ from: 188, to: 225 })
    expect(r.z4).toEqual({ from: 225, to: 263 })
    expect(r.z5).toEqual({ from: 263, to: null })
  })

  it("pace zones get slower towards Z1 and touch each other", () => {
    const r = paceRanges(300, { z1: [129, null], z2: [114, 129], z3: [106, 114], z4: [99, 106], z5: [null, 99] })
    expect(r.z5.to).toBe(r.z4.from)
    expect(r.z4.to).toBe(r.z3.from)
    expect(r.z3.to).toBe(r.z2.from)
    expect(r.z2.to).toBe(r.z1.from)
    expect(r.z4).toEqual({ from: 297, to: 318 })
  })
})

describe("zoneTarget", () => {
  it("uses power for the bike, pace for run and swim, when those are set", () => {
    expect(zoneTarget(guide, "bike", "z2")).toBe("138–188 W")
    expect(zoneTarget(guide, "bike", "z1")).toBe("under 138 W")
    expect(zoneTarget(guide, "bike", "z5")).toBe("over 263 W")
    expect(zoneTarget(guide, "run", "z2")).toBe("5:42–6:27 /km")
    expect(zoneTarget(guide, "run", "z1")).toBe("slower than 6:27 /km")
    expect(zoneTarget(guide, "run", "z5")).toBe("faster than 4:57 /km")
    expect(zoneTarget(guide, "swim", "z2")).toBe("1:53–2:04 /100m")
  })

  it("falls back to heart rate for a sport without its own number, and for strength", () => {
    const hrOnly = buildZoneGuide({ max_heart_rate: 190 })
    expect(zoneTarget(hrOnly, "bike", "z2")).toBe("114–133 bpm")
    expect(zoneTarget(hrOnly, "run", "z2")).toBe("114–133 bpm")
    const bikeOnly = buildZoneGuide({ max_heart_rate: 190, ftp_watts: 250 })
    expect(zoneTarget(bikeOnly, "run", "z2")).toBe("114–133 bpm")
    expect(zoneTarget(guide, "strength", "z2")).toBe("114–133 bpm")
  })

  it("is null when nothing is known", () => {
    expect(zoneTarget(buildZoneGuide({ ftp_watts: 250 }), "run", "z2")).toBeNull()
    expect(zoneTarget(null, "bike", "z2")).toBeNull()
  })
})

describe("zoneOfActivity", () => {
  const effort = (over: Partial<Parameters<typeof zoneOfActivity>[2]> = {}) => ({
    avgPowerWatts: null,
    avgHeartRate: null,
    durationSeconds: 3600,
    distanceKm: null,
    ...over,
  })

  it("places a ride by average power", () => {
    expect(zoneOfActivity(guide, "bike", effort({ avgPowerWatts: 160 }))).toEqual({ zone: "z2", measure: "power" })
    expect(zoneOfActivity(guide, "bike", effort({ avgPowerWatts: 240 }))).toEqual({ zone: "z4", measure: "power" })
    expect(zoneOfActivity(guide, "bike", effort({ avgPowerWatts: 400 }))).toEqual({ zone: "z5", measure: "power" })
    expect(zoneOfActivity(guide, "bike", effort({ avgPowerWatts: 100 }))).toEqual({ zone: "z1", measure: "power" })
  })

  it("places a run and a swim by average pace", () => {
    // 10 km in 60 min = 6:00 /km -> Z2 (5:42-6:27)
    expect(zoneOfActivity(guide, "run", effort({ distanceKm: 10 }))).toEqual({ zone: "z2", measure: "pace" })
    // 10 km in 45 min = 4:30 /km -> faster than 4:57 -> Z5
    expect(zoneOfActivity(guide, "run", effort({ distanceKm: 10, durationSeconds: 2700 }))).toEqual({ zone: "z5", measure: "pace" })
    // 1.5 km in 30 min = 2:00 /100m -> Z2 (1:53-2:04)
    expect(zoneOfActivity(guide, "swim", effort({ distanceKm: 1.5, durationSeconds: 1800 }))).toEqual({ zone: "z2", measure: "pace" })
  })

  it("uses heart rate when the sport's own number is missing", () => {
    const g = buildZoneGuide({ max_heart_rate: 190 })
    expect(zoneOfActivity(g, "run", effort({ distanceKm: 10, avgHeartRate: 120 }))).toEqual({ zone: "z2", measure: "heart rate" })
    expect(zoneOfActivity(g, "run", effort({ avgHeartRate: 185 }))).toEqual({ zone: "z5", measure: "heart rate" })
    // A ride with power zones set but no power reading in the file still gets a heart-rate answer.
    expect(zoneOfActivity(guide, "bike", effort({ avgHeartRate: 140 }))).toEqual({ zone: "z3", measure: "heart rate" })
  })

  it("says nothing when there is nothing to compare", () => {
    expect(zoneOfActivity(guide, "strength", effort())).toBeNull()
    expect(zoneOfActivity(buildZoneGuide(null), "run", effort({ distanceKm: 10 }))).toBeNull()
    expect(zoneOfActivity(null, "run", effort({ distanceKm: 10 }))).toBeNull()
  })
})

describe("for the coach and the settings preview", () => {
  it("describes every measure that is set up, one line each", () => {
    const lines = describeZonesForCoach(guide)
    expect(lines).toHaveLength(4)
    expect(lines[0]).toMatch(/^Heart-rate zones: Z1 /)
    expect(lines[1]).toContain("Bike power zones (FTP 250 W): Z1 under 138 W, Z2 138–188 W")
    expect(lines[2]).toContain("Run pace zones (threshold 5:00 /km): Z1 slower than 6:27 /km")
    expect(lines[3]).toContain("Swim pace zones (CSS 1:45 /100m)")
  })

  it("has no lines for an athlete with nothing set", () => {
    expect(describeZonesForCoach(buildZoneGuide(null))).toEqual([])
  })

  it("lists a sport's five zones, and nothing when its number is missing", () => {
    expect(zoneTable(guide, "bike")).toHaveLength(5)
    expect(zoneTable(guide, "bike")[1]).toEqual({ zone: "z2", text: "138–188 W" })
    expect(zoneTable(buildZoneGuide({ max_heart_rate: 190 }), "run")).toEqual([])
  })
})
