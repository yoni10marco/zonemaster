"use client"

import { useDroppable } from "@dnd-kit/core"
import { Plus } from "lucide-react"
import { isToday } from "date-fns"

import { Button } from "@/components/ui/button"
import { WorkoutCard } from "@/components/calendar/WorkoutCard"
import type { PlannedWorkout } from "@/hooks/usePlannedWorkouts"
import { toISODate } from "@/lib/utils/dates"
import { cn } from "@/lib/utils"

type DayColumnProps = {
  date: Date
  workouts: PlannedWorkout[]
  completedWorkoutIds: Set<number>
  onAdd: (dateISO: string) => void
  onWorkoutClick: (workout: PlannedWorkout) => void
  compact?: boolean
  dimmed?: boolean
}

export function DayColumn({
  date,
  workouts,
  completedWorkoutIds,
  onAdd,
  onWorkoutClick,
  compact,
  dimmed,
}: DayColumnProps) {
  const dateISO = toISODate(date)
  const { setNodeRef, isOver } = useDroppable({ id: `day-${dateISO}`, data: { dateISO } })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-32 flex-col gap-1 rounded-md border p-1.5",
        isOver && "border-primary bg-primary/5",
        dimmed && "opacity-50"
      )}
    >
      <div className="flex items-center justify-between px-0.5">
        <span
          className={cn(
            "text-xs font-medium text-muted-foreground",
            isToday(date) && "text-primary"
          )}
        >
          {compact ? date.getDate() : `${date.toLocaleDateString("en-US", { weekday: "short" })} ${date.getDate()}`}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => onAdd(dateISO)}
          aria-label="Add workout"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
      <div className="flex flex-1 flex-col gap-1">
        {workouts.map((workout) => (
          <WorkoutCard
            key={workout.id}
            workout={workout}
            completed={completedWorkoutIds.has(workout.id)}
            onClick={() => onWorkoutClick(workout)}
          />
        ))}
      </div>
    </div>
  )
}
