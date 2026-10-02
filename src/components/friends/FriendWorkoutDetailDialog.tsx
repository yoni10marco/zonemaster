"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { FriendWorkout } from "@/hooks/useFriendsWorkouts"
import { createClient } from "@/lib/supabase/client"
import { DISCIPLINE_LABELS, ZONE_LABELS } from "@/lib/types/domain"
import { DISCIPLINE_ICONS } from "@/lib/utils/discipline-style"
import { format } from "@/lib/utils/dates"
import { formatDistance } from "@/lib/utils/distance"
import { plannedLegs } from "@/lib/utils/segments"

type FriendWorkoutDetailDialogProps = {
  open: boolean
  workout: FriendWorkout
  onOpenChange: (open: boolean) => void
}

/**
 * Read-only view of a friend's shared planned workout, with a one-click copy
 * onto your own calendar. The copy is an ordinary workout from then on — not
 * linked back to theirs, so editing or deleting either one never affects the
 * other. Zones show the label only (e.g. "Z2 · Endurance"), never a bpm/pace
 * range: that range comes from the viewer's own heart-rate/pace profile, and
 * showing it here would silently apply the wrong person's numbers.
 */
export function FriendWorkoutDetailDialog({ open, workout, onOpenChange }: FriendWorkoutDetailDialogProps) {
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copyToMyCalendar() {
    setCopying(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not signed in")
      const { error } = await supabase.from("planned_workouts").insert({
        user_id: user.id,
        target_date: workout.target_date,
        discipline: workout.discipline,
        title: workout.title,
        notes: workout.notes,
        planned_duration_minutes: workout.planned_duration_minutes,
        planned_distance_km: workout.planned_distance_km,
        target_zone: workout.target_zone,
        extra_segments: workout.extra_segments,
      })
      if (error) throw new Error(error.message)
      setCopied(true)
      toast.success("Added to your calendar")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't copy that workout")
    } finally {
      setCopying(false)
    }
  }

  const legs = plannedLegs(workout)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{workout.title || DISCIPLINE_LABELS[workout.discipline]}</DialogTitle>
          <DialogDescription>
            {workout.username ?? "Friend"} · {format(new Date(`${workout.target_date}T00:00:00`), "EEEE, MMM d")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {legs.map((leg, i) => {
            const Icon = DISCIPLINE_ICONS[leg.discipline]
            return (
              <div key={i} className="flex items-start gap-2.5">
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <div className="font-medium">{DISCIPLINE_LABELS[leg.discipline]}</div>
                  <div className="text-muted-foreground">
                    {leg.planned_duration_minutes ? `${leg.planned_duration_minutes} min` : null}
                    {leg.planned_duration_minutes && leg.planned_distance_km ? " · " : null}
                    {leg.planned_distance_km ? formatDistance(leg.planned_distance_km, leg.discipline) : null}
                    {leg.target_zone ? ` · ${ZONE_LABELS[leg.target_zone]}` : null}
                  </div>
                </div>
              </div>
            )
          })}
          {workout.notes && <p className="whitespace-pre-wrap text-muted-foreground">{workout.notes}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={copyToMyCalendar} disabled={copying || copied}>
            {copying && <Loader2 className="animate-spin" />}
            {copied ? "Added ✓" : "Copy to your calendar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
