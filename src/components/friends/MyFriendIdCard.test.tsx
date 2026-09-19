// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { MyFriendIdCard } from "@/components/friends/MyFriendIdCard"

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}))

const refetch = vi.fn(async () => {})
let profile: { username: string | null; friend_code: string } | null = null
vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({ profile, loading: false, refetch }),
}))

const updateEq = vi.fn(async () => ({ error: null as { message: string } | null }))
const update = vi.fn(() => ({ eq: updateEq }))
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: "me" } } }) },
    from: () => ({ update }),
  }),
}))

const writeText = vi.fn(async () => {})

beforeEach(() => {
  toastSuccess.mockClear()
  toastError.mockClear()
  update.mockClear()
  updateEq.mockClear()
  updateEq.mockResolvedValue({ error: null })
  refetch.mockClear()
  writeText.mockClear()
  profile = { username: null, friend_code: "K7M29QXA" }
  // user-event replaces navigator.clipboard when set up, so spy on it afterwards
})

function setup() {
  const user = userEvent.setup()
  vi.spyOn(navigator.clipboard, "writeText").mockImplementation(writeText)
  return user
}

describe("MyFriendIdCard", () => {
  it("shows the friend ID in a readable format and says it never changes", () => {
    render(<MyFriendIdCard />)
    expect(screen.getByText("K7M2-9QXA")).toBeInTheDocument()
    expect(screen.getByText(/can never change/i)).toBeInTheDocument()
  })

  it("asks for a username when none is set, and disables the invite text", () => {
    render(<MyFriendIdCard />)
    expect(screen.getByText(/choose a username so friends can find you/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /copy invite text/i })).toBeDisabled()
  })

  it("saves a valid username, lowercased, to the profile", async () => {
    render(<MyFriendIdCard />)
    const user = setup()
    await user.type(screen.getByLabelText("Username"), "Alex_Runs")
    await user.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(update).toHaveBeenCalledWith({ username: "alex_runs" }))
    expect(updateEq).toHaveBeenCalledWith("id", "me")
    expect(refetch).toHaveBeenCalled()
    expect(toastSuccess).toHaveBeenCalledWith("Username saved")
  })

  it("rejects an invalid username without calling the server", async () => {
    render(<MyFriendIdCard />)
    const user = setup()
    await user.type(screen.getByLabelText("Username"), "a!")
    await user.click(screen.getByRole("button", { name: "Save" }))
    expect(await screen.findByText(/3–20 characters/)).toBeInTheDocument()
    expect(update).not.toHaveBeenCalled()
  })

  it("shows a database error instead of pretending it saved", async () => {
    updateEq.mockResolvedValue({ error: { message: "value violates a rule" } })
    render(<MyFriendIdCard />)
    const user = setup()
    await user.type(screen.getByLabelText("Username"), "alex")
    await user.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("value violates a rule"))
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it("copies the friend ID and a ready-to-send invite message", async () => {
    profile = { username: "alex_runs", friend_code: "K7M29QXA" }
    render(<MyFriendIdCard />)
    const user = setup()
    await user.click(screen.getByRole("button", { name: "Copy friend ID" }))
    expect(writeText).toHaveBeenCalledWith("K7M2-9QXA")
    await user.click(screen.getByRole("button", { name: /copy invite text/i }))
    expect(writeText).toHaveBeenLastCalledWith(
      "Add me on Zone Master. Username: alex_runs, friend ID: K7M2-9QXA"
    )
  })

  it("only enables Save once the username has changed", async () => {
    profile = { username: "alex_runs", friend_code: "K7M29QXA" }
    render(<MyFriendIdCard />)
    const user = setup()
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
    await user.type(screen.getByLabelText("Username"), "2")
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled()
  })
})
