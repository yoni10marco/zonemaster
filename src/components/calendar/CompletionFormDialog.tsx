"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
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
import type { PlannedWorkout } from "@/hooks/usePlannedWorkouts"
import type { CompletedWorkout, useCompletedWorkouts } from "@/hooks/useCompletedWorkouts"
import { DISCIPLINES, DISCIPLINE_LABELS } from "@/lib/types/domain"
import { completionSchema, type CompletionInput } from "@/lib/validation/workout"

type CompletionFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-fill and link directly to this planned workout, if logging from a card. */
  plannedWorkout?: PlannedWorkout | null
  /** If this workout already has a completion, edit it instead of creating a second one. */
  existingCompletion?: CompletedWorkout | null
  /** Default date when logging standalone (not tied to a planned workout). */
  defaultDate: string
  logCompletion: ReturnType<typeof useCompletedWorkouts>["logCompletion"]
  updateCompletion: ReturnType<typeof useCompletedWorkouts>["updateCompletion"]
  deleteCompletion: ReturnType<typeof useCompletedWorkouts>["deleteCompletion"]
  findLinkCandidate: ReturnType<typeof useCompletedWorkouts>["findLinkCandidate"]
}

export function CompletionFormDialog({
  open,
  onOpenChange,
  plannedWorkout,
  existingCompletion,
  defaultDate,
  logCompletion,
  updateCompletion,
  deleteCompletion,
  findLinkCandidate,
}: CompletionFormDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const isEditing = !!existingCompletion

  const form = useForm<CompletionInput>({
    resolver: zodResolver(completionSchema),
    defaultValues: {
      executionDate: defaultDate,
      discipline: "run",
    },
  })

  useEffect(() => {
    if (!open) return
    if (existingCompletion) {
      form.reset({
        executionDate: existingCompletion.execution_date,
        discipline: existingCompletion.discipline,
      })
      return
    }
    form.reset({
      executionDate: plannedWorkout?.target_date ?? defaultDate,
      discipline: plannedWorkout?.discipline ?? "run",
    })
  }, [open, plannedWorkout, existingCompletion, defaultDate, form])

  async function onSubmit(values: CompletionInput) {
    setSubmitting(true)
    try {
      if (existingCompletion) {
        await updateCompletion(existingCompletion.id, {
          execution_date: values.executionDate,
          discipline: values.discipline as PlannedWorkout["discipline"],
        })

        toast.success("Completion updated")
        onOpenChange(false)
        return
      }

      let plannedWorkoutId = plannedWorkout?.id ?? null
      let fallbackDuration = plannedWorkout?.planned_duration_minutes ?? null
      let fallbackDistance = plannedWorkout?.planned_distance_km ?? null

      if (!plannedWorkoutId) {
        const candidate = await findLinkCandidate(values.executionDate, values.discipline)
        if (candidate) {
          const confirmed = window.confirm(
            `Link this to your planned ${values.discipline} workout on ${values.executionDate}?`
          )
          if (confirmed) {
            plannedWorkoutId = candidate.id
            fallbackDuration = candidate.planned_duration_minutes
            fallbackDistance = candidate.planned_distance_km
          }
        }
      }

      await logCompletion({
        planned_workout_id: plannedWorkoutId,
        execution_date: values.executionDate,
        discipline: values.discipline as PlannedWorkout["discipline"],
        actual_duration_minutes: fallbackDuration,
        actual_distance_km: fallbackDistance,
        rpe: null,
        notes: null,
        source: "manual",
      })

      toast.success("Completion logged")
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!existingCompletion) return
    setSubmitting(true)
    try {
      await deleteCompletion(existingCompletion.id)
      toast.success("Activity log removed")
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit completion" : "Log completed workout"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="executionDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" disabled={!!plannedWorkout} {...field} />
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
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!!plannedWorkout}
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

            <DialogFooter className={isEditing ? "flex-col-reverse gap-2 sm:flex-row sm:justify-between" : undefined}>
              {isEditing && (
                <Button type="button" variant="destructive" disabled={submitting} onClick={handleDelete}>
                  Remove activity log
                </Button>
              )}
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : isEditing ? "Save changes" : "Log completion"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
