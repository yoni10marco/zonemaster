import { timingSafeEqual } from "node:crypto"

import { NextResponse, type NextRequest } from "next/server"

import { MissingServiceRoleKeyError, createAdminClient } from "@/lib/supabase/admin"
import { syncStravaForUser } from "@/lib/strava/sync"

export const maxDuration = 300

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(request.headers.get("authorization") ?? "")
  return expected.length === received.length && timingSafeEqual(expected, received)
}

// Invoked by Vercel Cron (see vercel.json), which sends
// `Authorization: Bearer $CRON_SECRET`. Refuses to run at all if the secret is
// unset, so the endpoint is never publicly triggerable.
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const admin = createAdminClient()
    const { data: integrations, error } = await admin
      .from("integrations")
      .select("user_id")
      .eq("provider", "strava")
    if (error) throw new Error(error.message)

    let imported = 0
    let failed = 0
    // Sequential on purpose: Strava's rate limit is per app, not per user.
    for (const { user_id } of integrations) {
      try {
        const result = await syncStravaForUser(admin, user_id)
        imported += result.imported
      } catch {
        failed++
      }
    }

    return NextResponse.json({ users: integrations.length, imported, failed })
  } catch (err) {
    if (err instanceof MissingServiceRoleKeyError) {
      return NextResponse.json({ error: "Service role key not configured" }, { status: 503 })
    }
    return NextResponse.json({ error: "Cron sync failed" }, { status: 500 })
  }
}
