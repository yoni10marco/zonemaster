import { addDays, parseISO } from "date-fns"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { buildTrainingContext } from "@/lib/coach/context"
import { CoachNotConfiguredError, generateCoachText } from "@/lib/coach/gemini"
import { PLAN_RESPONSE_SCHEMA, parsePlan } from "@/lib/coach/plan"
import { COACH_HOURLY_LIMIT, coachSystemPrompt, isRateLimited } from "@/lib/coach/prompt"
import { createClient } from "@/lib/supabase/server"
import { toISODate } from "@/lib/utils/dates"

export const maxDuration = 60

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const bodySchema = z.object({
  weekStart: isoDate,
  today: isoDate,
  focus: z.string().trim().max(300).optional(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const body = bodySchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  const { weekStart, today, focus } = body.data

  if (Number.isNaN(parseISO(weekStart).getTime())) {
    return NextResponse.json({ error: "Invalid week" }, { status: 400 })
  }

  if (await isRateLimited(supabase, user.id)) {
    return NextResponse.json(
      { error: `You've reached the limit of ${COACH_HOURLY_LIMIT} coach requests per hour — try again later` },
      { status: 429 }
    )
  }

  // Recorded up front (and hidden from the chat view, which only shows user
  // and assistant rows) so failed generations still count toward the limit.
  await supabase.from("ai_chat_history").insert({
    user_id: user.id,
    role: "system",
    content: "plan_week requested",
    metadata: { kind: "plan_week", weekStart },
  })

  const weekEnd = toISODate(addDays(parseISO(weekStart), 6))

  try {
    const context = await buildTrainingContext(supabase, user.id, today)
    const text = await generateCoachText({
      system: coachSystemPrompt(context),
      turns: [
        {
          role: "user",
          text: [
            `Design a training week for me from ${weekStart} (Monday) to ${weekEnd} (Sunday).`,
            "Return a summary of the week's intent in at most two sentences (do not list the days; the drafts show that), plus the workouts as drafts.",
            "Rules: every date must fall inside that week; use only the disciplines swim, bike, run, strength or other;",
            "give each workout a durationMinutes and/or distanceKm (always kilometers, also for swims: a 1500 m swim is 1.5); use zones z1 to z5 for intensity; keep a sensible mix and at least one rest day;",
            "do not repeat sessions that are already planned in that week (see the athlete data), add complementary ones instead.",
            focus ? `The athlete's focus for this week: ${focus}` : "",
          ]
            .filter(Boolean)
            .join(" "),
        },
      ],
      responseSchema: PLAN_RESPONSE_SCHEMA,
      maxOutputTokens: 8192,
      temperature: 0.6,
    })

    return NextResponse.json(parsePlan(text, weekStart))
  } catch (err) {
    if (err instanceof CoachNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 })
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The coach is unavailable right now" },
      { status: 502 }
    )
  }
}
