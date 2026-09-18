"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, SendHorizonal, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { toISODate } from "@/lib/utils/dates"

export type ChatMessage = { role: "user" | "assistant"; content: string }

const SUGGESTIONS = [
  "How did my last week of training go?",
  "Am I balancing swim, bike and run well?",
  "What should I focus on this week?",
]

export function CoachChat({ initialMessages }: { initialMessages: ChatMessage[] }) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, sending])

  async function send(text: string) {
    const message = text.trim()
    if (!message || sending) return

    setMessages((prev) => [...prev, { role: "user", content: message }])
    setInput("")
    setSending(true)

    try {
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The browser knows the athlete's local "today"; the server doesn't.
        body: JSON.stringify({ message, today: toISODate(new Date()) }),
      })
      if (res.redirected) throw new Error("Your session expired — please log in again")
      const body = (await res.json().catch(() => null)) as { reply?: string; error?: string } | null
      if (!res.ok || !body?.reply) throw new Error(body?.error ?? "The coach is unavailable right now")

      setMessages((prev) => [...prev, { role: "assistant", content: body.reply! }])
    } catch (err) {
      // Roll back the optimistic message and restore the draft so nothing is lost.
      setMessages((prev) => prev.slice(0, -1))
      setInput(message)
      toast.error(err instanceof Error ? err.message : "The coach is unavailable right now")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={scrollRef}
        className="h-[55vh] min-h-72 space-y-3 overflow-y-auto rounded-xl border bg-card p-3 sm:p-4"
      >
        {messages.length === 0 && !sending ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="font-medium">Ask your coach anything</p>
              <p className="text-sm text-muted-foreground">
                Answers are based on your profile, completed workouts and plan.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => send(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words",
                  m.role === "user"
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm bg-muted text-foreground"
                )}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {sending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Coach is thinking...
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="flex items-end gap-2"
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              send(input)
            }
          }}
          placeholder="Ask about your training..."
          maxLength={2000}
          rows={2}
          className="min-h-0 flex-1 resize-none"
          disabled={sending}
        />
        <Button type="submit" size="icon-lg" disabled={sending || input.trim() === ""} aria-label="Send">
          <SendHorizonal />
        </Button>
      </form>
    </div>
  )
}
