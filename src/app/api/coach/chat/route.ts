import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { buildTrainingContext } from "@/lib/coach/context"
import { isCoachConfigured, streamCoachText, type GeminiTurn } from "@/lib/coach/gemini"
import { COACH_HOURLY_LIMIT, coachSystemPrompt, isRateLimited } from "@/lib/coach/prompt"
import { encodeEvent, type CoachStreamEvent } from "@/lib/coach/stream"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 60

const HISTORY_TURNS = 20

const bodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

// Problems that are found before the answer starts come back as ordinary JSON
// errors; once it starts, the reply is streamed as newline-delimited events
// (see lib/coach/stream.ts) so it can appear word by word.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const body = bodySchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: "Invalid message" }, { status: 400 })
  const { message, today } = body.data

  if (!isCoachConfigured()) {
    return NextResponse.json({ error: "The AI coach isn't configured yet" }, { status: 503 })
  }

  if (await isRateLimited(supabase, user.id)) {
    return NextResponse.json(
      { error: `You've reached the limit of ${COACH_HOURLY_LIMIT} coach requests per hour — try again later` },
      { status: 429 }
    )
  }

  let system: string
  let history: GeminiTurn[]
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
    system = coachSystemPrompt(context)
    history = (historyRes.data ?? [])
      .reverse()
      .map((row) => ({ role: row.role === "assistant" ? "model" : "user", text: row.content }))
    // Gemini expects the conversation to open with a user turn.
    while (history.length > 0 && history[0].role === "model") history.shift()
  } catch {
    return NextResponse.json({ error: "Couldn't load your training data" }, { status: 502 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // The browser may have gone away; that must not abort saving the reply.
      const send = (event: CoachStreamEvent) => {
        try {
          controller.enqueue(encoder.encode(encodeEvent(event)))
        } catch {
          // stream already closed by the client
        }
      }

      let reply = ""
      try {
        for await (const text of streamCoachText({
          system,
          turns: [...history, { role: "user", text: message }],
          // Chat answers don't need deep reasoning; "low" starts the reply much sooner.
          thinkingLevel: "low",
        })) {
          reply += text
          send({ type: "delta", text })
        }

        // Saved only once complete, so a failed answer leaves no half-conversation behind.
        const { error } = await supabase.from("ai_chat_history").insert([
          { user_id: user.id, role: "user", content: message },
          { user_id: user.id, role: "assistant", content: reply },
        ])
        if (error) throw new Error("Couldn't save the conversation")
        send({ type: "done" })
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "The coach is unavailable right now",
        })
      } finally {
        try {
          controller.close()
        } catch {
          // already closed
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  })
}
