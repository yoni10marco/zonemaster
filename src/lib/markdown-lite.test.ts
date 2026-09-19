import { describe, expect, it } from "vitest"

import { parseInline, parseMarkdownLite } from "@/lib/markdown-lite"

describe("parseInline", () => {
  it("marks **bold** runs", () => {
    expect(parseInline("Keep **Zone 2** easy")).toEqual([
      { text: "Keep " },
      { text: "Zone 2", bold: true },
      { text: " easy" },
    ])
  })

  it("drops an unmatched ** instead of showing stray asterisks (mid-stream)", () => {
    expect(parseInline("Focus on **swim")).toEqual([{ text: "Focus on swim" }])
  })

  it("returns plain text untouched", () => {
    expect(parseInline("no formatting here")).toEqual([{ text: "no formatting here" }])
  })
})

describe("parseMarkdownLite", () => {
  it("splits paragraphs on blank lines and keeps single line breaks", () => {
    const blocks = parseMarkdownLite("First line\nsecond line\n\nNew paragraph")
    expect(blocks).toHaveLength(2)
    expect(blocks[0]).toEqual({ type: "paragraph", inlines: [{ text: "First line\nsecond line" }] })
  })

  it("groups bullets into one list, whatever marker is used", () => {
    const blocks = parseMarkdownLite("- run\n* bike\n• swim")
    expect(blocks).toEqual([
      { type: "list", ordered: false, items: [[{ text: "run" }], [{ text: "bike" }], [{ text: "swim" }]] },
    ])
  })

  it("recognises numbered lists and keeps them separate from bullets", () => {
    const blocks = parseMarkdownLite("1. warm up\n2) main set\n- extra")
    expect(blocks).toHaveLength(2)
    expect(blocks[0]).toMatchObject({ type: "list", ordered: true })
    expect(blocks[1]).toMatchObject({ type: "list", ordered: false })
  })

  it("puts a paragraph before a list in its own block", () => {
    const blocks = parseMarkdownLite("Plan:\n- easy run")
    expect(blocks.map((b) => b.type)).toEqual(["paragraph", "list"])
  })

  it("shows headings as bold text rather than markdown symbols", () => {
    expect(parseMarkdownLite("### This week")).toEqual([
      { type: "paragraph", inlines: [{ text: "This week", bold: true }] },
    ])
  })

  it("never turns markup into anything but text", () => {
    const [block] = parseMarkdownLite("<img src=x onerror=alert(1)> **b**")
    expect(block.type).toBe("paragraph")
    if (block.type === "paragraph") {
      expect(block.inlines[0].text).toBe("<img src=x onerror=alert(1)> ")
    }
  })

  it("handles empty input", () => {
    expect(parseMarkdownLite("")).toEqual([])
    expect(parseMarkdownLite("\n\n  \n")).toEqual([])
  })
})
