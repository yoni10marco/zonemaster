// @vitest-environment jsdom
import { DndContext } from "@dnd-kit/core"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { WorkoutCard } from "@/components/calendar/WorkoutCard"
import { ZoneRangesProvider } from "@/components/calendar/ZoneRangesContext"
import type { PlannedWorkout } from "@/hooks/usePlannedWorkouts"
import { computeZoneRanges } from "@/lib/utils/zones"

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
    ...overrides,
  }
}

function renderCard(props: Partial<React.ComponentProps<typeof WorkoutCard>> = {}, zones = false) {
  const card = (
    <DndContext>
      <WorkoutCard workout={workout()} {...props} />
    </DndContext>
  )
  return render(
    zones ? <ZoneRangesProvider value={computeZoneRanges(190)}>{card}</ZoneRangesProvider> : card
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
