import { z } from "zod"

// Must match the database (migration 0009): the username is 3-20 lowercase
// letters, digits or underscores; the friend ID is 8 characters from an
// alphabet without look-alikes (no 0, O, 1 or I).
const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/
const FRIEND_CODE_PATTERN = /^[2-9A-HJ-NP-Z]{8}$/

export const USERNAME_HELP = "3–20 characters: lowercase letters, numbers or _"
export const FRIEND_CODE_HELP = "A friend ID has 8 letters and numbers, like K7M2-9QXA"

/** What a person typed, made comparable: trimmed and lowercase. */
export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase()
}

export function isValidUsername(input: string): boolean {
  return USERNAME_PATTERN.test(input)
}

/** Ignores spaces, dashes and case, so "k7m2 9qxa" and "K7M2-9QXA" are the same ID. */
export function normalizeFriendCode(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase()
}

export function isValidFriendCode(input: string): boolean {
  return FRIEND_CODE_PATTERN.test(normalizeFriendCode(input))
}

/** "K7M29QXA" -> "K7M2-9QXA": easier to read aloud and to type. */
export function formatFriendCode(code: string): string {
  const clean = normalizeFriendCode(code)
  return clean.length === 8 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean
}

export const usernameSchema = z.object({
  username: z.string().regex(USERNAME_PATTERN, USERNAME_HELP),
})
export type UsernameInput = z.infer<typeof usernameSchema>

export const findFriendSchema = z.object({
  username: z.string().min(1, "Enter their username"),
  friendCode: z.string().refine(isValidFriendCode, FRIEND_CODE_HELP),
})
export type FindFriendInput = z.infer<typeof findFriendSchema>
