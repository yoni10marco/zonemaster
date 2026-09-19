// Wire format between /api/coach/chat and the chat UI: newline-delimited JSON
// events, so the reply can appear word by word while it is being written.

export type CoachStreamEvent =
  | { type: "delta"; text: string }
  | { type: "error"; message: string }
  | { type: "done" }

export function encodeEvent(event: CoachStreamEvent): string {
  return JSON.stringify(event) + "\n"
}

function isEvent(value: unknown): value is CoachStreamEvent {
  if (typeof value !== "object" || value === null) return false
  const v = value as Record<string, unknown>
  return (
    (v.type === "delta" && typeof v.text === "string") ||
    (v.type === "error" && typeof v.message === "string") ||
    v.type === "done"
  )
}

/** Incremental parser: feed it network chunks, get complete events back. */
export function createEventParser() {
  let buffer = ""
  const parseLine = (line: string): CoachStreamEvent[] => {
    if (!line.trim()) return []
    try {
      const value: unknown = JSON.parse(line)
      return isEvent(value) ? [value] : []
    } catch {
      return [] // a garbled line should not kill the whole stream
    }
  }

  return {
    push(chunk: string): CoachStreamEvent[] {
      buffer += chunk
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? "" // the last piece may be an unfinished line
      return lines.flatMap(parseLine)
    },
    flush(): CoachStreamEvent[] {
      const rest = buffer
      buffer = ""
      return parseLine(rest)
    },
  }
}

/**
 * Server-sent events (what Gemini's streaming endpoint returns): pull the
 * `data:` payload of every complete event out of the buffer and return the
 * unfinished remainder to be completed by the next network chunk.
 */
export function extractSseData(buffer: string): { data: string[]; rest: string } {
  const normalized = buffer.replace(/\r\n/g, "\n")
  const parts = normalized.split("\n\n")
  const rest = parts.pop() ?? ""
  const data: string[] = []
  for (const part of parts) {
    const payload = part
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).replace(/^ /, ""))
      .join("\n")
    if (payload) data.push(payload)
  }
  return { data, rest }
}
