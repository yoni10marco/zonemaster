// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { TrainedTogetherCard } from "@/components/dashboard/TrainedTogetherCard"

describe("TrainedTogetherCard", () => {
  it("explains how to start when there are no shared sessions, with a link to Friends", () => {
    render(<TrainedTogetherCard stats={{ planned: 0, done: 0, partners: [] }} periodLabel="This week's" />)
    expect(screen.getByText("This week's trained together")).toBeInTheDocument()
    expect(screen.getByText(/no shared sessions yet/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "add friends" })).toHaveAttribute("href", "/friends")
  })

  it("shows sessions done together out of those planned together, and who with", () => {
    render(
      <TrainedTogetherCard
        stats={{
          planned: 4,
          done: 3,
          partners: [
            { userId: "b", name: "bobby", count: 2 },
            { userId: "c", name: "carl", count: 1 },
          ],
        }}
        periodLabel="This month's"
      />
    )
    expect(screen.getByText("3 / 4")).toBeInTheDocument()
    expect(screen.getByText("With bobby (2), carl (1)")).toBeInTheDocument()
  })

  it("shows no partner line when nothing was done together yet, and caps a long list", () => {
    const { rerender } = render(<TrainedTogetherCard stats={{ planned: 2, done: 0, partners: [] }} periodLabel="All-time" />)
    expect(screen.getByText("0 / 2")).toBeInTheDocument()
    expect(screen.queryByText(/^With /)).not.toBeInTheDocument()
    const many = ["a", "b", "c", "d", "e"].map((n) => ({ userId: n, name: n, count: 1 }))
    rerender(<TrainedTogetherCard stats={{ planned: 5, done: 5, partners: many }} periodLabel="All-time" />)
    expect(screen.getByText("With a (1), b (1), c (1) +2 more")).toBeInTheDocument()
  })
})
