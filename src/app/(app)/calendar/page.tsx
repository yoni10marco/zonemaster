"use client"

import { useMemo, useState } from "react"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { subWeeks } from "date-fns"
import { CalendarX2, CopyPlus, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WeekView } from "@/components/calendar/WeekView"
import { MonthView } from "@/components/calendar/MonthView"
import { TOUCH_DRAG_DELAY_MS, WorkoutCard } from "@/components/calendar/WorkoutCard"
import { SharedSessionsProvider } from "@/components/calendar/SharedSessionsContext"
import { ImportActivityDialog } from "@/components/calendar/ImportActivityDialog"
import { WorkoutFormDialog } from "@/components/calendar/WorkoutFormDialog"
import { ZoneGuideProvider } from "@/components/calendar/ZoneGuideContext"
import { usePlannedWorkouts, type PlannedWorkout } from "@/hooks/usePlannedWorkouts"
import { useCompletedWorkouts, type CompletedWorkout } from "@/hooks/useCompletedWorkouts"
import { useProfile } from "@/hooks/useProfile"
import { useSharedSessions } from "@/hooks/useSharedSessions"
import {
  format,
  monthRange,
  nextAnchor,
  prevAnchor,
  toISODate,
  weekRange,
} from "@/lib/utils/dates"
import {
  dayKeyboardCoordinates,
  dndAnnouncements,
  dndScreenReaderInstructions,
} from "@/lib/utils/dnd-keyboard"
import { copyFields } from "@/lib/utils/repeat"

type CalendarView = "week" | "month"

type DialogState = {
  date: string
  workout: PlannedWorkout | null
  /** Set when duplicating: the new workout starts as a copy of this one. */
  prefill?: PlannedWorkout | null
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

export default function CalendarPage() {
  const [view, setView] = useState<CalendarView>("week")
  const [anchor, setAnchor] = useState(new Date())
  const [activeDragId, setActiveDragId] = useState<number | null>(null)
  const [copying, setCopying] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  // Mouse: drag after moving a few pixels, so a plain click still opens the
  // card. Touch: drag only after a short press-and-hold, otherwise the
  // browser owns the gesture and the calendar scrolls normally. (A single
  // PointerSensor can't do both: on touch it needs `touch-action: none`,
  // which would make every card block page scrolling.) Keyboard: Space picks a
  // card up and the arrow keys jump between days; Enter is left free so it can
  // still open the card.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: TOUCH_DRAG_DELAY_MS, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: dayKeyboardCoordinates,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    })
  )

  const range = useMemo(
    () => (view === "week" ? weekRange(anchor) : monthRange(anchor)),
    [view, anchor]
  )

  const {
    workouts,
    loading,
    refetch: refetchWorkouts,
    createWorkout,
    createWorkouts,
    copyWeek,
    updateWorkout,
    deleteWorkout,
    deleteWorkouts,
    rescheduleWorkout,
  } = usePlannedWorkouts(range.start, range.end)

  const { completions, logCompletion, relinkCompletion, deleteCompletion, refetch: refetchCompletions } = useCompletedWorkouts(
    range.start,
    range.end
  )

  const { zoneGuide } = useProfile()

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
  // map is how "already completed" is detected.
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

  // Who else is in the shared sessions on this page. Reloaded when a workout is
  // ticked done (that changes who has completed it).
  const sharedIds = workouts.flatMap((w) => (w.shared_session_id === null ? [] : [w.shared_session_id]))
  const completedKey = [...completedWorkoutIds].sort((a, b) => a - b).join(",")
  const { members: sharedMembers, refetch: refetchShared } = useSharedSessions(sharedIds, completedKey)

  const [dialogState, setDialogState] = useState<DialogState | null>(null)
  // The open dialog shows the latest copy of its workout (it may just have been shared).
  const dialogWorkout = dialogState?.workout
    ? (workouts.find((w) => w.id === dialogState.workout!.id) ?? dialogState.workout)
    : null

  function handleAdd(dateISO: string) {
    setDialogState({ date: dateISO, workout: null })
  }

  function handleWorkoutClick(workout: PlannedWorkout) {
    setDialogState({ date: workout.target_date, workout })
  }

  function handleDuplicate(workout: PlannedWorkout) {
    setDialogState({ date: workout.target_date, workout: null, prefill: workout })
  }

  async function handleMarkDone(workout: PlannedWorkout) {
    if (completionByPlannedId.has(workout.id)) return // already completed
    try {
      const created = await logCompletion({
        planned_workout_id: workout.id,
        execution_date: workout.target_date,
        discipline: workout.discipline,
        actual_duration_minutes: workout.planned_duration_minutes,
        actual_distance_km: workout.planned_distance_km,
        rpe: null,
        notes: null,
        source: "manual",
      })
      toast.success("Marked as done", {
        duration: 6000,
        action: {
          label: "Undo",
          onClick: () => {
            deleteCompletion(created.id).catch((err) =>
              toast.error(errorMessage(err, "Couldn't undo"))
            )
          },
        },
      })
    } catch (err) {
      toast.error(errorMessage(err, "Failed to mark done"))
    }
  }

  async function handleUnmarkDone(workout: PlannedWorkout) {
    const completion = completionByPlannedId.get(workout.id)
    if (!completion) return
    try {
      await deleteCompletion(completion.id)
      toast.success("Removed", {
        duration: 6000,
        action: {
          label: "Undo",
          onClick: () => {
            logCompletion({
              planned_workout_id: completion.planned_workout_id,
              execution_date: completion.execution_date,
              discipline: completion.discipline,
              actual_duration_minutes: completion.actual_duration_minutes,
              actual_distance_km: completion.actual_distance_km,
              avg_heart_rate: completion.avg_heart_rate,
              avg_pace_or_power: completion.avg_pace_or_power,
              external_activity_id: completion.external_activity_id,
              rpe: completion.rpe,
              notes: completion.notes,
              source: completion.source,
            }).catch((err) => toast.error(errorMessage(err, "Couldn't undo")))
          },
        },
      })
    } catch (err) {
      toast.error(errorMessage(err, "Failed to remove"))
    }
  }

  // Deleting a completed workout leaves its completion behind unlinked, so the
  // undo re-creates the workout and points that completion back at it.
  function handleDeleted(workout: PlannedWorkout) {
    const completion = completionByPlannedId.get(workout.id)
    toast.success("Workout deleted", {
      duration: 8000,
      action: {
        label: "Undo",
        onClick: async () => {
          try {
            const restored = await createWorkout(copyFields(workout, workout.target_date))
            if (completion) await relinkCompletion(completion.id, restored.id)
            toast.success("Workout restored")
          } catch (err) {
            toast.error(errorMessage(err, "Couldn't restore the workout"))
          }
        },
      },
    })
  }

  async function handleCopyLastWeek() {
    setCopying(true)
    try {
      // In week view the range starts on the visible Monday.
      const created = await copyWeek(toISODate(subWeeks(range.start, 1)), 7)
      if (created.length === 0) {
        toast.info("Nothing to copy — last week is empty, or already copied here")
        return
      }
      toast.success(`Copied ${created.length} ${created.length === 1 ? "workout" : "workouts"} from last week`, {
        duration: 8000,
        action: {
          label: "Undo",
          onClick: () => {
            deleteWorkouts(created.map((w) => w.id))
              .then(() => toast.success("Undone"))
              .catch((err) => toast.error(errorMessage(err, "Couldn't undo")))
          },
        },
      })
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't copy last week"))
    } finally {
      setCopying(false)
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

    const previousDate = workout.target_date
    try {
      await rescheduleWorkout(workoutId, newDate)
      toast.success(`Moved to ${format(new Date(`${newDate}T00:00:00`), "EEE, MMM d")}`, {
        duration: 6000,
        action: {
          label: "Undo",
          onClick: () => {
            rescheduleWorkout(workoutId, previousDate).catch((err) =>
              toast.error(errorMessage(err, "Couldn't undo"))
            )
          },
        },
      })
    } catch (err) {
      toast.error(errorMessage(err, "Failed to reschedule"))
    }
  }

  const activeWorkout = workouts.find((w) => w.id === activeDragId) ?? null

  return (
    <ZoneGuideProvider value={zoneGuide}>
      <SharedSessionsProvider value={sharedMembers}>
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
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload />
              Import
            </Button>
            {view === "week" && (
              <Button variant="outline" size="sm" onClick={handleCopyLastWeek} disabled={copying || loading}>
                {copying ? <Loader2 className="animate-spin" /> : <CopyPlus />}
                Copy last week
              </Button>
            )}
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
            accessibility={{
              announcements: dndAnnouncements,
              screenReaderInstructions: dndScreenReaderInstructions,
            }}
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
            No workouts yet &mdash; click the + on any day to add your first one
            {view === "week" ? ", or copy last week's plan." : "."}
          </div>
        )}

        <ImportActivityDialog open={importOpen} onOpenChange={setImportOpen} onImported={refetchCompletions} />

        {dialogState && (
          <WorkoutFormDialog
            open
            onOpenChange={(open) => !open && setDialogState(null)}
            targetDate={dialogState.date}
            workout={dialogWorkout}
            prefill={dialogState.prefill}
            mutations={{ createWorkout, createWorkouts, updateWorkout, deleteWorkout, deleteWorkouts }}
            onDeleted={handleDeleted}
            onDuplicate={handleDuplicate}
            onSharedChanged={async () => {
              await refetchWorkouts()
              await refetchShared()
            }}
          />
        )}
      </div>
      </SharedSessionsProvider>
    </ZoneGuideProvider>
  )
}
