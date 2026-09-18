"use client"

import { useMemo, useState } from "react"
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { CalendarPlus, CalendarX2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WeekView } from "@/components/calendar/WeekView"
import { MonthView } from "@/components/calendar/MonthView"
import { TOUCH_DRAG_DELAY_MS, WorkoutCard } from "@/components/calendar/WorkoutCard"
import { WorkoutFormDialog } from "@/components/calendar/WorkoutFormDialog"
import { CompletionFormDialog } from "@/components/calendar/CompletionFormDialog"
import { usePlannedWorkouts, type PlannedWorkout } from "@/hooks/usePlannedWorkouts"
import { useCompletedWorkouts, type CompletedWorkout } from "@/hooks/useCompletedWorkouts"
import {
  format,
  monthRange,
  nextAnchor,
  prevAnchor,
  toISODate,
  weekRange,
} from "@/lib/utils/dates"

type CalendarView = "week" | "month"

export default function CalendarPage() {
  const [view, setView] = useState<CalendarView>("week")
  const [anchor, setAnchor] = useState(new Date())
  const [activeDragId, setActiveDragId] = useState<number | null>(null)

  // Mouse: drag after moving a few pixels, so a plain click still opens the
  // card. Touch: drag only after a short press-and-hold, otherwise the
  // browser owns the gesture and the calendar scrolls normally. (A single
  // PointerSensor can't do both: on touch it needs `touch-action: none`,
  // which would make every card block page scrolling.)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: TOUCH_DRAG_DELAY_MS, tolerance: 8 },
    })
  )

  const range = useMemo(
    () => (view === "week" ? weekRange(anchor) : monthRange(anchor)),
    [view, anchor]
  )

  const {
    workouts,
    loading,
    createWorkout,
    updateWorkout,
    deleteWorkout,
    rescheduleWorkout,
  } = usePlannedWorkouts(range.start, range.end)

  const { completions, logCompletion, updateCompletion, deleteCompletion, findLinkCandidate } =
    useCompletedWorkouts(range.start, range.end)

  const workoutsByDate = useMemo(() => {
    const map = new Map<string, PlannedWorkout[]>()
    for (const workout of workouts) {
      const list = map.get(workout.target_date) ?? []
      list.push(workout)
      map.set(workout.target_date, list)
    }
    return map
  }, [workouts])

  // A planned workout has at most one completion (enforced in the DB) — this
  // map is how "already completed, edit instead of re-logging" is detected.
  const completionByPlannedId = useMemo(() => {
    const map = new Map<number, CompletedWorkout>()
    for (const c of completions) {
      if (c.planned_workout_id !== null) map.set(c.planned_workout_id, c)
    }
    return map
  }, [completions])

  const completedWorkoutIds = useMemo(
    () => new Set(completionByPlannedId.keys()),
    [completionByPlannedId]
  )

  const [dialogState, setDialogState] = useState<
    | { type: "workout"; date: string; workout: PlannedWorkout | null }
    | {
        type: "completion"
        date: string
        workout: PlannedWorkout | null
        existingCompletion: CompletedWorkout | null
      }
    | null
  >(null)

  function handleAdd(dateISO: string) {
    setDialogState({ type: "workout", date: dateISO, workout: null })
  }

  function handleWorkoutClick(workout: PlannedWorkout) {
    setDialogState({ type: "workout", date: workout.target_date, workout })
  }

  async function handleMarkDone(workout: PlannedWorkout) {
    if (completionByPlannedId.has(workout.id)) return // already completed
    try {
      await logCompletion({
        planned_workout_id: workout.id,
        execution_date: workout.target_date,
        discipline: workout.discipline,
        actual_duration_minutes: workout.planned_duration_minutes,
        actual_distance_km: workout.planned_distance_km,
        rpe: null,
        notes: null,
        source: "manual",
      })
      toast.success("Marked as done")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark done")
    }
  }

  async function handleUnmarkDone(workout: PlannedWorkout) {
    const completion = completionByPlannedId.get(workout.id)
    if (!completion) return
    try {
      await deleteCompletion(completion.id)
      toast.success("Removed")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove")
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.data.current?.workoutId as number | undefined
    setActiveDragId(id ?? null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null)
    const { active, over } = event
    if (!over) return

    const workoutId = active.data.current?.workoutId as number | undefined
    const newDate = over.data.current?.dateISO as string | undefined
    if (!workoutId || !newDate) return

    const workout = workouts.find((w) => w.id === workoutId)
    if (!workout || workout.target_date === newDate) return

    try {
      await rescheduleWorkout(workoutId, newDate)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reschedule")
    }
  }

  const activeWorkout = workouts.find((w) => w.id === activeDragId) ?? null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAnchor(prevAnchor(anchor, view))}>
            Prev
          </Button>
          <h1 className="font-heading min-w-28 text-center text-sm font-semibold sm:min-w-40 sm:text-lg">
            {view === "week"
              ? `${format(range.start, "MMM d")} – ${format(range.end, "MMM d, yyyy")}`
              : format(anchor, "MMMM yyyy")}
          </h1>
          <Button variant="outline" size="sm" onClick={() => setAnchor(nextAnchor(anchor, view))}>
            Next
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAnchor(new Date())}>
            Today
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setDialogState({
                type: "completion",
                date: toISODate(new Date()),
                workout: null,
                existingCompletion: null,
              })
            }
          >
            <CalendarPlus className="size-4" />
            Log a workout
          </Button>
          <Tabs value={view} onValueChange={(v) => setView(v as CalendarView)}>
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveDragId(null)}
        >
          {view === "week" ? (
            <WeekView
              days={range.days}
              workoutsByDate={workoutsByDate}
              completedWorkoutIds={completedWorkoutIds}
              onAdd={handleAdd}
              onWorkoutClick={handleWorkoutClick}
              onMarkDone={handleMarkDone}
              onUnmarkDone={handleUnmarkDone}
            />
          ) : (
            <MonthView
              days={range.days}
              anchor={anchor}
              workoutsByDate={workoutsByDate}
              completedWorkoutIds={completedWorkoutIds}
              onAdd={handleAdd}
              onWorkoutClick={handleWorkoutClick}
              onMarkDone={handleMarkDone}
              onUnmarkDone={handleUnmarkDone}
            />
          )}
          <DragOverlay>
            {activeWorkout && <WorkoutCard workout={activeWorkout} />}
          </DragOverlay>
        </DndContext>
      )}

      {workouts.length === 0 && !loading && (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
          <CalendarX2 className="size-8 text-muted-foreground/50" />
          No workouts yet &mdash; click the + on any day to add your first one.
        </div>
      )}

      {dialogState?.type === "workout" && (
        <WorkoutFormDialog
          open
          onOpenChange={(open) => !open && setDialogState(null)}
          targetDate={dialogState.date}
          workout={dialogState.workout}
          existingCompletion={
            dialogState.workout ? (completionByPlannedId.get(dialogState.workout.id) ?? null) : null
          }
          mutations={{ createWorkout, updateWorkout, deleteWorkout }}
          onLogCompletion={(workout, existingCompletion) =>
            setDialogState({ type: "completion", date: workout.target_date, workout, existingCompletion })
          }
        />
      )}

      {dialogState?.type === "completion" && (
        <CompletionFormDialog
          open
          onOpenChange={(open) => !open && setDialogState(null)}
          plannedWorkout={dialogState.workout}
          existingCompletion={dialogState.existingCompletion}
          defaultDate={dialogState.date}
          logCompletion={logCompletion}
          updateCompletion={updateCompletion}
          deleteCompletion={deleteCompletion}
          findLinkCandidate={findLinkCandidate}
        />
      )}
    </div>
  )
}
