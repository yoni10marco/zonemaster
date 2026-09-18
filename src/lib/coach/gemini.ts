const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models"
const DEFAULT_MODEL = "gemini-3.5-flash"
// Used only when the primary model keeps answering "overloaded": new models see
// demand spikes, and a slightly older model beats an error message.
const FALLBACK_MODEL = "gemini-3-flash-preview"
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504])
const RETRY_DELAY_MS = 1200
// The primary model fails fast when healthy; when it hangs, give up sooner so
// the fallback still has time to answer.
const FIRST_ATTEMPT_TIMEOUT_MS = 18_000
const ATTEMPT_TIMEOUT_MS = 25_000
// Route handlers are limited to 60s, so never start another attempt past this.
const TOTAL_BUDGET_MS = 30_000

export class CoachNotConfiguredError extends Error {
  constructor() {
    super("The AI coach isn't configured yet")
    this.name = "CoachNotConfiguredError"
  }
}

export type GeminiTurn = { role: "user" | "model"; text: string }

type GenerateOptions = {
  system: string
  turns: GeminiTurn[]
  /** Ask for JSON output conforming to this Gemini response schema. */
  responseSchema?: Record<string, unknown>
  maxOutputTokens?: number
  temperature?: number
}

type GeminiResponse = {
  candidates?: {
    finishReason?: string
    content?: { parts?: { text?: string }[] }
  }[]
  promptFeedback?: { blockReason?: string }
}

export function isCoachConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY
}

export async function generateCoachText({
  system,
  turns,
  responseSchema,
  // Thinking tokens count toward this limit on current Gemini models.
  maxOutputTokens = 4096,
  temperature = 0.7,
}: GenerateOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new CoachNotConfiguredError()

  const primary = process.env.GEMINI_MODEL || DEFAULT_MODEL
  // Primary first, then straight to the fallback, then (after a short pause)
  // both once more, since overload errors tend to come in bursts.
  const attempts =
    primary === FALLBACK_MODEL
      ? [primary, primary, primary]
      : [primary, FALLBACK_MODEL, primary, FALLBACK_MODEL]
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    generationConfig: {
      temperature,
      maxOutputTokens,
      ...(responseSchema ? { responseMimeType: "application/json", responseSchema } : {}),
    },
  })

  const startedAt = Date.now()
  let res: Response | null = null
  let lastStatus = 0

  for (let i = 0; i < attempts.length; i++) {
    if (i > 0) {
      if (Date.now() - startedAt > TOTAL_BUDGET_MS) break
      if (i >= 2) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
    }

    try {
      res = await fetch(`${GEMINI_ENDPOINT}/${encodeURIComponent(attempts[i])}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body,
        signal: AbortSignal.timeout(i === 0 ? FIRST_ATTEMPT_TIMEOUT_MS : ATTEMPT_TIMEOUT_MS),
      })
    } catch {
      // Timeout or network error: move on to the next attempt instead of failing.
      res = null
      continue
    }

    if (res.ok) break
    lastStatus = res.status
    if (!RETRYABLE_STATUSES.has(res.status)) break
  }

  if (!res || !res.ok) {
    // Deliberately not echoing the response body: it can contain request
    // details that should not be surfaced to the browser.
    throw new Error(
      !res || RETRYABLE_STATUSES.has(lastStatus)
        ? "The AI coach is busy right now, please try again in a moment"
        : `The AI service returned an error (${lastStatus})`
    )
  }

  const data = (await res.json()) as GeminiResponse
  if (data.promptFeedback?.blockReason) {
    throw new Error("The AI declined to answer that request")
  }

  const candidate = data.candidates?.[0]
  if (candidate?.finishReason === "MAX_TOKENS" && responseSchema) {
    // Structured output that hit the limit is truncated JSON, not a usable plan.
    throw new Error("The AI ran out of room while planning, please try again")
  }
  const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("").trim()
  if (!text) {
    throw new Error(
      candidate?.finishReason === "MAX_TOKENS"
        ? "The AI's answer was cut off — try a shorter question"
        : "The AI returned an empty answer"
    )
  }
  return text
}
