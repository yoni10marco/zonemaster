// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { TogetherSection, type FriendChoice } from "@/components/friends/TogetherSection"
import type { SessionMember } from "@/lib/friends/shared-session"

const FRIENDS: FriendChoice[] = [
  { userId: "b", username: "bobby" },
  { userId: "c", username: "carl" },
  { userId: "d", username: "dora" },
]

function member(userId: string, username: string, overrides: Partial<SessionMember> = {}): SessionMember {
  return { userId, username, status: "accepted", completed: false, isMe: false, isCreator: false, ...overrides }
}
const ME = (overrides: Partial<SessionMember> = {}) => member("me", "yoni", { isMe: true, isCreator: true, ...overrides })

type Props = React.ComponentProps<typeof TogetherSection>
function setup(props: Partial<Props> = {}) {
  const onSelectedChange = vi.fn()
  const onInvite = vi.fn(async () => {})
  const onLeave = vi.fn(async () => {})
  const base: Props = { friends: FRIENDS, isEditing: false, selected: [], onSelectedChange, onInvite, onLeave }
  const view = render(<TogetherSection {...base} {...props} />)
  return { onSelectedChange, onInvite, onLeave, user: userEvent.setup(), ...view }
}

describe("TogetherSection: a new workout", () => {
  it("points to the Friends page when you have no friends", () => {
    setup({ friends: [] })
    expect(screen.getByRole("link", { name: "Add friends" })).toHaveAttribute("href", "/friends")
  })

  it("lets you pick friends, and explains they are invited when you add the workout", async () => {
    const { user, onSelectedChange, rerender } = setup()
    await user.click(screen.getByRole("checkbox", { name: "bobby" }))
    expect(onSelectedChange).toHaveBeenCalledWith(["b"])
    rerender(<TogetherSection friends={FRIENDS} isEditing={false} selected={["b", "c"]} onSelectedChange={onSelectedChange} />)
    expect(screen.getByText(/2 friends will be invited when you add the workout/i)).toBeInTheDocument()
    expect(screen.getByText(/can't also repeat weekly/i)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /send invitation/i })).not.toBeInTheDocument()
  })

  it("unticks a picked friend", async () => {
    const { user, onSelectedChange } = setup({ selected: ["b", "c"] })
    await user.click(screen.getByRole("checkbox", { name: "bobby" }))
    expect(onSelectedChange).toHaveBeenCalledWith(["c"])
  })

  it("stops offering friends once the session is full (8 people including you)", () => {
    const many: FriendChoice[] = Array.from({ length: 9 }, (_, i) => ({ userId: `f${i}`, username: `friend${i}` }))
    setup({ friends: many, selected: many.slice(0, 7).map((f) => f.userId) })
    expect(screen.getByRole("checkbox", { name: "friend7" })).toBeDisabled()
    expect(screen.getByRole("checkbox", { name: "friend0" })).toBeEnabled() // already picked, can untick
    expect(screen.getByText(/up to 8 people/i)).toBeInTheDocument()
  })
})

describe("TogetherSection: an existing workout that is not shared yet", () => {
  it("sends the invitation on request, only once someone is picked", async () => {
    const { user, onInvite, rerender, onSelectedChange } = setup({ isEditing: true })
    expect(screen.getByRole("button", { name: /send invitation/i })).toBeDisabled()
    rerender(
      <TogetherSection friends={FRIENDS} isEditing selected={["c"]} onSelectedChange={onSelectedChange} onInvite={onInvite} />
    )
    await user.click(screen.getByRole("button", { name: /send invitation/i }))
    expect(onInvite).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("button", { name: /leave this session/i })).not.toBeInTheDocument()
  })
})

describe("TogetherSection: a shared session you started", () => {
  const members = [
    ME(),
    member("b", "bobby", { completed: true }),
    member("c", "carl", { status: "invited" }),
    member("d", "dora", { status: "declined" }),
  ]

  it("shows who is in it and what they answered", () => {
    setup({ isEditing: true, members })
    const list = screen.getByRole("list")
    expect(within(list).getByText("You started this")).toBeInTheDocument()
    expect(within(list).getByText("Going, done ✓")).toBeInTheDocument()
    expect(within(list).getByText("Waiting to answer")).toBeInTheDocument()
    expect(within(list).getByText("Declined")).toBeInTheDocument()
  })

  it("only offers friends who are not already in it, and lets you invite someone who declined again", () => {
    setup({ isEditing: true, members })
    expect(screen.getByText("Invite more friends")).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: "dora" })).toBeInTheDocument() // declined: can be re-invited
    expect(screen.queryByRole("checkbox", { name: "bobby" })).not.toBeInTheDocument()
    expect(screen.queryByRole("checkbox", { name: "carl" })).not.toBeInTheDocument()
  })

  it("says so when every friend is already in the session", () => {
    setup({
      isEditing: true,
      members: [ME(), member("b", "bobby"), member("c", "carl"), member("d", "dora")],
    })
    expect(screen.getByText(/all your friends are already in this session/i)).toBeInTheDocument()
  })
})

describe("TogetherSection: a session someone else started", () => {
  const members = [member("b", "bobby", { isCreator: true }), ME({ isCreator: false })]

  it("does not offer invitations, and says who can", () => {
    setup({ isEditing: true, members })
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
    expect(screen.getByText(/only bobby can invite more friends/i)).toBeInTheDocument()
  })

  it("asks before leaving, explaining what happens to your copy", async () => {
    const { user, onLeave } = setup({ isEditing: true, members })
    await user.click(screen.getByRole("button", { name: /leave this session/i }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText(/stays on your calendar as an ordinary workout/i)).toBeInTheDocument()
    expect(onLeave).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole("button", { name: "Leave session" }))
    await waitFor(() => expect(onLeave).toHaveBeenCalledTimes(1))
  })

  it("cancelling the confirmation keeps you in the session", async () => {
    const { user, onLeave } = setup({ isEditing: true, members })
    await user.click(screen.getByRole("button", { name: /leave this session/i }))
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancel" }))
    expect(onLeave).not.toHaveBeenCalled()
  })
})
