// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { BottomNav } from "@/components/layout/BottomNav"

let pathname = "/calendar"
vi.mock("next/navigation", () => ({ usePathname: () => pathname }))

const pendingCounts = vi.fn()
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ rpc: (...args: unknown[]) => pendingCounts(...args) }),
}))

describe("BottomNav", () => {
  it("shows all five tabs, hidden above the mobile breakpoint", () => {
    pendingCounts.mockResolvedValue({ data: [{ friend_requests: 0, session_invites: 0 }], error: null })
    render(<BottomNav />)
    const nav = screen.getByRole("navigation", { name: "Primary" })
    expect(nav).toHaveClass("sm:hidden")
    for (const label of ["Calendar", "Dashboard", "Coach", "Friends", "Profile"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument()
    }
  })

  it("marks the current page as current, and nothing else", () => {
    pathname = "/dashboard"
    pendingCounts.mockResolvedValue({ data: [{ friend_requests: 0, session_invites: 0 }], error: null })
    render(<BottomNav />)
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Calendar" })).not.toHaveAttribute("aria-current")
  })

  it("treats a sub-page as part of its tab", () => {
    pathname = "/friends/requests"
    pendingCounts.mockResolvedValue({ data: [{ friend_requests: 0, session_invites: 0 }], error: null })
    render(<BottomNav />)
    expect(screen.getByRole("link", { name: "Friends" })).toHaveAttribute("aria-current", "page")
  })

  it("shows the waiting count on the Friends tab", async () => {
    pathname = "/calendar"
    pendingCounts.mockResolvedValue({ data: [{ friend_requests: 2, session_invites: 1 }], error: null })
    render(<BottomNav />)
    expect(await screen.findByRole("link", { name: "Friends, 3 waiting" })).toBeInTheDocument()
  })
})
