"use client"

import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

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
import { usePlannedWorkouts } from "@/hooks/usePlannedWorkouts"
import {
  DISCIPLINES,
  DISCIPLINE_LABELS,
  INTENSITY_ZONES,
  ZONE_LABELS,
  type Discipline,
} from "@/lib/types/domain"
import {
  displayValueToKm,
  distanceUnit,
  kmToDisplayValue,
  usesMeters,
} from "@/lib/utils/distance"
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
  mutations: Pick<
    ReturnType<typeof usePlannedWorkouts>,
    "createWorkout" | "updateWorkout" | "deleteWorkout"
  >
}

export function WorkoutFormDialog({
  open,
  onOpenChange,
  targetDate,
  workout,
  mutations,
}: WorkoutFormDialogProps) {
  const isEditing = !!workout

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
    },
  })

  // The distance field holds what is shown: meters for swims, km otherwise.
  const discipline = useWatch({ control: form.control, name: "discipline" }) as Discipline

  useEffect(() => {
    if (!open) return
    form.reset({
      targetDate: workout?.target_date ?? targetDate,
      discipline: workout?.discipline ?? "run",
      plannedDurationMinutes: workout?.planned_duration_minutes?.toString() ?? "",
      plannedDistanceKm:
        workout?.planned_distance_km != null
          ? kmToDisplayValue(workout.planned_distance_km, workout.discipline).toString()
          : "",
      targetZone: workout?.target_zone ?? undefined,
      title: workout?.title ?? "",
      notes: workout?.notes ?? "",
    })
  }, [open, workout, targetDate, form])

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

      if (isEditing && workout) {
        await mutations.updateWorkout(workout.id, payload)
        toast.success("Workout updated")
      } else {
        await mutations.createWorkout(payload)
        toast.success("Workout added")
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
      toast.success("Workout deleted")
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit workout" : "Add workout"}</DialogTitle>
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

            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <div className="flex gap-2">
                {isEditing && (
                  <Button type="button" variant="destructive" onClick={handleDelete}>
                    Delete
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
