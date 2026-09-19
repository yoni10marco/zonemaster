import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CoachNotConfiguredError, generateCoachText, streamCoachText } from "@/lib/coach/gemini"

const OPTIONS = { system: "You are a coach.", turns: [{ role: "user" as const, text: "hi" }] }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}
const answer = (text: string) => json({ candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }] })
const status = (code: number) => json({ error: { code, message: "details that must not leak" } }, code)

function sse(...payloads: unknown[]) {
  return payloads.map((p) => `data: ${JSON.stringify(p)}\n\n`)
}
function sseResponse(chunks: string[]) {
  const encoder = new TextEncoder()
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
        controller.close()
      },
    }),
    { status: 200 }
  )
}
const part = (text: string) => ({ candidates: [{ content: { parts: [{ text }] } }] })

let fetchMock: ReturnType<typeof vi.fn>
const modelsCalled = () =>
  fetchMock.mock.calls.map(([url]) => String(url).match(/models\/([^:]+):/)?.[1])

beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "test-key")
  vi.stubEnv("GEMINI_MODEL", "")
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

/** Runs a call to completion while fast-forwarding the retry pauses. */
async function settle<T>(promise: Promise<T>): Promise<T> {
  const result = promise.then(
    (value) => ({ value }),
    (error) => ({ error })
  )
  await vi.runAllTimersAsync()
  const outcome = await result
  if ("error" in outcome) throw outcome.error
  return outcome.value
}

describe("generateCoachText", () => {
  it("returns the answer from the primary model", async () => {
    fetchMock.mockResolvedValueOnce(answer("Hello athlete"))
    await expect(settle(generateCoachText(OPTIONS))).resolves.toBe("Hello athlete")
    expect(modelsCalled()).toEqual(["gemini-3.5-flash"])
  })

  it("sends the API key in a header, never in the URL", async () => {
    fetchMock.mockResolvedValueOnce(answer("ok"))
    await settle(generateCoachText(OPTIONS))
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).not.toContain("test-key")
    expect(init.headers["x-goog-api-key"]).toBe("test-key")
  })

  it("falls back to the second model when the first is overloaded", async () => {
    fetchMock.mockResolvedValueOnce(status(503)).mockResolvedValueOnce(answer("From fallback"))
    await expect(settle(generateCoachText(OPTIONS))).resolves.toBe("From fallback")
    expect(modelsCalled()).toEqual(["gemini-3.5-flash", "gemini-3-flash-preview"])
  })

  it("retries both models once more before giving up on rate limits", async () => {
    fetchMock
      .mockResolvedValueOnce(status(429))
      .mockResolvedValueOnce(status(503))
      .mockResolvedValueOnce(status(503))
      .mockResolvedValueOnce(answer("Third time lucky"))
    await expect(settle(generateCoachText(OPTIONS))).resolves.toBe("Third time lucky")
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it("gives a friendly error, without provider details, when everything is busy", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(status(503)))
    const error = await settle(generateCoachText(OPTIONS)).catch((e) => e as Error)
    expect((error as Error).message).toMatch(/busy right now/i)
    expect((error as Error).message).not.toContain("details that must not leak")
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it("does not retry a request the API rejected as invalid", async () => {
    fetchMock.mockResolvedValueOnce(status(400))
    await expect(settle(generateCoachText(OPTIONS))).rejects.toThrow(/error \(400\)/)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("moves on to the next model after a network failure", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce(answer("Recovered"))
    await expect(settle(generateCoachText(OPTIONS))).resolves.toBe("Recovered")
  })

  it("respects a GEMINI_MODEL override as the primary model", async () => {
    vi.stubEnv("GEMINI_MODEL", "some-other-model")
    fetchMock.mockResolvedValueOnce(answer("ok"))
    await settle(generateCoachText(OPTIONS))
    expect(modelsCalled()).toEqual(["some-other-model"])
  })

  it("refuses to run without an API key", async () => {
    vi.stubEnv("GEMINI_API_KEY", "")
    await expect(settle(generateCoachText(OPTIONS))).rejects.toBeInstanceOf(CoachNotConfiguredError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("reports blocked prompts and empty answers", async () => {
    fetchMock.mockResolvedValueOnce(json({ promptFeedback: { blockReason: "SAFETY" } }))
    await expect(settle(generateCoachText(OPTIONS))).rejects.toThrow(/declined/i)
    fetchMock.mockResolvedValueOnce(json({ candidates: [{ content: { parts: [] }, finishReason: "STOP" }] }))
    await expect(settle(generateCoachText(OPTIONS))).rejects.toThrow(/empty answer/i)
  })

  it("treats truncated structured output as an error instead of returning broken JSON", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ candidates: [{ content: { parts: [{ text: '{"summary":"cut' }] }, finishReason: "MAX_TOKENS" }] })
    )
    await expect(settle(generateCoachText({ ...OPTIONS, responseSchema: { type: "OBJECT" } }))).rejects.toThrow(
      /ran out of room/i
    )
  })

  it("ignores thinking parts in the answer", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ candidates: [{ content: { parts: [{ text: "internal notes", thought: true }, { text: "Visible answer" }] } }] })
    )
    await expect(settle(generateCoachText(OPTIONS))).resolves.toBe("Visible answer")
  })
})

describe("streamCoachText", () => {
  async function collect(generator: AsyncGenerator<string>) {
    const pieces: string[] = []
    const run = (async () => {
      for await (const piece of generator) pieces.push(piece)
    })()
    await settle(run)
    return pieces
  }

  it("yields the answer piece by piece", async () => {
    fetchMock.mockResolvedValueOnce(sseResponse(sse(part("Keep "), part("it "), part("easy"))))
    expect(await collect(streamCoachText(OPTIONS))).toEqual(["Keep ", "it ", "easy"])
    expect(String(fetchMock.mock.calls[0][0])).toContain(":streamGenerateContent?alt=sse")
  })

  it("reassembles events that arrive split across network chunks", async () => {
    const wire = sse(part("Hello "), part("world")).join("")
    fetchMock.mockResolvedValueOnce(sseResponse([wire.slice(0, 20), wire.slice(20, 55), wire.slice(55)]))
    expect((await collect(streamCoachText(OPTIONS))).join("")).toBe("Hello world")
  })

  it("uses the same fallback as the non-streaming call", async () => {
    fetchMock.mockResolvedValueOnce(status(503)).mockResolvedValueOnce(sseResponse(sse(part("fallback words"))))
    expect(await collect(streamCoachText(OPTIONS))).toEqual(["fallback words"])
    expect(modelsCalled()).toEqual(["gemini-3.5-flash", "gemini-3-flash-preview"])
  })

  it("skips garbled events and thinking parts", async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        "data: {not json}\n\n",
        ...sse({ candidates: [{ content: { parts: [{ text: "hidden", thought: true }] } }] }),
        ...sse(part("shown")),
      ])
    )
    expect(await collect(streamCoachText(OPTIONS))).toEqual(["shown"])
  })

  it("treats models that only ever return nothing as busy", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(sseResponse([])))
    await expect(collect(streamCoachText(OPTIONS))).rejects.toThrow(/busy right now/i)
  })

  it("fails at once, without trying another model, when the prompt is blocked", async () => {
    fetchMock.mockResolvedValueOnce(sseResponse(sse({ promptFeedback: { blockReason: "SAFETY" } })))
    await expect(collect(streamCoachText(OPTIONS))).rejects.toThrow(/declined/i)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("starts the fallback when the primary model is slow to speak, and uses whichever answers first", async () => {
    const never = new Response(new ReadableStream<Uint8Array>({ start() {} }), { status: 200 }) // headers, but no words
    fetchMock.mockResolvedValueOnce(never).mockResolvedValueOnce(sseResponse(sse(part("quick fallback"))))
    expect(await collect(streamCoachText(OPTIONS))).toEqual(["quick fallback"])
    expect(modelsCalled()).toEqual(["gemini-3.5-flash", "gemini-3-flash-preview"])
  })

  it("does not start the fallback when the primary model answers promptly", async () => {
    fetchMock.mockResolvedValueOnce(sseResponse(sse(part("fast"))))
    expect(await collect(streamCoachText(OPTIONS))).toEqual(["fast"])
    expect(modelsCalled()).toEqual(["gemini-3.5-flash"])
  })

  it("asks for low thinking effort only from models that support it", async () => {
    fetchMock.mockResolvedValue(sseResponse(sse(part("ok"))))
    await collect(streamCoachText({ ...OPTIONS, thinkingLevel: "low" }))
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).generationConfig.thinkingConfig).toEqual({ thinkingLevel: "low" })

    fetchMock.mockClear()
    vi.stubEnv("GEMINI_MODEL", "gemini-2.5-flash")
    fetchMock.mockResolvedValue(sseResponse(sse(part("ok"))))
    await collect(streamCoachText({ ...OPTIONS, thinkingLevel: "low" }))
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).generationConfig).not.toHaveProperty("thinkingConfig")
  })
})
