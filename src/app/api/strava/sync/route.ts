import { NextResponse } from "next/server"

import { MissingServiceRoleKeyError, createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { StravaAuthError } from "@/lib/strava/client"
import { StravaNotConnectedError, syncStravaForUser } from "@/lib/strava/sync"

export const maxDuration = 60

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  try {
    const result = await syncStravaForUser(createAdminClient(), user.id)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof StravaNotConnectedError) {
      return NextResponse.json({ error: "Strava is not connected", code: "not_connected" }, { status: 400 })
    }
    if (err instanceof StravaAuthError) {
      return NextResponse.json(
        { error: "Strava access expired — please reconnect", code: "reconnect" },
        { status: 401 }
      )
    }
    if (err instanceof MissingServiceRoleKeyError) {
      return NextResponse.json({ error: "Sync is not configured on the server yet" }, { status: 503 })
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    )
  }
}
