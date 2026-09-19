// @vitest-environment jsdom
import { FitBaseType, FitEncoder } from "fit-file-parser"
import { describe, expect, it } from "vitest"

import { parseActivityFile } from "@/lib/import/parse-activity"
import { parseFit } from "@/lib/import/parse-fit"
import { parseGpx } from "@/lib/import/parse-gpx"
import { parseTcx } from "@/lib/import/parse-tcx"
import { buildRows, matchPlanned, type PlannedCandidate } from "@/lib/import/plan"
import { disciplineFromSport } from "@/lib/import/sport"
import { durationMinutes, externalActivityId, intensityText, roundKm } from "@/lib/import/summary"
import { ImportError, type ParsedActivity } from "@/lib/import/types"

describe("disciplineFromSport", () => {
  it("recognises the names watches and apps use", () => {
    expect(disciplineFromSport("running")).toBe("run")
    expect(disciplineFromSport("Trail Running")).toBe("run")
    expect(disciplineFromSport("Biking")).toBe("bike")
    expect(disciplineFromSport("cycling")).toBe("bike")
    expect(disciplineFromSport("swimming")).toBe("swim")
    expect(disciplineFromSport("training")).toBe("strength")
    expect(disciplineFromSport("9")).toBe("run")
    expect(disciplineFromSport("hiking")).toBe("other")
    expect(disciplineFromSport(null)).toBe("other")
  })
})

describe("summary helpers", () => {
  it("rounds duration to whole minutes, at least one", () => {
    expect(durationMinutes(3600)).toBe(60)
    expect(durationMinutes(89)).toBe(1)
    expect(durationMinutes(10)).toBe(1)
  })

  it("keeps two decimals and drops empty distances", () => {
    expect(roundKm(10.2549)).toBe(10.25)
    expect(roundKm(0)).toBeNull()
    expect(roundKm(null)).toBeNull()
  })

  it("gives the same id to the same activity, whatever the file format", () => {
    const start = new Date("2026-09-19T06:30:00Z")
    expect(externalActivityId({ startTime: start, durationSeconds: 3600.2 })).toBe(
      externalActivityId({ startTime: new Date(start), durationSeconds: 3599.8 })
    )
    expect(externalActivityId({ startTime: start, durationSeconds: 3600 })).not.toBe(
      externalActivityId({ startTime: start, durationSeconds: 1800 })
    )
  })

  it("describes intensity per discipline", () => {
    expect(intensityText({ discipline: "run", durationSeconds: 3000, distanceKm: 10, avgPowerWatts: null })).toBe("5:00 /km")
    expect(intensityText({ discipline: "swim", durationSeconds: 1800, distanceKm: 1.5, avgPowerWatts: null })).toBe("2:00 /100m")
    expect(intensityText({ discipline: "bike", durationSeconds: 3600, distanceKm: 30, avgPowerWatts: 210 })).toBe("210 W")
    expect(intensityText({ discipline: "bike", durationSeconds: 3600, distanceKm: 30, avgPowerWatts: null })).toBe("30.0 km/h")
    expect(intensityText({ discipline: "strength", durationSeconds: 3600, distanceKm: null, avgPowerWatts: null })).toBeNull()
    expect(intensityText({ discipline: "run", durationSeconds: 3000, distanceKm: null, avgPowerWatts: null })).toBeNull()
  })
})

const TCX = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities>
    <Activity Sport="Running">
      <Id>2026-09-19T06:30:00Z</Id>
      <Lap StartTime="2026-09-19T06:30:00Z">
        <TotalTimeSeconds>1800</TotalTimeSeconds>
        <DistanceMeters>5000</DistanceMeters>
        <AverageHeartRateBpm><Value>140</Value></AverageHeartRateBpm>
      </Lap>
      <Lap StartTime="2026-09-19T07:00:00Z">
        <TotalTimeSeconds>1800</TotalTimeSeconds>
        <DistanceMeters>5500</DistanceMeters>
        <AverageHeartRateBpm><Value>160</Value></AverageHeartRateBpm>
      </Lap>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`

describe("parseTcx", () => {
  it("adds up the laps and weights the heart rate by time", () => {
    const [a] = parseTcx(TCX, "run.tcx")
    expect(a.discipline).toBe("run")
    expect(a.startTime.toISOString()).toBe("2026-09-19T06:30:00.000Z")
    expect(a.durationSeconds).toBe(3600)
    expect(a.distanceKm).toBe(10.5)
    expect(a.avgHeartRate).toBe(150)
  })

  it("handles laps without heart rate or distance", () => {
    const xml = `<TrainingCenterDatabase><Activities><Activity Sport="Other"><Id>2026-09-19T06:30:00Z</Id>
      <Lap StartTime="2026-09-19T06:30:00Z"><TotalTimeSeconds>2400</TotalTimeSeconds></Lap></Activity></Activities></TrainingCenterDatabase>`
    const [a] = parseTcx(xml, "gym.tcx")
    expect(a).toMatchObject({ discipline: "other", durationSeconds: 2400, distanceKm: null, avgHeartRate: null })
  })

  it("rejects broken XML", () => {
    expect(() => parseTcx("<TrainingCenter", "bad.tcx")).toThrow(ImportError)
  })
})

const GPX = `<?xml version="1.0"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <trk><type>cycling</type><trkseg>
    <trkpt lat="52.0" lon="4.0"><time>2026-09-19T08:00:00Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>120</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions></trkpt>
    <trkpt lat="52.0" lon="4.1"><time>2026-09-19T08:10:00Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>140</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions></trkpt>
  </trkseg></trk>
</gpx>`

describe("parseGpx", () => {
  it("measures the track and reads heart rate from the Garmin extension", () => {
    const [a] = parseGpx(GPX, "ride.gpx")
    expect(a.discipline).toBe("bike")
    expect(a.startTime.toISOString()).toBe("2026-09-19T08:00:00.000Z")
    expect(a.durationSeconds).toBe(600)
    // 0.1 degrees of longitude at latitude 52 is about 6.85 km.
    expect(a.distanceKm).toBeGreaterThan(6.7)
    expect(a.distanceKm).toBeLessThan(7)
    expect(a.avgHeartRate).toBe(130)
  })

  it("skips tracks without timestamps", () => {
    const xml = `<gpx><trk><trkseg><trkpt lat="1" lon="1"/><trkpt lat="1" lon="2"/></trkseg></trk></gpx>`
    expect(parseGpx(xml, "x.gpx")).toEqual([])
  })
})

function fitFile(sessions: { start: string; sport: number; timer: number; km: number; hr?: number; power?: number }[]): ArrayBuffer {
  const enc = new FitEncoder()
  const field = (number: number, size: number, baseType: number, value: number) => ({ number, size, baseType, value })
  for (const s of sessions) {
    const start = new Date(s.start)
    enc.writeMessage(18, [
      field(253, 4, FitBaseType.Uint32, FitEncoder.toFitTimestamp(new Date(start.getTime() + s.timer * 1000))),
      field(2, 4, FitBaseType.Uint32, FitEncoder.toFitTimestamp(start)),
      field(5, 1, FitBaseType.Enum, s.sport),
      field(7, 4, FitBaseType.Uint32, (s.timer + 60) * 1000),
      field(8, 4, FitBaseType.Uint32, s.timer * 1000),
      field(9, 4, FitBaseType.Uint32, Math.round(s.km * 1000 * 100)),
      field(16, 1, FitBaseType.Uint8, s.hr ?? 255),
      field(20, 2, FitBaseType.Uint16, s.power ?? 65535),
    ])
  }
  const bytes = enc.close()
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

describe("parseFit", () => {
  it("reads the session summary of a run (moving time, km, heart rate)", async () => {
    const [a] = await parseFit(fitFile([{ start: "2026-09-19T06:30:00Z", sport: 1, timer: 3600, km: 10.25, hr: 152 }]), "run.fit")
    expect(a.discipline).toBe("run")
    expect(a.startTime.toISOString()).toBe("2026-09-19T06:30:00.000Z")
    expect(a.durationSeconds).toBe(3600) // moving time, not the 3660 s on the clock
    expect(a.distanceKm).toBe(10.25)
    expect(a.avgHeartRate).toBe(152)
    expect(a.avgPowerWatts).toBeNull()
  })

  it("gives a triathlon file one activity per sport", async () => {
    const list = await parseFit(
      fitFile([
        { start: "2026-09-19T06:00:00Z", sport: 5, timer: 1800, km: 1.5 },
        { start: "2026-09-19T06:40:00Z", sport: 2, timer: 3600, km: 30, power: 200 },
        { start: "2026-09-19T07:50:00Z", sport: 1, timer: 1200, km: 4 },
      ]),
      "tri.fit"
    )
    expect(list.map((a) => a.discipline)).toEqual(["swim", "bike", "run"])
    expect(list[1].avgPowerWatts).toBe(200)
  })

  it("explains when a file is not a FIT file", async () => {
    await expect(parseFit(new TextEncoder().encode("not a fit file at all").buffer as ArrayBuffer, "junk.fit")).rejects.toThrow(ImportError)
  })
})

describe("parseActivityFile", () => {
  it("picks the parser by extension", async () => {
    const list = await parseActivityFile(new File([TCX], "morning.TCX"))
    expect(list).toHaveLength(1)
    expect(list[0].fileName).toBe("morning.TCX")
  })

  it("refuses other file types and empty activity files with a readable message", async () => {
    await expect(parseActivityFile(new File(["x"], "notes.pdf"))).rejects.toThrow(/only .fit, .tcx and .gpx/)
    await expect(parseActivityFile(new File(["<gpx></gpx>"], "empty.gpx"))).rejects.toThrow(/No activity found in empty.gpx/)
  })
})

describe("matching activities to the plan", () => {
  const planned: PlannedCandidate[] = [
    { id: 1, target_date: "2026-09-19", title: "Easy run", discipline: "run", planned_duration_minutes: 30, target_zone: null },
    { id: 2, target_date: "2026-09-19", title: "Long run", discipline: "run", planned_duration_minutes: 90, target_zone: null },
    { id: 3, target_date: "2026-09-19", title: "Swim", discipline: "swim", planned_duration_minutes: 45, target_zone: null },
    { id: 4, target_date: "2026-09-20", title: "Run tomorrow", discipline: "run", planned_duration_minutes: 60, target_zone: null },
  ]

  it("takes the same-day, same-discipline workout closest in duration", () => {
    expect(matchPlanned("2026-09-19", "run", 80, planned, new Set())).toBe(2)
    expect(matchPlanned("2026-09-19", "run", 35, planned, new Set())).toBe(1)
  })

  it("never matches another day, another discipline, or a workout that is already done", () => {
    expect(matchPlanned("2026-09-21", "run", 60, planned, new Set())).toBeNull()
    expect(matchPlanned("2026-09-19", "bike", 60, planned, new Set())).toBeNull()
    expect(matchPlanned("2026-09-19", "swim", 45, planned, new Set([3]))).toBeNull()
  })

  const activity = (start: string, seconds: number, over: Partial<ParsedActivity> = {}): ParsedActivity => ({
    fileName: "a.fit",
    startTime: new Date(start),
    discipline: "run",
    durationSeconds: seconds,
    distanceKm: 5,
    avgHeartRate: null,
    avgPowerWatts: null,
    ...over,
  })

  it("lets each planned workout be claimed by only one activity", () => {
    const rows = buildRows(
      [activity("2026-09-19T15:00:00", 5400), activity("2026-09-19T08:00:00", 1800)],
      {},
      planned,
      new Set(),
      new Set()
    )
    expect(rows.map((r) => r.plannedId)).toEqual([1, 2]) // ordered by start time; 30 min -> Easy run, 90 min -> Long run
  })

  it("does not claim a third workout when there is none left, and honours a changed discipline", () => {
    const rows = buildRows(
      [activity("2026-09-19T07:00:00", 1800), activity("2026-09-19T08:00:00", 1800), activity("2026-09-19T09:00:00", 1800)],
      { "a.fit#2": "swim" },
      planned,
      new Set(),
      new Set()
    )
    expect(rows.map((r) => r.plannedId)).toEqual([1, 2, 3])
    const noneLeft = buildRows(
      [activity("2026-09-19T07:00:00", 1800), activity("2026-09-19T08:00:00", 1800), activity("2026-09-19T09:00:00", 1800)],
      {},
      planned,
      new Set(),
      new Set()
    )
    expect(noneLeft.map((r) => r.plannedId)).toEqual([1, 2, null])
  })

  it("marks activities imported before, or repeated in the same batch, as duplicates", () => {
    const first = activity("2026-09-19T07:00:00Z", 1800)
    const rows = buildRows([first, { ...first, fileName: "copy.tcx" }], {}, planned, new Set(), new Set())
    expect(rows.map((r) => r.duplicate)).toEqual([false, true])
    expect(rows[1].plannedId).toBeNull()
    const again = buildRows([first], {}, planned, new Set(), new Set([externalActivityId(first)]))
    expect(again[0].duplicate).toBe(true)
  })
})
