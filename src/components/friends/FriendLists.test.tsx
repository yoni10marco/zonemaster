// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { FriendsList, RequestsList } from "@/components/friends/FriendLists"
import type { Friendship } from "@/hooks/useFriends"
import type { FriendWorkout } from "@/hooks/useFriendsWorkouts"

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}))

function person(id: number, username: string | null, kind: Friendship["kind"]): Friendship {
  return { friendshipId: id, userId: `user-${id}`, username, kind, createdAt: "2026-09-19T10:00:00Z" }
}

function workout(ownerId: string, overrides: Partial<FriendWorkout> = {}): FriendWorkout {
  return {
    workoutId: 1,
    ownerId,
    username: "bobby",
    target_date: "2026-10-05",
    title: "Easy run",
    notes: null,
    discipline: "run",
    planned_duration_minutes: 30,
    planned_distance_km: null,
    target_zone: null,
    extra_segments: null,
    ...overrides,
  }
}

beforeEach(() => {
  toastSuccess.mockClear()
  toastError.mockClear()
})

describe("FriendsList", () => {
  const handlers = () => ({
    workouts: [],
    onRemove: vi.fn(async () => {}),
    onBlock: vi.fn(async () => {}),
    onUnblock: vi.fn(async () => {}),
  })

  it("explains how to add friends when there are none", () => {
    render(<FriendsList friends={[]} blocked={[]} {...handlers()} />)
    expect(screen.getByText(/no friends yet/i)).toBeInTheDocument()
    expect(screen.getByText(/add friend/i)).toBeInTheDocument()
  })

  it("lists friends by username", () => {
    render(<FriendsList friends={[person(1, "bobby", "friend"), person(2, "dora", "friend")]} blocked={[]} {...handlers()} />)
    expect(screen.getByText("bobby")).toBeInTheDocument()
    expect(screen.getByText("dora")).toBeInTheDocument()
  })

  it("only shows a Training entry for friends who have shared something this week", () => {
    render(
      <FriendsList
        friends={[person(1, "bobby", "friend"), person(2, "dora", "friend")]}
        blocked={[]}
        {...{ ...handlers(), workouts: [workout("user-1")] }}
      />
    )
    expect(screen.getByRole("button", { name: /view bobby's planned training/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /view dora's planned training/i })).not.toBeInTheDocument()
  })

  it("opens a friend's training in a dialog scoped to just them", async () => {
    render(
      <FriendsList
        friends={[person(1, "bobby", "friend"), person(2, "dora", "friend")]}
        blocked={[]}
        {...{
          ...handlers(),
          workouts: [
            workout("user-1", { workoutId: 1, title: "Easy run" }),
            workout("user-2", { workoutId: 2, username: "dora", title: "Long ride" }),
          ],
        }}
      />
    )
    await userEvent.setup().click(screen.getByRole("button", { name: /view bobby's planned training/i }))
    const dialog = within(await screen.findByRole("dialog"))
    expect(dialog.getByText("bobby's training")).toBeInTheDocument()
    expect(dialog.getByText("Easy run")).toBeInTheDocument()
    expect(dialog.queryByText("Long ride")).not.toBeInTheDocument()
  })

  it("asks before unfriending, and does nothing if you cancel", async () => {
    const h = handlers()
    render(<FriendsList friends={[person(1, "bobby", "friend")]} blocked={[]} {...h} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: /remove bobby from friends/i }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("Unfriend bobby?")).toBeInTheDocument()
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }))
    expect(h.onRemove).not.toHaveBeenCalled()
  })

  it("unfriends after confirming", async () => {
    const h = handlers()
    render(<FriendsList friends={[person(1, "bobby", "friend")]} blocked={[]} {...h} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: /remove bobby from friends/i }))
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Unfriend" }))
    await waitFor(() => expect(h.onRemove).toHaveBeenCalledWith("user-1"))
    expect(toastSuccess).toHaveBeenCalledWith("bobby was removed from your friends")
  })

  it("blocks after confirming, explaining what blocking does", async () => {
    const h = handlers()
    render(<FriendsList friends={[person(1, "bobby", "friend")]} blocked={[]} {...h} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: /block bobby/i }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText(/won't be able to find you/i)).toBeInTheDocument()
    await user.click(within(dialog).getByRole("button", { name: "Block" }))
    await waitFor(() => expect(h.onBlock).toHaveBeenCalledWith("user-1"))
  })

  it("keeps the dialog open and shows the error if the action fails", async () => {
    const h = { ...handlers(), onRemove: vi.fn(async () => { throw new Error("Network trouble") }) }
    render(<FriendsList friends={[person(1, "bobby", "friend")]} blocked={[]} {...h} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: /remove bobby from friends/i }))
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Unfriend" }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Network trouble"))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("shows blocked people separately, with an Unblock button", async () => {
    const h = handlers()
    render(<FriendsList friends={[]} blocked={[person(3, "troll", "blocked")]} {...h} />)
    expect(screen.getByText("Blocked")).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole("button", { name: "Unblock" }))
    expect(h.onUnblock).toHaveBeenCalledWith("user-3")
  })
})

describe("RequestsList", () => {
  it("shows an empty state", () => {
    render(<RequestsList incoming={[]} outgoing={[]} onRespond={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText("No pending requests.")).toBeInTheDocument()
  })

  it("accepts and declines incoming requests", async () => {
    const onRespond = vi.fn(async () => {})
    render(
      <RequestsList
        incoming={[person(5, "alexa", "incoming"), person(6, "carl", "incoming")]}
        outgoing={[]}
        onRespond={onRespond}
        onCancel={vi.fn()}
      />
    )
    const user = userEvent.setup()
    const [accept] = screen.getAllByRole("button", { name: "Accept" })
    await user.click(accept)
    expect(onRespond).toHaveBeenCalledWith(5, true)
    const [, decline] = screen.getAllByRole("button", { name: "Decline" })
    await user.click(decline)
    expect(onRespond).toHaveBeenCalledWith(6, false)
  })

  it("cancels a request you sent", async () => {
    const onCancel = vi.fn(async () => {})
    render(<RequestsList incoming={[]} outgoing={[person(7, "dora", "outgoing")]} onRespond={vi.fn()} onCancel={onCancel} />)
    expect(screen.getByText("Waiting for them to accept")).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole("button", { name: "Cancel" }))
    expect(onCancel).toHaveBeenCalledWith(7)
  })

  it("shows the server's message if accepting fails", async () => {
    const onRespond = vi.fn(async () => {
      throw new Error("That request is no longer available.")
    })
    render(<RequestsList incoming={[person(5, "alexa", "incoming")]} outgoing={[]} onRespond={onRespond} onCancel={vi.fn()} />)
    await userEvent.setup().click(screen.getByRole("button", { name: "Accept" }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("That request is no longer available."))
  })
})
