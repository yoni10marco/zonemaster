// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { PageTransition } from "@/components/layout/PageTransition"

let pathname = "/calendar"
vi.mock("next/navigation", () => ({ usePathname: () => pathname }))

describe("PageTransition", () => {
  it("renders its children", () => {
    render(
      <PageTransition>
        <p>Calendar content</p>
      </PageTransition>
    )
    expect(screen.getByText("Calendar content")).toBeInTheDocument()
  })

  it("gives the wrapper a fade-in entrance", () => {
    const { container } = render(
      <PageTransition>
        <p>Content</p>
      </PageTransition>
    )
    expect(container.firstChild).toHaveClass("animate-in", "fade-in-0")
  })

  it("remounts (a fresh DOM node) when the page changes, so the entrance replays", () => {
    const { container, rerender } = render(
      <PageTransition>
        <p>Calendar content</p>
      </PageTransition>
    )
    const first = container.firstChild
    pathname = "/dashboard"
    rerender(
      <PageTransition>
        <p>Dashboard content</p>
      </PageTransition>
    )
    expect(container.firstChild).not.toBe(first)
  })

  it("does not remount when the page stays the same", () => {
    pathname = "/calendar"
    const { container, rerender } = render(
      <PageTransition>
        <p>v1</p>
      </PageTransition>
    )
    const first = container.firstChild
    rerender(
      <PageTransition>
        <p>v2</p>
      </PageTransition>
    )
    expect(container.firstChild).toBe(first)
  })
})
