"use client"

import { useState } from "react"

import { Avatar } from "@/components/friends/Avatar"
import { FriendWorkoutDetailDialog } from "@/components/friends/FriendWorkoutDetailDialog"
import { Skeleton } from "@/components/ui/skeleton"
import type { FriendWorkout } from "@/hooks/useFriendsWorkouts"
import { DISCIPLINE_LABELS } from "@/lib/types/domain"
import { cn } from "@/lib/utils"
import { addDaysISO, format, toISODate } from "@/lib/utils/dates"
import { DISCIPLINE_ICONS, DISCIPLINE_STYLES } from "@/lib/utils/discipline-style"
import { formatDistance } from "@/lib/utils/distance"
import { plannedLegs } from "@/lib/utils/segments"

function dayLabel(iso: string): string {
  const today = toISODate(new Date())
  if (iso === today) return "Today"
  if (iso === addDaysISO(today, -1)) return "Yesterday"
  if (iso === addDaysISO(today, 1)) return "Tomorrow"
  return format(new Date(`${iso}T00:00:00`), "EEEE, MMM d")
}

type FriendsTrainingListProps = {
  workouts: FriendWorkout[]
  loading: boolean
  error: string | null
  /** False when every workout already belongs to one known friend (opened
   *  from their row), so repeating their name on every line would be noise. */
  showFriend?: boolean
}

/**
 * Shared planned workouts for the last and next 7 days — only from friends
 * who have sharing on (Settings). Grouped by day; click one to see its full
 * details and optionally copy it to your calendar.
 */
export function FriendsTrainingList({ workouts, loading, error, showFriend = true }: FriendsTrainingListProps) {
  const [selected, setSelected] = useState<FriendWorkout | null>(null)

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
        Couldn&apos;t load friends&apos; training: {error}
      </p>
    )
  }

  if (workouts.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        {showFriend
          ? "No shared training to show for this week. Friends who turn on sharing in Settings will show up here."
          : "Nothing planned for this week."}
      </p>
    )
  }

  const byDate = new Map<string, FriendWorkout[]>()
  for (const workout of workouts) {
    const forDay = byDate.get(workout.target_date) ?? []
    forDay.push(workout)
    byDate.set(workout.target_date, forDay)
  }

  return (
    <>
      <div className="space-y-4">
        {[...byDate.entries()].map(([date, dayWorkouts]) => (
          <div key={date}>
            <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {dayLabel(date)}
            </h3>
            <ul className="space-y-1.5">
              {dayWorkouts.map((workout) => {
                const legs = plannedLegs(workout)
                const multiSport = legs.length > 1
                return (
                  <li key={workout.workoutId}>
                    <button
                      type="button"
                      onClick={() => setSelected(workout)}
                      className="flex w-full items-center gap-3 rounded-lg border p-2.5 text-left text-sm transition-colors hover:bg-muted/60"
                    >
                      {showFriend && <Avatar name={workout.username} />}
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">
                          {showFriend && (
                            <>
                              {workout.username ?? "Friend"}
                              {" "}
                            </>
                          )}
                          <span className="font-normal text-muted-foreground">
                            {workout.title ||
                              (multiSport
                                ? legs.map((l) => DISCIPLINE_LABELS[l.discipline]).join(" + ")
                                : DISCIPLINE_LABELS[workout.discipline])}
                          </span>
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {workout.planned_duration_minutes ? `${workout.planned_duration_minutes} min` : null}
                          {workout.planned_duration_minutes && workout.planned_distance_km ? " · " : null}
                          {workout.planned_distance_km
                            ? formatDistance(workout.planned_distance_km, workout.discipline)
                            : null}
                        </div>
                      </div>
                      {multiSport ? (
                        <div className="flex -space-x-1">
                          {legs.map((leg, i) => {
                            const LegIcon = DISCIPLINE_ICONS[leg.discipline]
                            return (
                              <div
                                key={i}
                                className={cn(
                                  "flex size-6 shrink-0 items-center justify-center rounded-full ring-1 ring-background",
                                  DISCIPLINE_STYLES[leg.discipline].iconBg
                                )}
                              >
                                <LegIcon className="size-3.5" />
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        (() => {
                          const Icon = DISCIPLINE_ICONS[workout.discipline]
                          return (
                            <div
                              className={cn(
                                "flex size-6 shrink-0 items-center justify-center rounded-full",
                                DISCIPLINE_STYLES[workout.discipline].iconBg
                              )}
                            >
                              <Icon className="size-3.5" />
                            </div>
                          )
                        })()
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      {selected && (
        <FriendWorkoutDetailDialog
          open
          workout={selected}
          onOpenChange={(open) => !open && setSelected(null)}
        />
      )}
    </>
  )
}
