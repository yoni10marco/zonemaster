// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { NavLinkPending } from "@/components/layout/NavLinkPending"

let pending = false
vi.mock("next/link", () => ({ useLinkStatus: () => ({ pending }) }))

describe("NavLinkPending", () => {
  it("is invisible (but present, reserving its space) when nothing is pending", () => {
    pending = false
    const { container } = render(<NavLinkPending />)
    const dot = container.firstElementChild!
    expect(dot).toBeInTheDocument()
    expect(dot).toHaveClass("opacity-0")
    expect(dot).not.toHaveClass("animate-pulse")
  })

  it("fades in while its link's navigation is pending", () => {
    pending = true
    const { container } = render(<NavLinkPending />)
    const dot = container.firstElementChild!
    expect(dot).toHaveClass("opacity-60")
    expect(dot).toHaveClass("animate-pulse")
  })

  it("is hidden from assistive tech and never announced", () => {
    pending = true
    const { container } = render(<NavLinkPending />)
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")
  })
})
