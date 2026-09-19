import { describe, expect, it } from "vitest"

import { profileSchema } from "@/lib/validation/profile"

const base = {
  fitnessLevel: "intermediate",
  primaryDiscipline: "run",
  targetRaceDate: "",
  targetRaceDistance: "",
  maxHeartRate: "",
  restingHeartRate: "",
  ftpWatts: "",
  runThresholdPace: "",
  swimCss: "",
} as const

const check = (over: Partial<Record<keyof typeof base, string>>) => profileSchema.safeParse({ ...base, ...over })

describe("profileSchema: power and pace", () => {
  it("accepts everything empty, and sensible values", () => {
    expect(check({}).success).toBe(true)
    expect(check({ ftpWatts: "250", runThresholdPace: "5:00", swimCss: "1:45" }).success).toBe(true)
  })

  it("rejects an FTP outside 50-600 or not a whole number", () => {
    expect(check({ ftpWatts: "30" }).success).toBe(false)
    expect(check({ ftpWatts: "900" }).success).toBe(false)
    expect(check({ ftpWatts: "250.5" }).success).toBe(false)
  })

  it("rejects paces that are not minutes:seconds or are out of range", () => {
    expect(check({ runThresholdPace: "500" }).success).toBe(false)
    expect(check({ runThresholdPace: "5:75" }).success).toBe(false)
    expect(check({ runThresholdPace: "1:00" }).success).toBe(false) // faster than a person can run
    expect(check({ runThresholdPace: "12:00" }).success).toBe(false)
    expect(check({ swimCss: "0:30" }).success).toBe(false)
    expect(check({ swimCss: "6:00" }).success).toBe(false)
  })

  it("tells the athlete what format to use", () => {
    const result = check({ runThresholdPace: "fast" })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0].message).toMatch(/minutes:seconds/)
  })
})
