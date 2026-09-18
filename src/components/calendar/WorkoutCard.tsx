"use client"

import { useRef } from "react"
import { useDraggable } from "@dnd-kit/core"
import { Check, CheckCircle2 } from "lucide-react"

import type { PlannedWorkout } from "@/hooks/usePlannedWorkouts"
import { DISCIPLINE_LABELS, ZONE_LABELS } from "@/lib/types/domain"
import { DISCIPLINE_ICONS, DISCIPLINE_STYLES } from "@/lib/utils/discipline-style"
import { cn } from "@/lib/utils"

type WorkoutCardProps = {
  workout: PlannedWorkout
  completed?: boolean
  onClick?: () => void
  /** One-click "mark done as planned" — no dialog, no numbers to enter. */
  onMarkDone?: () => void
  /** Tapping the same checkmark again when already completed removes that
   *  logged activity — the quick way to undo a mis-tap. */
  onUnmarkDone?: () => void
  /** Month view / narrow screens: a single icon+title line instead of the
   *  full badge + duration + zone stack, so a 7-column grid stays legible. */
  compact?: boolean
}

// A plain onClick is unreliable on a draggable node, so a "click" is detected
// here by comparing pointerdown/pointerup positions instead.
const CLICK_MOVEMENT_THRESHOLD_PX = 5

// On touch a card is dragged by pressing and holding this long. A press that
// lasted at least this long was a (possibly abandoned) drag, not a tap, so it
// must not also open the card.
export const TOUCH_DRAG_DELAY_MS = 250

// Spread onto the nested checkmark buttons so pressing them never starts a
// card drag (mouse and touch drags start from different events).
const stopDragStart = {
  onPointerDown: (e: React.SyntheticEvent) => e.stopPropagation(),
  onMouseDown: (e: React.SyntheticEvent) => e.stopPropagation(),
  onTouchStart: (e: React.SyntheticEvent) => e.stopPropagation(),
}

export function WorkoutCard({
  workout,
  completed,
  onClick,
  onMarkDone,
  onUnmarkDone,
  compact,
}: WorkoutCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `workout-${workout.id}`,
    data: { workoutId: workout.id },
  })

  const pointerDownPos = useRef<{ x: number; y: number; time: number } | null>(null)

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  const style_ = DISCIPLINE_STYLES[workout.discipline]
  const Icon = DISCIPLINE_ICONS[workout.discipline]

  return (
    // A native <button> can't contain the nested "mark done" <button> below,
    // so this is a div with role="button" instead, keeping the same
    // pointerdown/pointerup click detection dnd-kit needs.
    <div
      ref={setNodeRef}
      data-workout-card
      style={style}
      {...listeners}
      {...attributes}
      onPointerDown={(e) => {
        pointerDownPos.current = { x: e.clientX, y: e.clientY, time: e.timeStamp }
      }}
      onPointerUp={(e) => {
        const start = pointerDownPos.current
        pointerDownPos.current = null
        if (!start || !onClick) return
        const dx = Math.abs(e.clientX - start.x)
        const dy = Math.abs(e.clientY - start.y)
        const wasHold = e.pointerType === "touch" && e.timeStamp - start.time >= TOUCH_DRAG_DELAY_MS
        if (!wasHold && dx < CLICK_MOVEMENT_THRESHOLD_PX && dy < CLICK_MOVEMENT_THRESHOLD_PX) {
          // Same ghost-click guard as DayColumn: on touch, the browser sends a
          // compatibility click after pointerup, which would otherwise land on
          // whatever the dialog we're about to open puts under the finger.
          if (e.pointerType === "touch") e.preventDefault()
          onClick()
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick?.()
        }
      }}
      className={cn(
        // select-none + no touch callout: a long-press to drag must not start
        // text selection or the iOS/Android link/image menu.
        "w-full min-w-0 cursor-pointer rounded-lg border text-left text-xs shadow-sm transition-all select-none [-webkit-touch-callout:none] hover:-translate-y-0.5 hover:shadow-md",
        style_.card,
        compact ? "p-1" : "p-2.5",
        isDragging && "opacity-50"
      )}
    >
      {compact ? (
        <div className={cn("flex min-w-0 items-center gap-1 rounded px-1 py-0.5", style_.badge)}>
          <Icon className="size-3 shrink-0" />
          <span className="truncate text-[10px] font-medium">
            {workout.title || DISCIPLINE_LABELS[workout.discipline]}
          </span>
          {completed && <CheckCircle2 className="ml-auto size-3.5 shrink-0 rounded-full bg-white text-green-600" />}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <div className={cn("flex size-5 shrink-0 items-center justify-center rounded-full", style_.iconBg)}>
                <Icon className="size-3" />
              </div>
              <span className={cn("text-[11px] font-bold tracking-wide", style_.text)}>
                {DISCIPLINE_LABELS[workout.discipline]}
              </span>
            </div>
            {completed ? (
              onUnmarkDone && (
                <button
                  type="button"
                  title="Completed — tap to remove"
                  aria-label="Completed — tap to remove this logged activity"
                  {...stopDragStart}
                  onClick={(e) => {
                    e.stopPropagation()
                    onUnmarkDone()
                  }}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-green-500 text-white shadow-sm transition-transform hover:scale-110 hover:bg-green-600 sm:size-6"
                >
                  <Check className="size-6 sm:size-4" strokeWidth={3} />
                </button>
              )
            ) : (
              onMarkDone && (
                <button
                  type="button"
                  title="Mark done as planned"
                  aria-label="Mark done as planned"
                  {...stopDragStart}
                  onClick={(e) => {
                    e.stopPropagation()
                    onMarkDone()
                  }}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-green-600/60 bg-white/70 text-green-700/80 transition-colors hover:border-green-500 hover:text-green-600 sm:size-6 sm:border-muted-foreground/40 sm:bg-transparent sm:text-muted-foreground/70"
                >
                  <Check className="size-6 sm:size-4" strokeWidth={3} />
                </button>
              )
            )}
          </div>
          {workout.title && (
            <div className="mt-1.5 truncate text-sm font-semibold text-foreground">{workout.title}</div>
          )}
          <div className="mt-1 text-muted-foreground">
            {workout.planned_duration_minutes ? `${workout.planned_duration_minutes} min` : null}
            {workout.planned_duration_minutes && workout.planned_distance_km ? " · " : null}
            {workout.planned_distance_km ? `${workout.planned_distance_km} km` : null}
          </div>
          {workout.target_zone && (
            <div className="mt-0.5 text-muted-foreground">{ZONE_LABELS[workout.target_zone]}</div>
          )}
        </>
      )}
    </div>
  )
}
