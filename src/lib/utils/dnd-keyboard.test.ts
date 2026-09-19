import { describe, expect, it } from "vitest"

import { pickTarget, type Target } from "@/lib/utils/dnd-keyboard"

// A 3-column x 2-row grid of 100x100 day cells, ids "r{row}c{col}".
const cell = (row: number, col: number): Target => ({
  id: `r${row}c${col}`,
  left: col * 100,
  top: row * 100,
  width: 100,
  height: 100,
})
const grid = [0, 1].flatMap((row) => [0, 1, 2].map((col) => cell(row, col)))
const centerOf = (t: Target) => ({ x: t.left + t.width / 2, y: t.top + t.height / 2 })

describe("pickTarget", () => {
  const from = centerOf(cell(0, 1)) // top middle

  it("moves to the neighbouring cell in each direction", () => {
    expect(pickTarget(from, grid, "left")?.id).toBe("r0c0")
    expect(pickTarget(from, grid, "right")?.id).toBe("r0c2")
    expect(pickTarget(from, grid, "down")?.id).toBe("r1c1")
  })

  it("stays put at the edges", () => {
    expect(pickTarget(from, grid, "up")).toBeNull()
    expect(pickTarget(centerOf(cell(0, 0)), grid, "left")).toBeNull()
    expect(pickTarget(centerOf(cell(1, 2)), grid, "right")).toBeNull()
  })

  it("prefers a cell in the same row over a nearer diagonal one", () => {
    const targets = [
      { id: "same-row", left: 300, top: 0, width: 100, height: 100 },
      { id: "diagonal", left: 200, top: 100, width: 100, height: 100 },
    ]
    expect(pickTarget(centerOf(cell(0, 0)), targets, "right")?.id).toBe("same-row")
  })

  it("works for a single-column (phone) layout", () => {
    const column = [0, 1, 2].map((row) => cell(row, 0))
    expect(pickTarget(centerOf(column[0]), column, "down")?.id).toBe("r1c0")
    expect(pickTarget(centerOf(column[2]), column, "up")?.id).toBe("r1c0")
    expect(pickTarget(centerOf(column[1]), column, "left")).toBeNull()
  })

  it("returns null with no targets", () => {
    expect(pickTarget(from, [], "left")).toBeNull()
  })
})
