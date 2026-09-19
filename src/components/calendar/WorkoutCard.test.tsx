// @vitest-environment jsdom
import { DndContext } from "@dnd-kit/core"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { WorkoutCard } from "@/components/calendar/WorkoutCard"
import { SharedSessionsProvider } from "@/components/calendar/SharedSessionsContext"
import { ZoneGuideProvider } from "@/components/calendar/ZoneGuideContext"
import type { PlannedWorkout } from "@/hooks/usePlannedWorkouts"
import type { SessionMember } from "@/lib/friends/shared-session"
import { buildZoneGuide, type ZoneGuideInput } from "@/lib/utils/training-zones"

function workout(overrides: Partial<PlannedWorkout> = {}): PlannedWorkout {
  return {
    id: 1,
    user_id: "u1",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    target_date: "2026-09-22",
    discipline: "run",
    title: "Easy run",
    notes: null,
    planned_duration_minutes: 45,
    planned_distance_km: 8,
    target_zone: "z2",
    shared_session_id: null,
    ...overrides,
  }
}

function renderCard(props: Partial<React.ComponentProps<typeof WorkoutCard>> = {}, zones: boolean | ZoneGuideInput = false) {
  const card = (
    <DndContext>
      <WorkoutCard workout={workout()} {...props} />
    </DndContext>
  )
  return render(
    zones ? (
      <ZoneGuideProvider value={buildZoneGuide(zones === true ? { max_heart_rate: 190 } : zones)}>{card}</ZoneGuideProvider>
    ) : (
      card
    )
  )
}

describe("WorkoutCard", () => {
  it("shows title, duration and distance in km for a run", () => {
    renderCard()
    expect(screen.getByText("Easy run")).toBeInTheDocument()
    expect(screen.getByText(/45 min · 8 km/)).toBeInTheDocument()
  })

  it("shows swim distances in meters", () => {
    renderCard({ workout: workout({ discipline: "swim", planned_distance_km: 1.5, planned_duration_minutes: null }) })
    expect(screen.getByText("1500 m")).toBeInTheDocument()
  })

  it("shows the heart-rate range for the target zone once zones are known", () => {
    renderCard({}, true)
    expect(screen.getByText(/Z2 · Endurance/)).toBeInTheDocument()
    expect(screen.getByText("114–133 bpm")).toBeInTheDocument()
  })

  it("shows pace for a run and watts for a ride once those are set up", () => {
    const { unmount } = renderCard({}, { max_heart_rate: 190, run_threshold_pace_sec: 300 })
    expect(screen.getByText("5:42–6:27 /km")).toBeInTheDocument()
    expect(screen.queryByText(/bpm/)).not.toBeInTheDocument()
    unmount()
    renderCard({ workout: workout({ discipline: "bike", planned_distance_km: 40 }) }, { max_heart_rate: 190, ftp_watts: 250 })
    expect(screen.getByText("138–188 W")).toBeInTheDocument()
  })

  it("keeps showing heart rate for a sport without its own number", () => {
    renderCard({ workout: workout({ discipline: "bike" }) }, { max_heart_rate: 190, run_threshold_pace_sec: 300 })
    expect(screen.getByText("114–133 bpm")).toBeInTheDocument()
  })

  it("shows only the zone name when there is no heart-rate data", () => {
    renderCard()
    expect(screen.getByText(/Z2 · Endurance/)).toBeInTheDocument()
    expect(screen.queryByText(/bpm/)).not.toBeInTheDocument()
  })

  it("the check button marks the workout done without opening the card", async () => {
    const onClick = vi.fn()
    const onMarkDone = vi.fn()
    renderCard({ onClick, onMarkDone })
    await userEvent.setup().click(screen.getByRole("button", { name: "Mark done as planned" }))
    expect(onMarkDone).toHaveBeenCalledTimes(1)
    expect(onClick).not.toHaveBeenCalled()
  })

  it("a completed workout's check button removes the log", async () => {
    const onUnmarkDone = vi.fn()
    renderCard({ completed: true, onUnmarkDone, onMarkDone: vi.fn() })
    await userEvent.setup().click(screen.getByRole("button", { name: /tap to remove/i }))
    expect(onUnmarkDone).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("button", { name: "Mark done as planned" })).not.toBeInTheDocument()
  })

  it("Enter opens the card (Space is left for keyboard dragging)", () => {
    const onClick = vi.fn()
    renderCard({ onClick })
    const card = screen.getByText("Easy run").closest("[data-workout-card]") as HTMLElement
    fireEvent.keyDown(card, { key: "Enter", code: "Enter" })
    expect(onClick).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(card, { key: " ", code: "Space" })
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("exposes the card to keyboard users", () => {
    renderCard()
    const card = screen.getByText("Easy run").closest("[data-workout-card]") as HTMLElement
    expect(card).toHaveAttribute("tabindex", "0")
    expect(card).toHaveAttribute("role", "button")
  })
})

describe("WorkoutCard: shared sessions", () => {
  const member = (userId: string, username: string, o: Partial<SessionMember> = {}): SessionMember => ({
    userId,
    username,
    status: "accepted",
    completed: false,
    isMe: false,
    isCreator: false,
    ...o,
  })

  function renderShared(members: SessionMember[] | undefined, props: Partial<React.ComponentProps<typeof WorkoutCard>> = {}) {
    const map = members ? new Map([[5, members]]) : new Map<number, SessionMember[]>()
    return render(
      <SharedSessionsProvider value={map}>
        <DndContext>
          <WorkoutCard workout={workout({ shared_session_id: 5 })} {...props} />
        </DndContext>
      </SharedSessionsProvider>
    )
  }

  it("shows nothing extra on an ordinary workout", () => {
    renderCard()
    expect(screen.queryByText(/with /i)).not.toBeInTheDocument()
    expect(screen.queryByText("Shared session")).not.toBeInTheDocument()
  })

  it("shows who else is in the session and their answers", () => {
    renderShared([
      member("me", "yoni", { isMe: true, isCreator: true }),
      member("b", "bobby", { completed: true }),
      member("c", "carl", { status: "invited" }),
    ])
    expect(screen.getByText("With bobby ✓, carl (waiting)")).toBeInTheDocument()
  })

  it("shows Done together once you and a friend have both completed it", () => {
    renderShared([
      member("me", "yoni", { isMe: true, isCreator: true, completed: true }),
      member("b", "bobby", { completed: true }),
    ])
    expect(screen.getByText("Done together")).toBeInTheDocument()
  })

  it("does not claim Done together when only the friend has completed it", () => {
    renderShared([member("me", "yoni", { isMe: true, isCreator: true }), member("b", "bobby", { completed: true })])
    expect(screen.queryByText("Done together")).not.toBeInTheDocument()
    expect(screen.getByText("With bobby ✓")).toBeInTheDocument()
  })

  it("still marks a shared workout before the member list has loaded", () => {
    renderShared(undefined)
    expect(screen.getByText("Shared session")).toBeInTheDocument()
  })

  it("shows a small people icon in the compact (month) view", () => {
    renderShared([member("me", "yoni", { isMe: true }), member("b", "bobby")], { compact: true })
    expect(screen.getByLabelText("Shared session")).toBeInTheDocument()
    expect(screen.queryByText(/with bobby/i)).not.toBeInTheDocument()
  })
})
