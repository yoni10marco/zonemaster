// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SessionInvitesList } from "@/components/friends/SessionInvitesList"
import type { SessionInvite } from "@/lib/friends/sessions"

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}))

function invite(overrides: Partial<SessionInvite> = {}): SessionInvite {
  return {
    sessionId: 7,
    creatorUsername: "alexa",
    targetDate: "2026-09-26",
    discipline: "swim",
    title: "Pool session",
    notes: "bring fins",
    durationMinutes: 60,
    distanceKm: 1.5,
    zone: "z2",
    otherMembers: ["carl", "dora"],
    ...overrides,
  }
}

beforeEach(() => {
  toastSuccess.mockClear()
  toastError.mockClear()
})

describe("SessionInvitesList", () => {
  it("renders nothing when there are no invitations", () => {
    const { container } = render(<SessionInvitesList invites={[]} onRespond={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("shows who invited you and what the session is (swim distances in meters)", () => {
    render(<SessionInvitesList invites={[invite()]} onRespond={vi.fn()} />)
    expect(screen.getByText("alexa")).toBeInTheDocument()
    expect(screen.getByText(/invited you/i)).toBeInTheDocument()
    expect(screen.getByText("Pool session")).toBeInTheDocument()
    expect(screen.getByText("Sat, Sep 26 · 60 min · 1500 m · Z2 · Endurance")).toBeInTheDocument()
    expect(screen.getByText("With carl, dora")).toBeInTheDocument()
    expect(screen.getByText("bring fins")).toBeInTheDocument()
  })

  it("accepting tells you it was added to your calendar", async () => {
    const onRespond = vi.fn(async () => {})
    render(<SessionInvitesList invites={[invite()]} onRespond={onRespond} />)
    await userEvent.setup().click(screen.getByRole("button", { name: "Accept" }))
    expect(onRespond).toHaveBeenCalledWith(7, true)
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Added to your calendar for Sat, Sep 26"))
  })

  it("declining just clears the invitation", async () => {
    const onRespond = vi.fn(async () => {})
    render(<SessionInvitesList invites={[invite()]} onRespond={onRespond} />)
    await userEvent.setup().click(screen.getByRole("button", { name: "Decline" }))
    expect(onRespond).toHaveBeenCalledWith(7, false)
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Invitation declined"))
  })

  it("shows the server's message when answering fails", async () => {
    const onRespond = vi.fn(async () => {
      throw new Error("That invitation is no longer available.")
    })
    render(<SessionInvitesList invites={[invite()]} onRespond={onRespond} />)
    await userEvent.setup().click(screen.getByRole("button", { name: "Accept" }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("That invitation is no longer available."))
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it("lists several invitations, each answered on its own", async () => {
    const onRespond = vi.fn(async () => {})
    render(
      <SessionInvitesList
        invites={[invite({ sessionId: 1, title: "Morning swim" }), invite({ sessionId: 2, title: "Long ride", discipline: "bike", distanceKm: 60 })]}
        onRespond={onRespond}
      />
    )
    expect(screen.getByText("Morning swim")).toBeInTheDocument()
    expect(screen.getByText(/60 km/)).toBeInTheDocument()
    await userEvent.setup().click(screen.getAllByRole("button", { name: "Accept" })[1])
    expect(onRespond).toHaveBeenCalledWith(2, true)
  })
})
