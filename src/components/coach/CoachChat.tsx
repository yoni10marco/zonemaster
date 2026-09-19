"use client"

import { useEffect, useRef, useState } from "react"
import { ClipboardCheck, Loader2, SendHorizonal, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { MarkdownLite } from "@/components/coach/MarkdownLite"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createEventParser, type CoachStreamEvent } from "@/lib/coach/stream"
import { cn } from "@/lib/utils"
import { toISODate } from "@/lib/utils/dates"

export type ChatMessage = { role: "user" | "assistant"; content: string }

const SUGGESTIONS = [
  "Am I balancing swim, bike and run well?",
  "What should I focus on this week?",
  "How should I taper for my race?",
]

const REVIEW_PROMPT =
  "Please review my training: how did last week go, how is this week looking so far, and what should I adjust next? Use my numbers."

const FALLBACK_ERROR = "The coach is unavailable right now"

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

    let started = false // did any of the reply arrive?
    try {
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The browser knows the athlete's local "today"; the server doesn't.
        body: JSON.stringify({ message, today: toISODate(new Date()) }),
      })
      if (res.redirected) throw new Error("Your session expired — please log in again")
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? FALLBACK_ERROR)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      const parser = createEventParser()
      let finished = false

      const handle = (events: CoachStreamEvent[]) => {
        for (const event of events) {
          if (event.type === "error") throw new Error(event.message)
          if (event.type === "done") {
            finished = true
            continue
          }
          const chunk = event.text
          const continuing = started
          started = true
          setMessages((prev) => {
            const last = prev[prev.length - 1]
            return continuing && last?.role === "assistant"
              ? [...prev.slice(0, -1), { role: "assistant", content: last.content + chunk }]
              : [...prev, { role: "assistant", content: chunk }]
          })
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        handle(parser.push(decoder.decode(value, { stream: true })))
      }
      handle(parser.push(decoder.decode()))
      handle(parser.flush())
      if (!finished) throw new Error("The reply was interrupted, please try again")
    } catch (err) {
      // The server saves a conversation only when the whole reply arrived, so
      // roll the screen back to match: drop the question (and any partial
      // answer) and put the draft back so nothing is lost.
      setMessages((prev) => prev.slice(0, started ? -2 : -1))
      setInput(message)
      toast.error(err instanceof Error ? err.message : FALLBACK_ERROR)
    } finally {
      setSending(false)
    }
  }

  const waitingForFirstWord = sending && messages[messages.length - 1]?.role === "user"

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => send(REVIEW_PROMPT)} disabled={sending}>
          <ClipboardCheck />
          Review my week
        </Button>
      </div>

      <div
        ref={scrollRef}
        className="h-[55vh] min-h-72 space-y-3 overflow-x-hidden overflow-y-auto rounded-xl border bg-card p-3 sm:p-4"
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
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  className="h-auto max-w-full py-1.5 text-center whitespace-normal"
                  onClick={() => send(s)}
                >
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
                  "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm break-words",
                  m.role === "user"
                    ? "rounded-br-sm bg-primary whitespace-pre-wrap text-primary-foreground"
                    : "rounded-bl-sm bg-muted text-foreground"
                )}
              >
                {m.role === "assistant" ? <MarkdownLite text={m.content} /> : m.content}
              </div>
            </div>
          ))
        )}
        {waitingForFirstWord && (
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
        className="relative"
      >
        {/* The send button sits inside the box (not beside it) so the input
            spans the full width, lined up with the chat panel above. */}
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
          className="min-h-14 resize-none rounded-xl bg-card py-3 pr-14 pl-3.5"
          disabled={sending}
        />
        <Button
          type="submit"
          size="icon-lg"
          className="absolute right-2 bottom-2 rounded-full"
          disabled={sending || input.trim() === ""}
          aria-label="Send"
        >
          <SendHorizonal />
        </Button>
      </form>
    </div>
  )
}
