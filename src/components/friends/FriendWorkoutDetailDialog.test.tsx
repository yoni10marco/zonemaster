// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { FriendWorkoutDetailDialog } from "@/components/friends/FriendWorkoutDetailDialog"
import type { FriendWorkout } from "@/hooks/useFriendsWorkouts"

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

function workout(overrides: Partial<FriendWorkout> = {}): FriendWorkout {
  return {
    workoutId: 1,
    ownerId: "friend-1",
    username: "alexa",
    target_date: "2026-10-05",
    title: null,
    notes: null,
    discipline: "run",
    planned_duration_minutes: 45,
    planned_distance_km: null,
    target_zone: "z2",
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

describe("FriendWorkoutDetailDialog", () => {
  it("shows the friend, date, discipline and zone label without a bpm/pace range", () => {
    render(<FriendWorkoutDetailDialog open workout={workout()} onOpenChange={vi.fn()} />)
    expect(screen.getByText(/alexa/)).toBeInTheDocument()
    expect(screen.getByText(/Monday, Oct 5/)).toBeInTheDocument()
    expect(screen.getByText(/45 min/)).toBeInTheDocument()
    expect(screen.getByText(/Z2 · Endurance/)).toBeInTheDocument()
    // Never a personalized bpm range for someone else's zone.
    expect(screen.queryByText(/bpm/)).not.toBeInTheDocument()
  })

  it("shows notes when present", () => {
    render(<FriendWorkoutDetailDialog open workout={workout({ notes: "easy pace, flat route" })} onOpenChange={vi.fn()} />)
    expect(screen.getByText("easy pace, flat route")).toBeInTheDocument()
  })

  it("lists every leg of a multi-sport workout", () => {
    render(
      <FriendWorkoutDetailDialog
        open
        workout={workout({
          title: "Brick workout",
          discipline: "bike",
          planned_duration_minutes: 60,
          extra_segments: [{ discipline: "run", planned_duration_minutes: 20 }],
        })}
        onOpenChange={vi.fn()}
      />
    )
    expect(screen.getByText("Bike")).toBeInTheDocument()
    expect(screen.getByText("Run")).toBeInTheDocument()
    expect(screen.getByText(/60 min/)).toBeInTheDocument()
    expect(screen.getByText(/20 min/)).toBeInTheDocument()
  })

  it("copies the workout to your calendar and disables further copies", async () => {
    render(<FriendWorkoutDetailDialog open workout={workout({ title: "Tempo run" })} onOpenChange={vi.fn()} />)
    const user = userEvent.setup()
    const button = screen.getByRole("button", { name: "Copy to your calendar" })
    await user.click(button)
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Added to your calendar"))
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "me", target_date: "2026-10-05", title: "Tempo run" })
    )
    expect(screen.getByRole("button", { name: "Added ✓" })).toBeDisabled()
  })

  it("shows the server's error instead of pretending it copied", async () => {
    insert.mockResolvedValue({ error: { message: "duplicate key" } })
    render(<FriendWorkoutDetailDialog open workout={workout()} onOpenChange={vi.fn()} />)
    await userEvent.setup().click(screen.getByRole("button", { name: "Copy to your calendar" }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("duplicate key"))
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Copy to your calendar" })).toBeEnabled()
  })

  it("closes via the footer Close button", async () => {
    const onOpenChange = vi.fn()
    render(<FriendWorkoutDetailDialog open workout={workout()} onOpenChange={onOpenChange} />)
    // The dialog also has its own "X" close button, whose accessible name is
    // the same "Close" — the footer one is the first of the two.
    await userEvent.setup().click(screen.getAllByRole("button", { name: "Close" })[0])
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
