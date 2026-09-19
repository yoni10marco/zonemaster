import { describe, expect, it } from "vitest"

import { createEventParser, encodeEvent, extractSseData } from "@/lib/coach/stream"

describe("event encoding and parsing", () => {
  it("round-trips events", () => {
    const parser = createEventParser()
    const wire = encodeEvent({ type: "delta", text: "Hello" }) + encodeEvent({ type: "done" })
    expect(parser.push(wire)).toEqual([{ type: "delta", text: "Hello" }, { type: "done" }])
  })

  it("reassembles an event split across network chunks", () => {
    const parser = createEventParser()
    const line = encodeEvent({ type: "delta", text: "split me" })
    expect(parser.push(line.slice(0, 9))).toEqual([])
    expect(parser.push(line.slice(9))).toEqual([{ type: "delta", text: "split me" }])
  })

  it("keeps newlines inside text intact", () => {
    const parser = createEventParser()
    const events = parser.push(encodeEvent({ type: "delta", text: "a\nb" }))
    expect(events).toEqual([{ type: "delta", text: "a\nb" }])
  })

  it("ignores garbled or unknown lines without losing the rest", () => {
    const parser = createEventParser()
    const wire = `not json\n{"type":"mystery"}\n${encodeEvent({ type: "delta", text: "ok" })}`
    expect(parser.push(wire)).toEqual([{ type: "delta", text: "ok" }])
  })

  it("flush returns a final unterminated event", () => {
    const parser = createEventParser()
    expect(parser.push(JSON.stringify({ type: "done" }))).toEqual([])
    expect(parser.flush()).toEqual([{ type: "done" }])
  })

  it("carries error events", () => {
    const parser = createEventParser()
    expect(parser.push(encodeEvent({ type: "error", message: "busy" }))).toEqual([
      { type: "error", message: "busy" },
    ])
  })
})

describe("extractSseData", () => {
  it("returns the data payload of each complete event", () => {
    const { data, rest } = extractSseData('data: {"a":1}\n\ndata: {"a":2}\n\n')
    expect(data).toEqual(['{"a":1}', '{"a":2}'])
    expect(rest).toBe("")
  })

  it("keeps an incomplete trailing event for the next chunk", () => {
    const first = extractSseData('data: {"a":1}\n\ndata: {"a"')
    expect(first.data).toEqual(['{"a":1}'])
    const second = extractSseData(first.rest + ":2}\n\n")
    expect(second.data).toEqual(['{"a":2}'])
  })

  it("handles Windows line endings and ignores non-data fields", () => {
    const { data } = extractSseData('event: message\r\nid: 7\r\ndata: {"a":1}\r\n\r\n')
    expect(data).toEqual(['{"a":1}'])
  })

  it("joins multi-line data fields", () => {
    expect(extractSseData("data: line1\ndata: line2\n\n").data).toEqual(["line1\nline2"])
  })

  it("returns nothing for comments-only or empty input", () => {
    expect(extractSseData(": keep-alive\n\n").data).toEqual([])
    expect(extractSseData("")).toEqual({ data: [], rest: "" })
  })
})
