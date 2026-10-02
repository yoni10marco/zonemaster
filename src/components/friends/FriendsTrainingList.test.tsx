// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { FriendsTrainingList } from "@/components/friends/FriendsTrainingList"
import type { FriendWorkout } from "@/hooks/useFriendsWorkouts"
import { addDaysISO, toISODate } from "@/lib/utils/dates"

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}))

const insert = vi.fn(async () => ({ error: null as { message: string } | null }))
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: "me" } } }) },
    from: () => ({ insert }),
  }),
}))

const TODAY = toISODate(new Date())

function workout(overrides: Partial<FriendWorkout> = {}): FriendWorkout {
  return {
    workoutId: 1,
    ownerId: "friend-1",
    username: "alexa",
    target_date: TODAY,
    title: null,
    notes: null,
    discipline: "run",
    planned_duration_minutes: 45,
    planned_distance_km: null,
    target_zone: null,
    extra_segments: null,
    ...overrides,
  }
}

beforeEach(() => {
  toastSuccess.mockClear()
  toastError.mockClear()
  insert.mockClear()
  insert.mockResolvedValue({ error: null })
})

describe("FriendsTrainingList", () => {
  it("shows a loading skeleton", () => {
    const { container } = render(<FriendsTrainingList workouts={[]} loading error={null} />)
    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()
  })

  it("shows the error message instead of pretending it loaded", () => {
    render(<FriendsTrainingList workouts={[]} loading={false} error="network down" />)
    expect(screen.getByRole("alert")).toHaveTextContent("network down")
  })

  it("shows an empty state when no friend has shared anything", () => {
    render(<FriendsTrainingList workouts={[]} loading={false} error={null} />)
    expect(screen.getByText(/no shared training/i)).toBeInTheDocument()
  })

  it("groups workouts by day, labeling today", () => {
    render(
      <FriendsTrainingList
        workouts={[workout({ username: "alexa" }), workout({ workoutId: 2, username: "bo", target_date: addDaysISO(TODAY, 2) })]}
        loading={false}
        error={null}
      />
    )
    expect(screen.getByText("Today")).toBeInTheDocument()
    expect(screen.getByText("alexa")).toBeInTheDocument()
    expect(screen.getByText("bo")).toBeInTheDocument()
  })

  it("falls back to 'Friend' when a username is missing", () => {
    render(<FriendsTrainingList workouts={[workout({ username: null })]} loading={false} error={null} />)
    expect(screen.getByText("Friend")).toBeInTheDocument()
  })

  it("opens the detail dialog on click and can copy to your calendar", async () => {
    render(
      <FriendsTrainingList
        workouts={[workout({ title: "Easy run", planned_duration_minutes: 30 })]}
        loading={false}
        error={null}
      />
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: /alexa.*Easy run/ }))
    const dialog = within(screen.getByRole("dialog"))
    expect(dialog.getByText("Easy run")).toBeInTheDocument()

    await user.click(dialog.getByRole("button", { name: "Copy to your calendar" }))
    await waitFor(() => expect(insert).toHaveBeenCalled())
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "me", target_date: TODAY, discipline: "run", title: "Easy run" })
    )
    expect(toastSuccess).toHaveBeenCalledWith("Added to your calendar")
  })
})
