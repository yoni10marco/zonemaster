"use client"

import { useEffect, useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"
import type { Tables } from "@/lib/types/database.types"
import type { Discipline } from "@/lib/types/domain"
import { DISCIPLINE_LABELS } from "@/lib/types/domain"
import { format } from "@/lib/utils/dates"

type CompletedWorkout = Tables<"completed_workouts">

type ActivityListDialogProps = {
  discipline: Discipline | null
  onOpenChange: (open: boolean) => void
}

// Always shows the full history for the discipline, independent of whatever
// week/month/all-time period the dashboard itself is currently scoped to —
// "see all my bike activities" means all of them, not just this week's.
export function ActivityListDialog({ discipline, onOpenChange }: ActivityListDialogProps) {
  const [activities, setActivities] = useState<CompletedWorkout[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!discipline) return
    let cancelled = false
    // Standard fetch-on-open pattern; the setLoading(true) here is a false
    // positive for this rule (see usePlannedWorkouts/useCompletedWorkouts).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)

    createClient()
      .from("completed_workouts")
      .select("*")
      .eq("discipline", discipline)
      .order("execution_date", { ascending: false })
      .then(({ data }) => {
        if (!cancelled) {
          setActivities(data ?? [])
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [discipline])

  return (
    <Dialog open={!!discipline} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{discipline ? DISCIPLINE_LABELS[discipline] : ""} activities</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : activities.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No {discipline ? DISCIPLINE_LABELS[discipline].toLowerCase() : ""} activities logged yet.
          </p>
        ) : (
          <div className="max-h-96 divide-y overflow-y-auto">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>{format(new Date(`${activity.execution_date}T00:00:00`), "MMM d, yyyy")}</span>
                <span className="flex-1 text-right text-muted-foreground">
                  {activity.actual_duration_minutes ? `${activity.actual_duration_minutes} min` : null}
                  {activity.actual_duration_minutes && activity.actual_distance_km ? " · " : null}
                  {activity.actual_distance_km ? `${activity.actual_distance_km} km` : null}
                  {activity.rpe ? ` · RPE ${activity.rpe}` : null}
                </span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
