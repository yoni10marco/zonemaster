import { describe, expect, it } from "vitest"

import {
  describeOthers,
  summarizeSession,
  type SessionMember,
} from "@/lib/friends/shared-session"

function member(username: string, overrides: Partial<SessionMember> = {}): SessionMember {
  return {
    userId: `id-${username}`,
    username,
    status: "accepted",
    completed: false,
    isMe: false,
    isCreator: false,
    ...overrides,
  }
}

const me = (overrides: Partial<SessionMember> = {}) =>
  member("me", { isMe: true, isCreator: true, ...overrides })

describe("summarizeSession", () => {
  it("separates you from the others", () => {
    const s = summarizeSession([me(), member("bobby")])
    expect(s.others.map((m) => m.username)).toEqual(["bobby"])
    expect(s.imTheCreator).toBe(true)
  })

  it("orders others: accepted, then waiting, then declined, then by name", () => {
    const s = summarizeSession([
      me(),
      member("zed", { status: "declined" }),
      member("carl", { status: "invited" }),
      member("dora"),
      member("bobby"),
    ])
    expect(s.others.map((m) => m.username)).toEqual(["bobby", "dora", "carl", "zed"])
  })

  it("is done together only when you AND someone else who accepted have completed", () => {
    expect(summarizeSession([me({ completed: true }), member("bobby", { completed: true })]).doneTogether).toBe(true)
    expect(summarizeSession([me({ completed: false }), member("bobby", { completed: true })]).doneTogether).toBe(false)
    expect(summarizeSession([me({ completed: true }), member("bobby", { completed: false })]).doneTogether).toBe(false)
    expect(summarizeSession([me({ completed: true })]).doneTogether).toBe(false)
  })

  it("someone who declined never counts as done together", () => {
    const s = summarizeSession([me({ completed: true }), member("bobby", { status: "declined", completed: true })])
    expect(s.doneTogether).toBe(false)
  })

  it("knows when you did not start the session", () => {
    expect(summarizeSession([me({ isCreator: false }), member("bobby", { isCreator: true })]).imTheCreator).toBe(false)
  })

  it("copes with a session that has only you in it", () => {
    const s = summarizeSession([me()])
    expect(s.others).toEqual([])
    expect(describeOthers(s)).toBe("")
  })
})

describe("describeOthers", () => {
  it("marks completed, waiting and declined people", () => {
    const s = summarizeSession([
      me(),
      member("bobby", { completed: true }),
      member("carl", { status: "invited" }),
      member("dora", { status: "declined" }),
    ])
    expect(describeOthers(s)).toBe("bobby ✓, carl (waiting), dora (declined)")
  })

  it("shows at most three names and counts the rest", () => {
    const s = summarizeSession([me(), member("a1"), member("b2"), member("c3"), member("d4"), member("e5")])
    expect(describeOthers(s)).toBe("a1, b2, c3 +2 more")
  })

  it("has a fallback for someone without a username", () => {
    const s = summarizeSession([me(), member("x", { username: null })])
    expect(describeOthers(s)).toBe("someone")
  })
})
