import { describe, expect, it } from "vitest"

import { buildTrainingContext } from "@/lib/coach/context"

type Row = Record<string, unknown>

// A minimal stand-in for the Supabase client: every query returns the rows of its table.
function fakeSupabase(tables: Record<string, Row[]>, overview: Row[] | { error: string }) {
  const query = (rows: Row[]) => {
    const q: Record<string, unknown> = {}
    for (const method of ["select", "eq", "gte", "lte", "order"]) q[method] = () => q
    q.maybeSingle = async () => ({ data: rows[0] ?? null, error: null })
    q.then = (resolve: (v: unknown) => unknown) => resolve({ data: rows, error: null })
    return q
  }
  return {
    from: (table: string) => query(tables[table] ?? []),
    rpc: async () => ("error" in overview ? { data: null, error: { message: overview.error } } : { data: overview, error: null }),
  } as never
}

const planned = (id: number, date: string, sessionId: number | null, title = "Ride"): Row => ({
  id,
  target_date: date,
  discipline: "bike",
  planned_duration_minutes: 60,
  planned_distance_km: null,
  target_zone: "z2",
  title,
  shared_session_id: sessionId,
})

const member = (session_id: number, username: string, over: Row = {}): Row => ({
  session_id,
  user_id: username,
  username,
  status: "accepted",
  completed: false,
  is_me: false,
  is_creator: false,
  ...over,
})

const TODAY = "2026-09-19"

describe("buildTrainingContext: sessions shared with friends", () => {
  const tables = {
    profiles: [],
    completed_workouts: [
      { execution_date: "2026-09-15", discipline: "bike", actual_duration_minutes: 60, actual_distance_km: null, planned_workout_id: 1 },
    ],
    planned_workouts: [planned(1, "2026-09-15", 10, "Tuesday ride"), planned(2, "2026-09-22", 11, "Sunday ride"), planned(3, "2026-09-23", null, "Solo")],
  }
  const overview = [
    member(10, "amy", { is_me: true, completed: true }),
    member(10, "bobby", { completed: true }),
    member(11, "amy", { is_me: true }),
    member(11, "carl"),
    member(11, "dora", { status: "invited" }),
  ]

  it("marks upcoming sessions with the friends who joined, but not pending or declined ones", async () => {
    const text = await buildTrainingContext(fakeSupabase(tables, overview), "u1", TODAY)
    expect(text).toContain('("Sunday ride") [with carl]')
    expect(text).not.toContain("dora")
    // An ordinary workout has no marker.
    expect(text.split("\n").find((l) => l.includes('"Solo"'))).not.toContain("[with")
  })

  it("marks a completed workout done together and adds the summary line", async () => {
    const text = await buildTrainingContext(fakeSupabase(tables, overview), "u1", TODAY)
    expect(text).toContain("[planned] [with bobby (completed)]")
    expect(text).toContain("Sessions planned with friends over the last 28 days: 1, of which you and a friend both completed 1 (bobby 1).")
  })

  it("still works, without friend details, when the lookup fails", async () => {
    const text = await buildTrainingContext(fakeSupabase(tables, { error: "boom" }), "u1", TODAY)
    expect(text).toContain('"Sunday ride"')
    expect(text).not.toContain("[with")
    expect(text).not.toContain("Sessions planned with friends")
  })

  it("does not mention friends at all when nothing is shared", async () => {
    const text = await buildTrainingContext(fakeSupabase({ ...tables, planned_workouts: [planned(3, "2026-09-23", null, "Solo")] }, []), "u1", TODAY)
    expect(text).not.toContain("[with")
    expect(text).not.toContain("friends")
  })
})
