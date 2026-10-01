// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SharedSessionsProvider } from "@/components/calendar/SharedSessionsContext"
import { WorkoutFormDialog } from "@/components/calendar/WorkoutFormDialog"
import type { PlannedWorkout } from "@/hooks/usePlannedWorkouts"
import type { SessionMember } from "@/lib/friends/shared-session"

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}))

vi.mock("@/hooks/useFriends", () => ({
  useFriends: () => ({
    friends: [
      { friendshipId: 1, userId: "b", username: "bobby", kind: "friend", createdAt: "" },
      { friendshipId: 2, userId: "c", username: "carl", kind: "friend", createdAt: "" },
    ],
  }),
}))

const createSharedSession = vi.fn()
const inviteToSharedSession = vi.fn()
const leaveSharedSession = vi.fn()
vi.mock("@/lib/friends/sessions", () => ({
  createSharedSession: (...args: unknown[]) => createSharedSession(...args),
  inviteToSharedSession: (...args: unknown[]) => inviteToSharedSession(...args),
  leaveSharedSession: (...args: unknown[]) => leaveSharedSession(...args),
}))

function workout(overrides: Partial<PlannedWorkout> = {}): PlannedWorkout {
  return {
    id: 12,
    user_id: "me",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    target_date: "2026-09-22",
    discipline: "run",
    title: "Easy run",
    notes: null,
    planned_duration_minutes: 45,
    planned_distance_km: null,
    target_zone: null,
    shared_session_id: null,
    extra_segments: null,
    ...overrides,
  }
}

const member = (userId: string, username: string, o: Partial<SessionMember> = {}): SessionMember => ({
  userId,
  username,
  status: "accepted",
  completed: false,
  isMe: false,
  isCreator: false,
  ...o,
})

const mutations = () => ({
  createWorkout: vi.fn(async () => ({ id: 99 })),
  createWorkouts: vi.fn(async () => []),
  updateWorkout: vi.fn(async () => ({})),
  deleteWorkout: vi.fn(async () => {}),
  deleteWorkouts: vi.fn(async () => {}),
})

function setup(props: Partial<React.ComponentProps<typeof WorkoutFormDialog>> = {}, members?: SessionMember[]) {
  const m = mutations()
  const onSharedChanged = vi.fn(async () => {})
  const onDeleted = vi.fn()
  const onOpenChange = vi.fn()
  const dialog = (
    <WorkoutFormDialog
      open
      onOpenChange={onOpenChange}
      targetDate="2026-09-22"
      mutations={m as never}
      onSharedChanged={onSharedChanged}
      onDeleted={onDeleted}
      {...props}
    />
  )
  render(members ? <SharedSessionsProvider value={new Map([[5, members]])}>{dialog}</SharedSessionsProvider> : dialog)
  return { m, onSharedChanged, onDeleted, onOpenChange, user: userEvent.setup() }
}

beforeEach(() => {
  toastSuccess.mockClear()
  toastError.mockClear()
  createSharedSession.mockReset().mockResolvedValue(1)
  inviteToSharedSession.mockReset().mockResolvedValue(undefined)
  leaveSharedSession.mockReset().mockResolvedValue(undefined)
})

describe("WorkoutFormDialog: does not double-submit", () => {
  // Resolves on demand, so a click mid-save can be simulated before the first save finishes.
  function deferred<T>() {
    let resolve!: (value: T) => void
    const promise = new Promise<T>((r) => (resolve = r))
    return { promise, resolve }
  }

  it("a second click while adding a workout does not create it twice", async () => {
    const saved = deferred<{ id: number }>()
    const { m, user } = setup()
    m.createWorkout.mockReturnValue(saved.promise)
    await user.type(screen.getByLabelText("Duration (min)"), "30")

    const button = screen.getByRole("button", { name: "Add workout" })
    await user.click(button)
    await user.click(button) // the accidental second tap
    expect(button).toBeDisabled()

    saved.resolve({ id: 99 })
    await waitFor(() => expect(m.createWorkout).toHaveBeenCalledTimes(1))
  })

  it("a second click while saving an edit does not update it twice", async () => {
    const saved = deferred<Record<string, never>>()
    const { m, user } = setup({ workout: workout() })
    m.updateWorkout.mockReturnValue(saved.promise)

    const button = screen.getByRole("button", { name: "Save changes" })
    await user.click(button)
    await user.click(button)
    expect(button).toBeDisabled()

    saved.resolve({})
    await waitFor(() => expect(m.updateWorkout).toHaveBeenCalledTimes(1))
  })

  it("a second click while deleting does not delete it twice", async () => {
    const deleted = deferred<void>()
    const { m, user } = setup({ workout: workout() })
    m.deleteWorkout.mockReturnValue(deleted.promise)

    const button = screen.getByRole("button", { name: "Delete" })
    await user.click(button)
    await user.click(button)
    expect(button).toBeDisabled()

    deleted.resolve()
    await waitFor(() => expect(m.deleteWorkout).toHaveBeenCalledTimes(1))
  })
})

describe("WorkoutFormDialog: adding a workout together with friends", () => {
  it("creates the workout, then invites the picked friends and refreshes the calendar", async () => {
    const { m, onSharedChanged, user } = setup()
    await user.type(screen.getByLabelText("Duration (min)"), "45")
    await user.click(screen.getByRole("checkbox", { name: "bobby" }))
    await user.click(screen.getByRole("button", { name: "Add workout" }))

    await waitFor(() => expect(createSharedSession).toHaveBeenCalledWith(99, ["b"]))
    expect(m.createWorkout).toHaveBeenCalledWith(expect.objectContaining({ planned_duration_minutes: 45, discipline: "run" }))
    expect(onSharedChanged).toHaveBeenCalled()
    expect(toastSuccess).toHaveBeenCalledWith("Workout added, 1 friend invited", expect.anything())
  })

  it("does not create a session when nobody is picked", async () => {
    const { m, user } = setup()
    await user.type(screen.getByLabelText("Duration (min)"), "30")
    await user.click(screen.getByRole("button", { name: "Add workout" }))
    await waitFor(() => expect(m.createWorkout).toHaveBeenCalled())
    expect(createSharedSession).not.toHaveBeenCalled()
    expect(toastSuccess).toHaveBeenCalledWith("Workout added", expect.anything())
  })

  it("turns off weekly repeat while friends are picked", async () => {
    const { user } = setup()
    const repeat = () => screen.getAllByRole("combobox").at(-1)!
    expect(repeat()).toBeEnabled()
    await user.click(screen.getByRole("checkbox", { name: "bobby" }))
    expect(repeat()).toBeDisabled()
    await user.click(screen.getByRole("checkbox", { name: "bobby" }))
    expect(repeat()).toBeEnabled()
  })

  it("keeps the new workout and explains when the invitation could not be sent", async () => {
    createSharedSession.mockRejectedValue(new Error("You can only invite your friends."))
    const { m, user } = setup()
    await user.type(screen.getByLabelText("Duration (min)"), "45")
    await user.click(screen.getByRole("checkbox", { name: "carl" }))
    await user.click(screen.getByRole("button", { name: "Add workout" }))

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("The invitation wasn't sent: You can only invite your friends."))
    expect(m.createWorkout).toHaveBeenCalledTimes(1)
    expect(toastSuccess).toHaveBeenCalledWith("Workout added", expect.anything())
  })
})

describe("WorkoutFormDialog: an existing workout", () => {
  it("invites friends to an ordinary workout without saving the form", async () => {
    const { m, onSharedChanged, user } = setup({ workout: workout() })
    await user.click(screen.getByRole("checkbox", { name: "bobby" }))
    await user.click(screen.getByRole("button", { name: /send invitation/i }))
    await waitFor(() => expect(createSharedSession).toHaveBeenCalledWith(12, ["b"]))
    expect(toastSuccess).toHaveBeenCalledWith("Invitation sent")
    expect(onSharedChanged).toHaveBeenCalled()
    expect(m.updateWorkout).not.toHaveBeenCalled()
  })

  it("invites more friends to a session you started", async () => {
    const members = [member("me", "yoni", { isMe: true, isCreator: true }), member("b", "bobby")]
    const { user } = setup({ workout: workout({ shared_session_id: 5 }) }, members)
    expect(screen.queryByRole("checkbox", { name: "bobby" })).not.toBeInTheDocument()
    await user.click(screen.getByRole("checkbox", { name: "carl" }))
    await user.click(screen.getByRole("button", { name: /send invitation/i }))
    await waitFor(() => expect(inviteToSharedSession).toHaveBeenCalledWith(5, ["c"]))
    expect(createSharedSession).not.toHaveBeenCalled()
  })

  it("shows the server's message when inviting fails, and does not refresh", async () => {
    inviteToSharedSession.mockRejectedValue(new Error("A session can have up to 8 people."))
    const members = [member("me", "yoni", { isMe: true, isCreator: true })]
    const { onSharedChanged, user } = setup({ workout: workout({ shared_session_id: 5 }) }, members)
    await user.click(screen.getByRole("checkbox", { name: "bobby" }))
    await user.click(screen.getByRole("button", { name: /send invitation/i }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("A session can have up to 8 people."))
    expect(onSharedChanged).not.toHaveBeenCalled()
  })

  it("leaves a session after confirming, and refreshes the calendar", async () => {
    const members = [member("b", "bobby", { isCreator: true }), member("me", "yoni", { isMe: true })]
    const { onSharedChanged, user } = setup({ workout: workout({ shared_session_id: 5 }) }, members)
    await user.click(screen.getByRole("button", { name: /leave this session/i }))
    await user.click(within(await screen.findByRole("dialog", { name: "Leave this session?" })).getByRole("button", { name: "Leave session" }))
    await waitFor(() => expect(leaveSharedSession).toHaveBeenCalledWith(5))
    expect(toastSuccess).toHaveBeenCalledWith("You left the shared session")
    expect(onSharedChanged).toHaveBeenCalled()
  })

  it("deleting your copy of a shared workout tells you it also leaves the session (no misleading undo)", async () => {
    const members = [member("me", "yoni", { isMe: true, isCreator: true }), member("b", "bobby")]
    const { m, onDeleted, user } = setup({ workout: workout({ shared_session_id: 5 }) }, members)
    await user.click(screen.getByRole("button", { name: "Delete" }))
    await waitFor(() => expect(m.deleteWorkout).toHaveBeenCalledWith(12))
    expect(toastSuccess).toHaveBeenCalledWith("Workout deleted, and you left the shared session")
    expect(onDeleted).not.toHaveBeenCalled()
  })

  it("deleting an ordinary workout still offers the usual undo", async () => {
    const { m, onDeleted, user } = setup({ workout: workout() })
    await user.click(screen.getByRole("button", { name: "Delete" }))
    await waitFor(() => expect(m.deleteWorkout).toHaveBeenCalledWith(12))
    expect(onDeleted).toHaveBeenCalledWith(expect.objectContaining({ id: 12 }))
  })
})

describe("WorkoutFormDialog: multi-sport (brick) workouts", () => {
  // A new leg defaults to "run", so these tests don't need to drive the
  // discipline Select (a Radix combobox the jsdom test environment here isn't
  // set up to click-interact with) — only the plain duration/distance inputs.
  it("adds a workout with an extra leg", async () => {
    const { m, user } = setup()
    await user.type(screen.getByLabelText("Duration (min)"), "60")
    await user.click(screen.getByRole("button", { name: "Add another sport" }))
    expect(screen.getByLabelText("Discipline for leg 2")).toHaveTextContent("Run")
    await user.type(screen.getByLabelText("Duration for leg 2"), "20")
    await user.click(screen.getByRole("button", { name: "Add workout" }))

    await waitFor(() => expect(m.createWorkout).toHaveBeenCalled())
    expect(m.createWorkout).toHaveBeenCalledWith(
      expect.objectContaining({
        planned_duration_minutes: 60,
        extra_segments: [{ discipline: "run", planned_duration_minutes: 20, planned_distance_km: null, target_zone: null }],
      })
    )
  })

  it("refuses to save a leg with neither duration nor distance, and explains why", async () => {
    const { m, user } = setup()
    await user.type(screen.getByLabelText("Duration (min)"), "60")
    await user.click(screen.getByRole("button", { name: "Add another sport" }))
    await user.click(screen.getByRole("button", { name: "Add workout" }))

    expect(screen.getByText(/enter a duration or a distance for this leg/i)).toBeInTheDocument()
    expect(m.createWorkout).not.toHaveBeenCalled()
  })

  it("removing a leg drops it from what gets saved", async () => {
    const { m, user } = setup()
    await user.type(screen.getByLabelText("Duration (min)"), "60")
    await user.click(screen.getByRole("button", { name: "Add another sport" }))
    await user.type(screen.getByLabelText("Duration for leg 2"), "20")
    await user.click(screen.getByRole("button", { name: "Remove leg 2" }))
    await user.click(screen.getByRole("button", { name: "Add workout" }))

    await waitFor(() => expect(m.createWorkout).toHaveBeenCalled())
    expect(m.createWorkout).toHaveBeenCalledWith(expect.objectContaining({ extra_segments: null }))
  })

  it("caps the number of extra legs at 4", async () => {
    const { user } = setup()
    await user.click(screen.getByRole("button", { name: "Add another sport" }))
    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole("button", { name: "Add another leg" }))
    }
    expect(screen.getByRole("button", { name: "Add another leg" })).toBeDisabled()
  })

  it("prefills the extra legs when editing an existing brick workout", async () => {
    const brick = workout({
      discipline: "bike",
      planned_duration_minutes: 60,
      extra_segments: [{ discipline: "run", planned_duration_minutes: 20, planned_distance_km: null, target_zone: "z3" }],
    })
    setup({ workout: brick })
    expect(await screen.findByLabelText("Discipline for leg 2")).toHaveTextContent("Run")
    expect(screen.getByLabelText("Duration for leg 2")).toHaveValue(20)
  })
})
