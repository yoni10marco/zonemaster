import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { STRAVA_STATE_COOKIE, buildAuthorizeUrl, stravaConfig } from "@/lib/strava/client"

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/login`)

  const config = stravaConfig()
  if (!config) return NextResponse.redirect(`${origin}/settings?strava=not_configured`)

  // CSRF protection: the callback only proceeds if Strava echoes back the
  // value we stashed in this browser's cookie.
  const state = crypto.randomUUID()
  const response = NextResponse.redirect(
    buildAuthorizeUrl(config, `${origin}/api/strava/callback`, state)
  )
  response.cookies.set(STRAVA_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/api/strava",
  })
  return response
}
