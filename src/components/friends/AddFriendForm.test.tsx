// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AddFriendForm } from "@/components/friends/AddFriendForm"
import type { FoundUser } from "@/hooks/useFriends"

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}))

const BOBBY: FoundUser = { userId: "user-b", username: "bobby", relationship: "none" }

function setup(found: FoundUser | null | Error = BOBBY) {
  const findUser = vi.fn(async () => {
    if (found instanceof Error) throw found
    return found
  })
  const sendRequest = vi.fn(async () => {})
  const acceptIncoming = vi.fn(async () => {})
  render(<AddFriendForm findUser={findUser} sendRequest={sendRequest} acceptIncoming={acceptIncoming} />)
  return { findUser, sendRequest, acceptIncoming, user: userEvent.setup() }
}

async function search(user: ReturnType<typeof userEvent.setup>, username: string, code: string) {
  await user.type(screen.getByLabelText("Username"), username)
  await user.type(screen.getByLabelText("Friend ID"), code)
  await user.click(screen.getByRole("button", { name: "Find" }))
}

beforeEach(() => {
  toastSuccess.mockClear()
  toastError.mockClear()
})

describe("AddFriendForm", () => {
  it("asks for both a username and a valid friend ID before searching", async () => {
    const { findUser, user } = setup()
    await search(user, "bobby", "nope")
    expect(await screen.findByText(/8 letters and numbers/i)).toBeInTheDocument()
    expect(findUser).not.toHaveBeenCalled()
  })

  it("searches with a tidied-up username and friend ID", async () => {
    const { findUser, user } = setup()
    await search(user, "  BoBBy ", "k7m2 9qxa")
    await screen.findByText("bobby")
    expect(findUser).toHaveBeenCalledWith("bobby", "K7M29QXA")
  })

  it("sends a request to the person found, then shows it as pending", async () => {
    const { sendRequest, user } = setup()
    await search(user, "bobby", "K7M2-9QXA")
    await user.click(await screen.findByRole("button", { name: /send request/i }))
    expect(sendRequest).toHaveBeenCalledWith("user-b")
    expect(await screen.findByText("Pending")).toBeInTheDocument()
    expect(toastSuccess).toHaveBeenCalledWith("Request sent to bobby")
    expect(screen.queryByRole("button", { name: /send request/i })).not.toBeInTheDocument()
  })

  it("says nothing matched without revealing which half was wrong", async () => {
    const { user } = setup(null)
    await search(user, "ghost", "K7M2-9QXA")
    expect(await screen.findByText(/no one matches that username and friend id/i)).toBeInTheDocument()
  })

  it("lets you accept when they already sent you a request", async () => {
    const { acceptIncoming, user } = setup({ ...BOBBY, relationship: "pending_in" })
    await search(user, "bobby", "K7M2-9QXA")
    await user.click(await screen.findByRole("button", { name: "Accept" }))
    expect(acceptIncoming).toHaveBeenCalledWith("user-b")
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("You and bobby are now friends"))
  })

  it("shows when you are already friends, with nothing to click", async () => {
    setup({ ...BOBBY, relationship: "friends" })
    await search(userEvent.setup(), "bobby", "K7M2-9QXA")
    expect(await screen.findByText(/already friends/i)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /send request|accept/i })).not.toBeInTheDocument()
  })

  it("shows the server's message when the search fails (for example, rate limiting)", async () => {
    const { user } = setup(new Error("Too many searches. Please try again in a while."))
    await search(user, "bobby", "K7M2-9QXA")
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Too many searches. Please try again in a while."))
  })

  it("shows the server's message when sending fails", async () => {
    const findUser = vi.fn(async () => BOBBY)
    const sendRequest = vi.fn(async () => {
      throw new Error("Choose a username in Settings first, so your friend can see who the request is from.")
    })
    render(<AddFriendForm findUser={findUser} sendRequest={sendRequest} acceptIncoming={vi.fn()} />)
    const user = userEvent.setup()
    await search(user, "bobby", "K7M2-9QXA")
    await user.click(await screen.findByRole("button", { name: /send request/i }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/Choose a username/)))
    // still offered again, since nothing was sent
    expect(screen.getByRole("button", { name: /send request/i })).toBeInTheDocument()
  })
})
