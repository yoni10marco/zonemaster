"use client"

import { useEffect, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Copy } from "lucide-react"
import { toast } from "sonner"

import { useSharedMembers } from "@/components/calendar/SharedSessionsContext"
import { useZoneGuide } from "@/components/calendar/ZoneGuideContext"
import { TogetherSection } from "@/components/friends/TogetherSection"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { PlannedWorkout } from "@/hooks/usePlannedWorkouts"
import { useFriends } from "@/hooks/useFriends"
import { usePlannedWorkouts } from "@/hooks/usePlannedWorkouts"
import {
  createSharedSession,
  inviteToSharedSession,
  leaveSharedSession,
} from "@/lib/friends/sessions"
import {
  DISCIPLINES,
  DISCIPLINE_LABELS,
  INTENSITY_ZONES,
  ZONE_LABELS,
  type Discipline,
  type IntensityZone,
} from "@/lib/types/domain"
import {
  displayValueToKm,
  distanceUnit,
  kmToDisplayValue,
  usesMeters,
} from "@/lib/utils/distance"
import { REPEAT_WEEK_OPTIONS, repeatDates } from "@/lib/utils/repeat"
import { zoneTarget } from "@/lib/utils/training-zones"
import {
  parseOptionalNumber,
  plannedWorkoutSchema,
  type PlannedWorkoutInput,
} from "@/lib/validation/workout"

type WorkoutFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetDate: string
  workout?: PlannedWorkout | null
  /** Pre-fills a new workout from an existing one (the "Duplicate" action). */
  prefill?: PlannedWorkout | null
  mutations: Pick<
    ReturnType<typeof usePlannedWorkouts>,
    "createWorkout" | "createWorkouts" | "updateWorkout" | "deleteWorkout" | "deleteWorkouts"
  >
  /** Called after a delete so the page can offer "Undo". Without it a plain toast is shown. */
  onDeleted?: (workout: PlannedWorkout) => void
  onDuplicate?: (workout: PlannedWorkout) => void
  /** Called after invitations were sent or you left a session, so the calendar can reload. */
  onSharedChanged?: () => void | Promise<void>
}

export function WorkoutFormDialog({
  open,
  onOpenChange,
  targetDate,
  workout,
  prefill,
  mutations,
  onDeleted,
  onDuplicate,
  onSharedChanged,
}: WorkoutFormDialogProps) {
  const isEditing = !!workout
  const zoneGuide = useZoneGuide()
  const { friends } = useFriends()
  const members = useSharedMembers(workout?.shared_session_id ?? null)
  const [invitees, setInvitees] = useState<string[]>([])
  const [sharing, setSharing] = useState(false)

  const form = useForm<PlannedWorkoutInput>({
    resolver: zodResolver(plannedWorkoutSchema),
    defaultValues: {
      targetDate,
      discipline: "run",
      plannedDurationMinutes: undefined,
      plannedDistanceKm: undefined,
      targetZone: undefined,
      title: "",
      notes: "",
      repeatWeeks: "0",
    },
  })

  // The distance field holds what is shown: meters for swims, km otherwise.
  const discipline = useWatch({ control: form.control, name: "discipline" }) as Discipline
  const zoneSuffix = (z: IntensityZone) => {
    const target = zoneTarget(zoneGuide, discipline, z)
    return target ? ` · ${target}` : ""
  }

  useEffect(() => {
    if (!open) return
    const source = workout ?? prefill
    form.reset({
      targetDate: workout?.target_date ?? targetDate,
      discipline: source?.discipline ?? "run",
      plannedDurationMinutes: source?.planned_duration_minutes?.toString() ?? "",
      plannedDistanceKm:
        source?.planned_distance_km != null
          ? kmToDisplayValue(source.planned_distance_km, source.discipline).toString()
          : "",
      targetZone: source?.target_zone ?? undefined,
      title: source?.title ?? "",
      notes: source?.notes ?? "",
      repeatWeeks: "0",
    })
    // A fresh dialog starts with nobody picked.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInvitees([])
  }, [open, workout, prefill, targetDate, form])

  function toastWithUndo(message: string, createdIds: number[]) {
    toast.success(message, {
      duration: 8000,
      action: {
        label: "Undo",
        onClick: () => {
          mutations
            .deleteWorkouts(createdIds)
            .then(() => toast.success("Undone"))
            .catch((err) => toast.error(err instanceof Error ? err.message : "Couldn't undo"))
        },
      },
    })
  }

  function chooseInvitees(ids: string[]) {
    setInvitees(ids)
    if (ids.length > 0) form.setValue("repeatWeeks", "0")
  }

  async function sendInvitations() {
    if (!workout || invitees.length === 0) return
    setSharing(true)
    try {
      if (workout.shared_session_id) await inviteToSharedSession(workout.shared_session_id, invitees)
      else await createSharedSession(workout.id, invitees)
      toast.success(invitees.length === 1 ? "Invitation sent" : `${invitees.length} invitations sent`)
      setInvitees([])
      await onSharedChanged?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send the invitation")
    } finally {
      setSharing(false)
    }
  }

  async function leaveSession() {
    if (!workout?.shared_session_id) return
    setSharing(true)
    try {
      await leaveSharedSession(workout.shared_session_id)
      toast.success("You left the shared session")
      await onSharedChanged?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't leave the session")
    } finally {
      setSharing(false)
    }
  }

  async function onSubmit(values: PlannedWorkoutInput) {
    try {
      const payload = {
        target_date: values.targetDate,
        discipline: values.discipline as PlannedWorkout["discipline"],
        planned_duration_minutes: parseOptionalNumber(values.plannedDurationMinutes),
        planned_distance_km: (() => {
          const typed = parseOptionalNumber(values.plannedDistanceKm)
          return typed === null ? null : displayValueToKm(typed, values.discipline)
        })(),
        target_zone: (values.targetZone || null) as PlannedWorkout["target_zone"],
        title: values.title || null,
        notes: values.notes || null,
      }
      const copies = repeatDates(values.targetDate, Number(values.repeatWeeks) || 0).map((date) => ({
        ...payload,
        target_date: date,
      }))

      if (isEditing && workout) {
        await mutations.updateWorkout(workout.id, payload)
        if (copies.length > 0) {
          const created = await mutations.createWorkouts(copies)
          toastWithUndo(
            `Workout updated and repeated for ${copies.length} more ${copies.length === 1 ? "week" : "weeks"}`,
            created.map((w) => w.id)
          )
        } else {
          toast.success("Workout updated")
        }
      } else if (copies.length > 0) {
        const created = await mutations.createWorkouts([payload, ...copies])
        toastWithUndo(`Added ${created.length} workouts`, created.map((w) => w.id))
      } else {
        const created = await mutations.createWorkout(payload)
        if (invitees.length > 0) {
          try {
            await createSharedSession(created.id, invitees)
            toastWithUndo(
              `Workout added, ${invitees.length === 1 ? "1 friend" : `${invitees.length} friends`} invited`,
              [created.id]
            )
            await onSharedChanged?.()
          } catch (err) {
            toastWithUndo("Workout added", [created.id])
            toast.error(
              `The invitation wasn't sent: ${err instanceof Error ? err.message : "something went wrong"}`
            )
          }
        } else {
          toastWithUndo("Workout added", [created.id])
        }
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  async function handleDelete() {
    if (!workout) return
    try {
      await mutations.deleteWorkout(workout.id)
      if (workout.shared_session_id) toast.success("Workout deleted, and you left the shared session")
      else if (onDeleted) onDeleted(workout)
      else toast.success("Workout deleted")
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit workout" : prefill ? "Duplicate workout" : "Add workout"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="targetDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="discipline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discipline</FormLabel>
                  <Select
                    onValueChange={(next) => {
                      const previous = form.getValues("discipline") as Discipline
                      field.onChange(next)
                      // Switching to/from swim changes the unit, so convert a value
                      // that is already typed instead of silently reinterpreting it.
                      const typed = parseOptionalNumber(form.getValues("plannedDistanceKm"))
                      if (typed !== null && usesMeters(previous) !== usesMeters(next as Discipline)) {
                        const km = displayValueToKm(typed, previous)
                        form.setValue("plannedDistanceKm", kmToDisplayValue(km, next as Discipline).toString())
                      }
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DISCIPLINES.map((d) => (
                        <SelectItem key={d} value={d}>
                          {DISCIPLINE_LABELS[d]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="plannedDurationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (min)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="plannedDistanceKm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distance ({distanceUnit(discipline)})</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={usesMeters(discipline) ? "1" : "0.1"}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="targetZone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target zone (optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="No specific zone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INTENSITY_ZONES.map((z) => (
                        <SelectItem key={z} value={z}>
                          {ZONE_LABELS[z]}
                          {zoneSuffix(z)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Long run" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="repeatWeeks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Repeat weekly (optional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || "0"}
                    disabled={invitees.length > 0 && !isEditing}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">Don&apos;t repeat</SelectItem>
                      {REPEAT_WEEK_OPTIONS.map((weeks) => (
                        <SelectItem key={weeks} value={String(weeks)}>
                          Repeat for {weeks} more {weeks === 1 ? "week" : "weeks"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <TogetherSection
              friends={friends
                .filter((f) => f.kind === "friend")
                .map((f) => ({ userId: f.userId, username: f.username }))}
              members={workout?.shared_session_id ? members : undefined}
              isEditing={isEditing}
              selected={invitees}
              onSelectedChange={chooseInvitees}
              onInvite={isEditing ? sendInvitations : undefined}
              onLeave={workout?.shared_session_id ? leaveSession : undefined}
              busy={sharing}
            />

            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <div className="flex gap-2">
                {isEditing && (
                  <Button type="button" variant="destructive" onClick={handleDelete}>
                    Delete
                  </Button>
                )}
                {isEditing && workout && onDuplicate && (
                  <Button type="button" variant="outline" onClick={() => onDuplicate(workout)}>
                    <Copy />
                    Duplicate
                  </Button>
                )}
              </div>
              <Button type="submit">{isEditing ? "Save changes" : "Add workout"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
