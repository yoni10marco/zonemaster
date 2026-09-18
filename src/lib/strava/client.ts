const STRAVA_OAUTH = "https://www.strava.com/oauth"
const STRAVA_API = "https://www.strava.com/api/v3"

export const STRAVA_SCOPE = "activity:read_all"
export const STRAVA_STATE_COOKIE = "strava_oauth_state"

export class StravaAuthError extends Error {
  constructor(message = "Strava authorization is no longer valid") {
    super(message)
    this.name = "StravaAuthError"
  }
}

export type StravaConfig = { clientId: string; clientSecret: string }

export function stravaConfig(): StravaConfig | null {
  const clientId = process.env.STRAVA_CLIENT_ID
  const clientSecret = process.env.STRAVA_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}

export type StravaTokens = {
  access_token: string
  refresh_token: string
  /** Unix seconds. */
  expires_at: number
  athlete?: { id: number }
}

export type StravaActivity = {
  id: number
  name: string
  sport_type?: string
  type?: string
  /** Local wall-clock start, e.g. "2026-09-16T07:30:00Z" (the Z is nominal). */
  start_date_local: string
  moving_time: number
  /** Meters. */
  distance: number
  /** Meters per second. */
  average_speed?: number
  average_heartrate?: number
  average_watts?: number
}

export function buildAuthorizeUrl(config: StravaConfig, redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: STRAVA_SCOPE,
    state,
  })
  return `${STRAVA_OAUTH}/authorize?${params.toString()}`
}

async function requestTokens(body: Record<string, string>): Promise<StravaTokens> {
  const config = stravaConfig()
  if (!config) throw new Error("Strava is not configured")

  const res = await fetch(`${STRAVA_OAUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      ...body,
    }),
    signal: AbortSignal.timeout(15_000),
  })

  if (res.status === 400 || res.status === 401) throw new StravaAuthError()
  if (!res.ok) throw new Error(`Strava token request failed (${res.status})`)
  return (await res.json()) as StravaTokens
}

export function exchangeCode(code: string) {
  return requestTokens({ code, grant_type: "authorization_code" })
}

// Strava rotates the refresh token on every refresh — callers must persist
// the returned pair, the old refresh token stops working.
export function refreshTokens(refreshToken: string) {
  return requestTokens({ refresh_token: refreshToken, grant_type: "refresh_token" })
}

export async function fetchActivitiesPage(
  accessToken: string,
  afterEpochSeconds: number,
  page: number,
  perPage = 100
): Promise<StravaActivity[]> {
  const params = new URLSearchParams({
    after: String(afterEpochSeconds),
    page: String(page),
    per_page: String(perPage),
  })
  const res = await fetch(`${STRAVA_API}/athlete/activities?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(20_000),
  })

  if (res.status === 401) throw new StravaAuthError()
  if (res.status === 429) throw new Error("Strava rate limit reached — try again in a few minutes")
  if (!res.ok) throw new Error(`Strava activities request failed (${res.status})`)
  return (await res.json()) as StravaActivity[]
}
