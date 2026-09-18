"use client"

import { DayColumn } from "@/components/calendar/DayColumn"
import type { PlannedWorkout } from "@/hooks/usePlannedWorkouts"
import { toISODate } from "@/lib/utils/dates"

type WeekViewProps = {
  days: Date[]
  workoutsByDate: Map<string, PlannedWorkout[]>
  completedWorkoutIds: Set<number>
  onAdd: (dateISO: string) => void
  onWorkoutClick: (workout: PlannedWorkout) => void
  onMarkDone: (workout: PlannedWorkout) => void
}

export function WeekView({
  days,
  workoutsByDate,
  completedWorkoutIds,
  onAdd,
  onWorkoutClick,
  onMarkDone,
}: WeekViewProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
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
          />
        )
      })}
    </div>
  )
}
