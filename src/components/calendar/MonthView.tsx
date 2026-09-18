"use client"

import { DayColumn } from "@/components/calendar/DayColumn"
import type { PlannedWorkout } from "@/hooks/usePlannedWorkouts"
import { toISODate } from "@/lib/utils/dates"

type MonthViewProps = {
  days: Date[]
  anchor: Date
  workoutsByDate: Map<string, PlannedWorkout[]>
  completedWorkoutIds: Set<number>
  onAdd: (dateISO: string) => void
  onWorkoutClick: (workout: PlannedWorkout) => void
  onMarkDone: (workout: PlannedWorkout) => void
  onUnmarkDone: (workout: PlannedWorkout) => void
}

export function MonthView({
  days,
  anchor,
  workoutsByDate,
  completedWorkoutIds,
  onAdd,
  onWorkoutClick,
  onMarkDone,
  onUnmarkDone,
}: MonthViewProps) {
  return (
    <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
      {days.map((day) => {
        const dateISO = toISODate(day)
        return (
          <DayColumn
            key={dateISO}
            date={day}
            workouts={workoutsByDate.get(dateISO) ?? []}
            completedWorkoutIds={completedWorkoutIds}
            onAdd={onAdd}
            onWorkoutClick={onWorkoutClick}
            onMarkDone={onMarkDone}
            onUnmarkDone={onUnmarkDone}
            compact
            dimmed={day.getMonth() !== anchor.getMonth()}
          />
        )
      })}
    </div>
  )
}
