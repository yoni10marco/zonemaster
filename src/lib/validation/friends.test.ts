import { describe, expect, it } from "vitest"

import {
  findFriendSchema,
  formatFriendCode,
  isValidFriendCode,
  isValidUsername,
  normalizeFriendCode,
  normalizeUsername,
  usernameSchema,
} from "@/lib/validation/friends"

describe("usernames", () => {
  it("accepts 3-20 lowercase letters, digits and underscores", () => {
    for (const ok of ["abc", "alex_92", "a_b_c", "x".repeat(20), "007"]) expect(isValidUsername(ok)).toBe(true)
  })

  it("rejects the wrong length, capitals, spaces and symbols", () => {
    for (const bad of ["ab", "x".repeat(21), "Alex", "al ex", "alex!", "alex-1", "émile", "", "a.b"]) {
      expect(isValidUsername(bad)).toBe(false)
    }
  })

  it("normalizes what a person typed", () => {
    expect(normalizeUsername("  AlEx_92 ")).toBe("alex_92")
  })

  it("the form schema reports a helpful message", () => {
    const result = usernameSchema.safeParse({ username: "Al" })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0].message).toMatch(/3–20 characters/)
    expect(usernameSchema.safeParse({ username: "alex_92" }).success).toBe(true)
  })
})

describe("friend IDs", () => {
  it("accepts 8 characters from the allowed alphabet, in any case, with dashes or spaces", () => {
    for (const ok of ["K7M29QXA", "k7m2-9qxa", " K7M2 9QXA ", "23456789", "ABCDEFGH"]) {
      expect(isValidFriendCode(ok)).toBe(true)
    }
  })

  it("rejects look-alike characters, wrong lengths and symbols", () => {
    for (const bad of ["K7M29QX0", "K7M29QXO", "K7M29QX1", "K7M29QXI", "K7M29QX", "K7M29QXAB", "", "K7M2_9QXA", "K7M2-9QX!"]) {
      expect(isValidFriendCode(bad)).toBe(false)
    }
  })

  it("normalizes and formats for display", () => {
    expect(normalizeFriendCode(" k7m2-9qxa ")).toBe("K7M29QXA")
    expect(formatFriendCode("K7M29QXA")).toBe("K7M2-9QXA")
    expect(formatFriendCode("k7m2 9qxa")).toBe("K7M2-9QXA")
    expect(formatFriendCode("short")).toBe("SHORT") // leaves anything that isn't a full ID alone
  })
})

describe("findFriendSchema", () => {
  it("needs both a username and a valid friend ID", () => {
    expect(findFriendSchema.safeParse({ username: "bobby", friendCode: "K7M2-9QXA" }).success).toBe(true)
    expect(findFriendSchema.safeParse({ username: "", friendCode: "K7M2-9QXA" }).success).toBe(false)
    const noCode = findFriendSchema.safeParse({ username: "bobby", friendCode: "nope" })
    expect(noCode.success).toBe(false)
    if (!noCode.success) expect(noCode.error.issues[0].message).toMatch(/8 letters and numbers/)
  })
})
