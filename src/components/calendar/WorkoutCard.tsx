"use client"

import { useRef } from "react"
import { useDraggable } from "@dnd-kit/core"
import { CheckCircle2, Circle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
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
}

// dnd-kit's PointerSensor calls preventDefault() on pointerdown, which stops
// the browser from ever synthesizing the follow-up "click" event — so a
// plain onClick on a draggable node never fires. Detect a real click
// ourselves by comparing pointerdown/pointerup positions instead.
const CLICK_MOVEMENT_THRESHOLD_PX = 5

export function WorkoutCard({ workout, completed, onClick, onMarkDone }: WorkoutCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `workout-${workout.id}`,
    data: { workoutId: workout.id },
  })

  const pointerDownPos = useRef<{ x: number; y: number } | null>(null)

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
      style={style}
      {...listeners}
      {...attributes}
      onPointerDown={(e) => {
        pointerDownPos.current = { x: e.clientX, y: e.clientY }
        listeners?.onPointerDown?.(e)
      }}
      onPointerUp={(e) => {
        const start = pointerDownPos.current
        pointerDownPos.current = null
        if (!start || !onClick) return
        const dx = Math.abs(e.clientX - start.x)
        const dy = Math.abs(e.clientY - start.y)
        if (dx < CLICK_MOVEMENT_THRESHOLD_PX && dy < CLICK_MOVEMENT_THRESHOLD_PX) {
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
        "w-full cursor-pointer rounded-md border p-2 text-left text-xs shadow-sm transition-opacity hover:shadow",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <Badge className={cn("gap-1 border-0", style_.badge)}>
          <Icon className="size-3" />
          {DISCIPLINE_LABELS[workout.discipline]}
        </Badge>
        {completed ? (
          <CheckCircle2 className="size-3.5 text-green-600" />
        ) : (
          onMarkDone && (
            <button
              type="button"
              title="Mark done as planned"
              aria-label="Mark done as planned"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onMarkDone()
              }}
              className="text-muted-foreground hover:text-green-600"
            >
              <Circle className="size-3.5" />
            </button>
          )
        )}
      </div>
      {workout.title && <div className="mt-1 truncate font-medium">{workout.title}</div>}
      <div className="mt-1 text-muted-foreground">
        {workout.planned_duration_minutes ? `${workout.planned_duration_minutes} min` : null}
        {workout.planned_duration_minutes && workout.planned_distance_km ? " · " : null}
        {workout.planned_distance_km ? `${workout.planned_distance_km} km` : null}
      </div>
      {workout.target_zone && (
        <div className="mt-0.5 text-muted-foreground">{ZONE_LABELS[workout.target_zone]}</div>
      )}
    </div>
  )
}
