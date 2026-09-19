import type { Announcements, KeyboardCoordinateGetter, ScreenReaderInstructions } from "@dnd-kit/core"

// Keyboard dragging for the calendar: pick a card up with Space, then each arrow
// key jumps straight to the neighbouring day (rather than nudging 25px at a
// time, dnd-kit's default), and Space drops it.

export type Direction = "left" | "right" | "up" | "down"
export type Target = { id: string | number; left: number; top: number; width: number; height: number }

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
}

/**
 * The day cell to move to from `from` in `direction`: the nearest one that lies
 * that way, preferring cells in the same row/column over diagonal ones.
 */
export function pickTarget(
  from: { x: number; y: number },
  targets: Target[],
  direction: Direction
): Target | null {
  let best: Target | null = null
  let bestScore = Infinity
  for (const target of targets) {
    const dx = target.left + target.width / 2 - from.x
    const dy = target.top + target.height / 2 - from.y
    const along = direction === "left" ? -dx : direction === "right" ? dx : direction === "up" ? -dy : dy
    if (along <= 1) continue // not in that direction (or it is the current cell)
    const across = Math.abs(direction === "left" || direction === "right" ? dy : dx)
    const score = along + across * 2
    if (score < bestScore) {
      bestScore = score
      best = target
    }
  }
  return best
}

export const dayKeyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  { context: { active, droppableRects, droppableContainers, collisionRect } }
) => {
  const direction = KEY_TO_DIRECTION[event.code]
  if (!direction || !active || !collisionRect) return undefined
  event.preventDefault()

  const from = {
    x: collisionRect.left + collisionRect.width / 2,
    y: collisionRect.top + collisionRect.height / 2,
  }
  const targets: Target[] = []
  for (const container of droppableContainers.getEnabled()) {
    if (!String(container.id).startsWith("day-")) continue
    const rect = droppableRects.get(container.id)
    if (rect) targets.push({ id: container.id, left: rect.left, top: rect.top, width: rect.width, height: rect.height })
  }

  const target = pickTarget(from, targets, direction)
  if (!target) return undefined
  // Centre the card horizontally in the day and put it near the top of the cell.
  return { x: target.left + (target.width - collisionRect.width) / 2, y: target.top + 4 }
}

export const dndScreenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    "To move this workout to another day, press Space to pick it up, use the arrow keys to choose a day, then press Space to drop it. Press Escape to cancel. Press Enter to open it instead.",
}

type DragData = { current?: { label?: string } }
const label = (item: DragData | null | undefined, fallback: string) => item?.current?.label ?? fallback

export const dndAnnouncements: Announcements = {
  onDragStart: ({ active }) => `Picked up ${label(active.data, "workout")}.`,
  onDragOver: ({ active, over }) =>
    over ? `${label(active.data, "Workout")} is over ${label(over.data, "a day")}.` : undefined,
  onDragEnd: ({ active, over }) =>
    over
      ? `Dropped ${label(active.data, "workout")} on ${label(over.data, "a day")}.`
      : `${label(active.data, "Workout")} was dropped outside the calendar.`,
  onDragCancel: ({ active }) => `Move cancelled. ${label(active.data, "Workout")} stays where it was.`,
}
