import { NextResponse, type NextRequest } from "next/server"

import { MissingServiceRoleKeyError, createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { STRAVA_STATE_COOKIE, exchangeCode, stravaConfig } from "@/lib/strava/client"
import { syncStravaForUser } from "@/lib/strava/sync"

export const maxDuration = 60

function redirectToSettings(origin: string, status: string) {
  const response = NextResponse.redirect(`${origin}/settings?strava=${status}`)
  response.cookies.delete({ name: STRAVA_STATE_COOKIE, path: "/api/strava" })
  return response
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/login`)

  if (searchParams.get("error")) return redirectToSettings(origin, "denied")

  const state = searchParams.get("state")
  const expectedState = request.cookies.get(STRAVA_STATE_COOKIE)?.value
  const code = searchParams.get("code")
  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectToSettings(origin, "invalid_state")
  }

  // Strava lets the user untick scopes on its consent screen; without
  // activity access there is nothing to sync.
  const grantedScope = searchParams.get("scope") ?? ""
  if (!grantedScope.split(",").some((s) => s.startsWith("activity:read"))) {
    return redirectToSettings(origin, "missing_scope")
  }

  if (!stravaConfig()) return redirectToSettings(origin, "not_configured")

  try {
    const tokens = await exchangeCode(code)
    const admin = createAdminClient()

    const { error } = await admin.from("integrations").upsert(
      {
        user_id: user.id,
        provider: "strava",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(tokens.expires_at * 1000).toISOString(),
        athlete_id: tokens.athlete ? String(tokens.athlete.id) : null,
        connected_at: new Date().toISOString(),
        // Reset so the first sync after (re)connecting does the full lookback.
        last_synced_at: null,
      },
      { onConflict: "user_id,provider" }
    )
    if (error) throw new Error(error.message)

    // Best effort: the connection is saved either way, and "Sync now" or the
    // daily job will pick up anything this misses.
    try {
      await syncStravaForUser(admin, user.id)
    } catch {
      // ignored on purpose
    }

    return redirectToSettings(origin, "connected")
  } catch (err) {
    if (err instanceof MissingServiceRoleKeyError) return redirectToSettings(origin, "not_configured")
    return redirectToSettings(origin, "failed")
  }
}
