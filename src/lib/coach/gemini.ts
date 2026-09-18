const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models"
const DEFAULT_MODEL = "gemini-3.5-flash"

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
  maxOutputTokens = 2048,
  temperature = 0.7,
}: GenerateOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new CoachNotConfiguredError()

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL

  const res = await fetch(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
      generationConfig: {
        temperature,
        maxOutputTokens,
        ...(responseSchema ? { responseMimeType: "application/json", responseSchema } : {}),
      },
    }),
    signal: AbortSignal.timeout(50_000),
  })

  if (!res.ok) {
    // Deliberately not echoing the response body: it can contain request
    // details we don't want surfaced to the browser.
    throw new Error(`The AI service returned an error (${res.status})`)
  }

  const data = (await res.json()) as GeminiResponse
  if (data.promptFeedback?.blockReason) {
    throw new Error("The AI declined to answer that request")
  }

  const candidate = data.candidates?.[0]
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
