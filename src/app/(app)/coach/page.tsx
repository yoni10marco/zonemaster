import { Sparkles } from "lucide-react"

import type { ChatMessage } from "@/components/coach/CoachChat"
import { CoachView } from "@/components/coach/CoachView"
import { isCoachConfigured } from "@/lib/coach/gemini"
import { createClient } from "@/lib/supabase/server"

const HISTORY_LIMIT = 50

export default async function CoachPage() {
  const supabase = await createClient()

  // Only user/assistant rows are conversation; "system" rows are bookkeeping
  // (plan-week requests) used for rate limiting.
  const { data } = await supabase
    .from("ai_chat_history")
    .select("role, content")
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT)

  const initialMessages: ChatMessage[] = (data ?? [])
    .reverse()
    .map((row) => ({ role: row.role === "assistant" ? "assistant" : "user", content: row.content }))

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="flex items-center gap-2 font-heading text-lg font-semibold">
          <Sparkles className="size-4 text-primary" />
          AI Coach
        </h1>
        <p className="text-sm text-muted-foreground">
          Ask questions about your training or let the coach draft your next week.
        </p>
      </div>

      {isCoachConfigured() ? (
        <CoachView initialMessages={initialMessages} />
      ) : (
        <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          The AI coach isn&apos;t set up on the server yet. It will be available as soon as the Gemini
          API key is configured.
        </div>
      )}
    </div>
  )
}
