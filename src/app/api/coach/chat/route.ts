import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { buildTrainingContext } from "@/lib/coach/context"
import { CoachNotConfiguredError, generateCoachText, type GeminiTurn } from "@/lib/coach/gemini"
import { COACH_HOURLY_LIMIT, coachSystemPrompt, isRateLimited } from "@/lib/coach/prompt"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 60

const HISTORY_TURNS = 20

const bodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const body = bodySchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: "Invalid message" }, { status: 400 })
  const { message, today } = body.data

  if (await isRateLimited(supabase, user.id)) {
    return NextResponse.json(
      { error: `You've reached the limit of ${COACH_HOURLY_LIMIT} coach requests per hour — try again later` },
      { status: 429 }
    )
  }

  try {
    const [context, historyRes] = await Promise.all([
      buildTrainingContext(supabase, user.id, today),
      supabase
        .from("ai_chat_history")
        .select("role, content")
        .in("role", ["user", "assistant"])
        .order("created_at", { ascending: false })
        .limit(HISTORY_TURNS),
    ])

    const history: GeminiTurn[] = (historyRes.data ?? [])
      .reverse()
      .map((row) => ({ role: row.role === "assistant" ? "model" : "user", text: row.content }))
    // Gemini expects the conversation to open with a user turn.
    while (history.length > 0 && history[0].role === "model") history.shift()

    const reply = await generateCoachText({
      system: coachSystemPrompt(context),
      turns: [...history, { role: "user", text: message }],
    })

    const { error } = await supabase.from("ai_chat_history").insert([
      { user_id: user.id, role: "user", content: message },
      { user_id: user.id, role: "assistant", content: reply },
    ])
    if (error) throw new Error("Couldn't save the conversation")

    return NextResponse.json({ reply })
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
