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
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import type { PlannedWorkout } from "@/hooks/usePlannedWorkouts"
import type { useCompletedWorkouts } from "@/hooks/useCompletedWorkouts"
import { DISCIPLINES, DISCIPLINE_LABELS } from "@/lib/types/domain"
import {
  completionSchema,
  parseOptionalNumber,
  type CompletionInput,
} from "@/lib/validation/workout"

type CompletionFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-fill and link directly to this planned workout, if logging from a card. */
  plannedWorkout?: PlannedWorkout | null
  /** Default date when logging standalone (not tied to a planned workout). */
  defaultDate: string
  logCompletion: ReturnType<typeof useCompletedWorkouts>["logCompletion"]
  findLinkCandidate: ReturnType<typeof useCompletedWorkouts>["findLinkCandidate"]
}

export function CompletionFormDialog({
  open,
  onOpenChange,
  plannedWorkout,
  defaultDate,
  logCompletion,
  findLinkCandidate,
}: CompletionFormDialogProps) {
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<CompletionInput>({
    resolver: zodResolver(completionSchema),
    defaultValues: {
      executionDate: defaultDate,
      discipline: "run",
      actualDurationMinutes: undefined,
      actualDistanceKm: undefined,
      rpe: 5,
      notes: "",
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      executionDate: plannedWorkout?.target_date ?? defaultDate,
      discipline: plannedWorkout?.discipline ?? "run",
      actualDurationMinutes: plannedWorkout?.planned_duration_minutes?.toString() ?? "",
      actualDistanceKm: plannedWorkout?.planned_distance_km?.toString() ?? "",
      rpe: 5,
      notes: "",
    })
  }, [open, plannedWorkout, defaultDate, form])

  async function onSubmit(values: CompletionInput) {
    setSubmitting(true)
    try {
      let plannedWorkoutId = plannedWorkout?.id ?? null

      if (!plannedWorkoutId) {
        const candidateId = await findLinkCandidate(values.executionDate, values.discipline)
        if (candidateId) {
          const confirmed = window.confirm(
            `Link this to your planned ${values.discipline} workout on ${values.executionDate}?`
          )
          if (confirmed) plannedWorkoutId = candidateId
        }
      }

      await logCompletion({
        planned_workout_id: plannedWorkoutId,
        execution_date: values.executionDate,
        discipline: values.discipline as PlannedWorkout["discipline"],
        actual_duration_minutes: parseOptionalNumber(values.actualDurationMinutes),
        actual_distance_km: parseOptionalNumber(values.actualDistanceKm),
        rpe: values.rpe,
        notes: values.notes || null,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log completed workout</DialogTitle>
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="actualDurationMinutes"
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
                name="actualDistanceKm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distance (km)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.1"
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
              name="rpe"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RPE: {field.value}</FormLabel>
                  <FormControl>
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      value={[Number(field.value)]}
                      onValueChange={([v]) => field.onChange(v)}
                    />
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

            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Log completion"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
