// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { CoachChat } from "@/components/coach/CoachChat"
import { encodeEvent, type CoachStreamEvent } from "@/lib/coach/stream"

const toastError = vi.fn()
vi.mock("sonner", () => ({ toast: { error: (...args: unknown[]) => toastError(...args) } }))

/** A fake /api/coach/chat response that delivers the given text pieces as separate network chunks. */
function streamingResponse(chunks: string[], status = 200) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
  return new Response(stream, { status, headers: { "Content-Type": "application/x-ndjson" } })
}

const lines = (...events: CoachStreamEvent[]) => events.map(encodeEvent)

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  toastError.mockClear()
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
})

async function ask(question: string) {
  const user = userEvent.setup()
  await user.type(screen.getByPlaceholderText(/ask about your training/i), question)
  await user.click(screen.getByRole("button", { name: "Send" }))
  return user
}

describe("CoachChat", () => {
  it("shows the reply as it streams in, with formatting", async () => {
    fetchMock.mockResolvedValue(
      streamingResponse([
        ...lines({ type: "delta", text: "Keep your **easy days" }),
        ...lines({ type: "delta", text: " easy**.\n- swim twice\n- run once" }),
        ...lines({ type: "done" }),
      ])
    )
    render(<CoachChat initialMessages={[]} />)
    await ask("What should I do?")

    expect(await screen.findByText("easy days easy")).toBeInTheDocument()
    expect(screen.getByText("easy days easy").tagName).toBe("STRONG")
    expect(screen.getByText("swim twice").closest("li")).toBeInTheDocument()
    expect(screen.getByText("What should I do?")).toBeInTheDocument()
    expect(toastError).not.toHaveBeenCalled()
  })

  it("copes with events split across network chunks", async () => {
    const wire = encodeEvent({ type: "delta", text: "Split reply" }) + encodeEvent({ type: "done" })
    fetchMock.mockResolvedValue(streamingResponse([wire.slice(0, 11), wire.slice(11, 30), wire.slice(30)]))
    render(<CoachChat initialMessages={[]} />)
    await ask("hi")
    expect(await screen.findByText("Split reply")).toBeInTheDocument()
  })

  it("sends the question with the athlete's local date", async () => {
    fetchMock.mockResolvedValue(streamingResponse(lines({ type: "delta", text: "ok" }, { type: "done" })))
    render(<CoachChat initialMessages={[]} />)
    await ask("hello coach")
    await screen.findByText("ok")

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/coach/chat")
    const body = JSON.parse(init.body)
    expect(body.message).toBe("hello coach")
    expect(body.today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("rolls everything back when the stream fails part-way", async () => {
    fetchMock.mockResolvedValue(
      streamingResponse(lines({ type: "delta", text: "Half an answ" }, { type: "error", message: "The coach is busy" }))
    )
    render(<CoachChat initialMessages={[]} />)
    await ask("Will this work?")

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("The coach is busy"))
    expect(screen.queryByText(/Half an answ/)).not.toBeInTheDocument()
    expect(screen.queryByText("Will this work?", { selector: "div" })).not.toBeInTheDocument()
    // the draft is back in the box so nothing is lost
    expect(screen.getByPlaceholderText(/ask about your training/i)).toHaveValue("Will this work?")
  })

  it("treats a stream that ends without finishing as an error", async () => {
    fetchMock.mockResolvedValue(streamingResponse(lines({ type: "delta", text: "cut off" })))
    render(<CoachChat initialMessages={[]} />)
    await ask("hello")
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/interrupted/i)))
    expect(screen.queryByText("cut off")).not.toBeInTheDocument()
  })

  it("shows the server's message for errors found before the answer starts", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "You've reached the limit" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      })
    )
    render(<CoachChat initialMessages={[]} />)
    await ask("one more")
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("You've reached the limit"))
    expect(screen.getByPlaceholderText(/ask about your training/i)).toHaveValue("one more")
  })

  it("Review my week sends a review request", async () => {
    fetchMock.mockResolvedValue(streamingResponse(lines({ type: "delta", text: "Review done" }, { type: "done" })))
    render(<CoachChat initialMessages={[]} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: /review my week/i }))

    expect(await screen.findByText("Review done")).toBeInTheDocument()
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).message).toMatch(/review my training/i)
  })

  it("shows earlier conversation and disables sending an empty message", () => {
    render(
      <CoachChat
        initialMessages={[
          { role: "user", content: "Earlier question" },
          { role: "assistant", content: "Earlier **answer**" },
        ]}
      />
    )
    expect(screen.getByText("Earlier question")).toBeInTheDocument()
    expect(screen.getByText("answer").tagName).toBe("STRONG")
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled()
  })
})
