"use client"

import { useRef } from "react"
import { useDroppable } from "@dnd-kit/core"
import { Plus } from "lucide-react"
import { isToday } from "date-fns"

import { Button } from "@/components/ui/button"
import { WorkoutCard } from "@/components/calendar/WorkoutCard"
import type { PlannedWorkout } from "@/hooks/usePlannedWorkouts"
import { toISODate } from "@/lib/utils/dates"
import { cn } from "@/lib/utils"

// Movement threshold below which a pointerdown/pointerup pair counts as a
// tap rather than a drag/scroll — mirrors WorkoutCard's own click detection.
const CLICK_MOVEMENT_THRESHOLD_PX = 5

type DayColumnProps = {
  date: Date
  workouts: PlannedWorkout[]
  completedWorkoutIds: Set<number>
  onAdd: (dateISO: string) => void
  onWorkoutClick: (workout: PlannedWorkout) => void
  onMarkDone: (workout: PlannedWorkout) => void
  onUnmarkDone: (workout: PlannedWorkout) => void
  compact?: boolean
  dimmed?: boolean
}

export function DayColumn({
  date,
  workouts,
  completedWorkoutIds,
  onAdd,
  onWorkoutClick,
  onMarkDone,
  onUnmarkDone,
  compact,
  dimmed,
}: DayColumnProps) {
  const dateISO = toISODate(date)
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dateISO}`,
    // `label` is read aloud by screen readers during keyboard dragging.
    data: { dateISO, label: date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) },
  })
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null)

  // Training days get a visible tint so a glance at the grid shows load —
  // stronger for more sessions, capped at 3+ rather than growing unbounded.
  const trainingIntensity =
    workouts.length >= 3
      ? "border-primary/40 bg-primary/20"
      : workouts.length === 2
        ? "border-primary/30 bg-primary/14"
        : workouts.length === 1
          ? "border-primary/20 bg-primary/8"
          : ""

  return (
    <div
      ref={setNodeRef}
      // Clicking anywhere on the day (not just the "+" button) starts a new
      // workout. This uses manual pointerdown/pointerup click detection
      // instead of a native onClick: on touch devices, opening the dialog
      // synchronously from a click leaves the browser's follow-up
      // synthetic mouse/click compat events (dispatched via a fresh
      // elementFromPoint hit-test) to land on whatever is now under that
      // same screen position — the just-opened dialog. Calling
      // preventDefault() on pointerup — once we know it was a stationary
      // tap, not a scroll/drag — suppresses that trailing synthetic click.
      // (Doing it on pointerdown instead would risk swallowing the start of
      // a native scroll gesture.) Taps starting on a WorkoutCard or the "+"
      // button are skipped here so they keep handling their own click.
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("[data-workout-card], button")) {
          pointerDownPos.current = null
          return
        }
        pointerDownPos.current = { x: e.clientX, y: e.clientY }
      }}
      onPointerUp={(e) => {
        const start = pointerDownPos.current
        pointerDownPos.current = null
        if (!start) return
        const dx = Math.abs(e.clientX - start.x)
        const dy = Math.abs(e.clientY - start.y)
        if (dx < CLICK_MOVEMENT_THRESHOLD_PX && dy < CLICK_MOVEMENT_THRESHOLD_PX) {
          e.preventDefault()
          onAdd(dateISO)
        }
      }}
      className={cn(
        "flex min-w-0 cursor-pointer flex-col gap-1 rounded-md border p-1 sm:p-1.5",
        compact ? "min-h-16 sm:min-h-24" : "min-h-32",
        trainingIntensity,
        isOver && "border-primary bg-primary/5",
        dimmed && "opacity-50"
      )}
    >
      <div className="flex min-w-0 items-center justify-between px-0.5">
        <span
          className={cn(
            "truncate text-xs font-medium text-muted-foreground",
            isToday(date) && "text-primary"
          )}
        >
          {compact
            ? `${date.getDate()} ${date.toLocaleDateString("en-US", { weekday: "narrow" })}`
            : `${date.toLocaleDateString("en-US", { weekday: "short" })} ${date.getDate()}`}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={(e) => {
            e.stopPropagation()
            onAdd(dateISO)
          }}
          aria-label="Add workout"
          // Month-view cells are too narrow on phones to fit a date number
          // and a tap target side by side — the whole cell is clickable
          // (see the div's onClick above), so the button is redundant there.
          className={cn(compact && "hidden sm:inline-flex")}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {workouts.map((workout) => (
          <WorkoutCard
            key={workout.id}
            workout={workout}
            completed={completedWorkoutIds.has(workout.id)}
            onClick={() => onWorkoutClick(workout)}
            onMarkDone={() => onMarkDone(workout)}
            onUnmarkDone={() => onUnmarkDone(workout)}
            compact={compact}
          />
        ))}
      </div>
    </div>
  )
}
