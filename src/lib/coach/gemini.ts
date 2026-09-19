import { extractSseData } from "@/lib/coach/stream"

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models"
const DEFAULT_MODEL = "gemini-3.5-flash"
// Used when the primary model is overloaded or slow: new models see demand
// spikes, and a slightly older model beats an error message or a long wait.
const FALLBACK_MODEL = "gemini-3-flash-preview"
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504])
// Statuses that mean "this request/key is wrong" — another model won't help.
const FATAL_STATUSES = new Set([400, 401, 403])
const RETRY_DELAY_MS = 1200
// If the primary model has not answered after this long, start the fallback
// alongside it and keep whichever finishes first. Streaming judges "answered"
// by the first words (headers arrive at once); one-shot calls by the whole answer.
const HEDGE_DELAY_STREAM_MS = 6_000
const HEDGE_DELAY_ONESHOT_MS = 10_000
// Route handlers are limited to 60s: no attempt runs longer than this, and no
// second round starts once this much time has passed.
const ATTEMPT_TIMEOUT_MS = 25_000
const TOTAL_BUDGET_MS = 30_000

export class CoachNotConfiguredError extends Error {
  constructor() {
    super("The AI coach isn't configured yet")
    this.name = "CoachNotConfiguredError"
  }
}

class GeminiHttpError extends Error {
  constructor(readonly status: number) {
    super(`Gemini request failed (${status})`)
    this.name = "GeminiHttpError"
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
  /** How hard the model thinks before answering: "low" is much faster. */
  thinkingLevel?: "low" | "high"
}

type GeminiPart = { text?: string; thought?: boolean }
type GeminiResponse = {
  candidates?: {
    finishReason?: string
    content?: { parts?: GeminiPart[] }
  }[]
  promptFeedback?: { blockReason?: string }
}

export function isCoachConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY
}

function requireApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new CoachNotConfiguredError()
  return apiKey
}

function primaryModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL
}

// Only the Gemini 3 family accepts thinkingLevel (older ones use a token budget).
function supportsThinkingLevel(model: string): boolean {
  return /^gemini-3/.test(model)
}

function buildBody(options: GenerateOptions, model: string): string {
  const { system, turns, responseSchema, maxOutputTokens = 4096, temperature = 0.7, thinkingLevel } = options
  return JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    generationConfig: {
      temperature,
      maxOutputTokens, // thinking tokens count toward this on current Gemini models
      ...(responseSchema ? { responseMimeType: "application/json", responseSchema } : {}),
      ...(thinkingLevel && supportsThinkingLevel(model) ? { thinkingConfig: { thinkingLevel } } : {}),
    },
  })
}

function visibleText(parts: GeminiPart[] | undefined): string {
  return (parts ?? [])
    .filter((p) => !p.thought)
    .map((p) => p.text ?? "")
    .join("")
}

function failure(error: unknown): Error {
  const status = error instanceof GeminiHttpError ? error.status : 0
  // Deliberately not echoing the response body: it can contain request
  // details that should not be surfaced to the browser.
  return new Error(
    status === 0 || RETRYABLE_STATUSES.has(status)
      ? "The AI coach is busy right now, please try again in a moment"
      : `The AI service returned an error (${status})`
  )
}

// Errors that reach the caller: HTTP failures become a friendly message; anything else
// (e.g. "the AI declined") already is one.
function surface(error: unknown): unknown {
  return error instanceof GeminiHttpError ? failure(error) : error
}

// Problems that no other model or retry can fix (e.g. a blocked prompt), as
// opposed to a bad HTTP status, a timeout/abort or a network failure.
function isFatal(error: unknown): boolean {
  if (error instanceof GeminiHttpError) return FATAL_STATUSES.has(error.status)
  return !(error instanceof TypeError) && !(error instanceof Error && error.name === "AbortError")
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// ---- racing the primary model against the fallback -------------------------

type Outcome<T> = { ok: true; value: T } | { ok: false; error: unknown }
type Attempt<T> = { model: string; controller: AbortController; done: Promise<Outcome<T>> }

/** The first attempt to succeed, or null once every attempt has failed. */
function firstSuccess<T>(attempts: Attempt<T>[]): Promise<{ attempt: Attempt<T>; value: T } | null> {
  return new Promise((resolve) => {
    let failed = 0
    for (const attempt of attempts) {
      void attempt.done.then((outcome) => {
        if (outcome.ok) resolve({ attempt, value: outcome.value })
        else if (++failed === attempts.length) resolve(null)
      })
    }
  })
}

/**
 * Primary model first. If it fails, or is still silent after `hedgeDelayMs`, the
 * fallback model is started alongside it and the first success wins (the loser
 * is cancelled). If both fail, one more round is tried after a short pause,
 * since overload errors tend to come in bursts.
 */
async function raceModels<T>(
  start: (model: string) => Attempt<T>,
  hedgeDelayMs: number
): Promise<{ attempt: Attempt<T>; value: T }> {
  const primary = primaryModel()
  const startedAt = Date.now()
  let lastError: unknown = null

  for (let round = 0; round < 2; round++) {
    if (round > 0) {
      if (Date.now() - startedAt > TOTAL_BUDGET_MS) break
      await sleep(RETRY_DELAY_MS)
    }

    const attempts = [start(primary)]
    const early = await Promise.race([attempts[0].done, sleep(hedgeDelayMs).then(() => null)])
    if (early && !early.ok && isFatal(early.error)) throw surface(early.error)
    if (!(early && early.ok) && primary !== FALLBACK_MODEL) attempts.push(start(FALLBACK_MODEL))

    const winner = await firstSuccess(attempts)
    for (const attempt of attempts) {
      if (attempt !== winner?.attempt) attempt.controller.abort()
    }
    if (winner) return winner

    const outcomes = await Promise.all(attempts.map((a) => a.done))
    for (const outcome of outcomes) {
      if (outcome.ok) continue
      if (isFatal(outcome.error)) throw surface(outcome.error)
      lastError = outcome.error
    }
  }

  throw failure(lastError)
}

// ---- one-shot answers ------------------------------------------------------

function startOneShot(options: GenerateOptions, apiKey: string) {
  return (model: string): Attempt<Response> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS)
    const done = fetch(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: buildBody(options, model),
      signal: controller.signal,
    })
      .then((res): Outcome<Response> => (res.ok ? { ok: true, value: res } : { ok: false, error: new GeminiHttpError(res.status) }))
      .catch((error): Outcome<Response> => ({ ok: false, error }))
      .finally(() => clearTimeout(timer))
    return { model, controller, done }
  }
}

export async function generateCoachText(options: GenerateOptions): Promise<string> {
  const { value: res } = await raceModels(startOneShot(options, requireApiKey()), HEDGE_DELAY_ONESHOT_MS)

  const data = (await res.json()) as GeminiResponse
  if (data.promptFeedback?.blockReason) {
    throw new Error("The AI declined to answer that request")
  }

  const candidate = data.candidates?.[0]
  if (candidate?.finishReason === "MAX_TOKENS" && options.responseSchema) {
    // Structured output that hit the limit is truncated JSON, not a usable plan.
    throw new Error("The AI ran out of room while planning, please try again")
  }
  const text = visibleText(candidate?.content?.parts).trim()
  if (!text) {
    throw new Error(
      candidate?.finishReason === "MAX_TOKENS"
        ? "The AI's answer was cut off, try a shorter question"
        : "The AI returned an empty answer"
    )
  }
  return text
}

// ---- streamed answers ------------------------------------------------------

/** Streams one model's answer: yields text as it is written. Throws GeminiHttpError on a bad status. */
async function* streamFromModel(
  model: string,
  options: GenerateOptions,
  apiKey: string,
  signal: AbortSignal
): AsyncGenerator<string> {
  const res = await fetch(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: buildBody(options, model),
    signal,
  })
  if (!res.ok) throw new GeminiHttpError(res.status)
  if (!res.body) throw new GeminiHttpError(0)

  const reader = res.body.getReader()
  // Aborting must also release a read() that is waiting for the next chunk.
  const onAbort = () => void reader.cancel().catch(() => {})
  signal.addEventListener("abort", onAbort)

  const decoder = new TextDecoder()
  let buffer = ""
  let produced = false

  function* handle(payloads: string[]): Generator<string> {
    for (const payload of payloads) {
      let data: GeminiResponse
      try {
        data = JSON.parse(payload) as GeminiResponse
      } catch {
        continue
      }
      if (data.promptFeedback?.blockReason) {
        throw new Error("The AI declined to answer that request")
      }
      const text = visibleText(data.candidates?.[0]?.content?.parts)
      if (text) {
        produced = true
        yield text
      }
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const { data, rest } = extractSseData(buffer)
      buffer = rest
      yield* handle(data)
    }
    // A final event may arrive without its terminating blank line.
    yield* handle(extractSseData(buffer + decoder.decode() + "\n\n").data)
  } finally {
    signal.removeEventListener("abort", onAbort)
    reader.releaseLock()
  }

  if (!produced) throw new GeminiHttpError(0) // an empty answer counts as a failed attempt
}

type StreamAttempt = Attempt<IteratorResult<string>> & { iterator: AsyncGenerator<string> }

function startStream(options: GenerateOptions, apiKey: string) {
  return (model: string): StreamAttempt => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS)
    const iterator = streamFromModel(model, options, apiKey, controller.signal)
    // The attempt "succeeds" once it has produced its first words.
    const done = iterator.next().then(
      (value): Outcome<IteratorResult<string>> => ({ ok: true, value }),
      (error): Outcome<IteratorResult<string>> => ({ ok: false, error })
    )
    void done.then(() => clearTimeout(timer))
    return { model, controller, iterator, done }
  }
}

/** Like generateCoachText, but yields the answer piece by piece as it is written. */
export async function* streamCoachText(options: GenerateOptions): AsyncGenerator<string> {
  const { attempt, value: first } = await raceModels(
    startStream(options, requireApiKey()),
    HEDGE_DELAY_STREAM_MS
  )
  const { iterator, controller } = attempt as StreamAttempt

  try {
    if (first.done) return
    yield first.value
    while (true) {
      const next = await iterator.next()
      if (next.done) break
      yield next.value
    }
  } finally {
    controller.abort()
  }
}
