"use client"

import { useEffect, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { PowerPaceFields } from "@/components/auth/PowerPaceFields"
import { ProfileFields } from "@/components/auth/ProfileFields"
import { createClient } from "@/lib/supabase/client"
import { ZONE_LABELS, INTENSITY_ZONES } from "@/lib/types/domain"
import { profileSchema, type ProfileInput } from "@/lib/validation/profile"
import { formatPace, parsePace } from "@/lib/utils/training-zones"
import { computeZoneRanges, formatZoneRange } from "@/lib/utils/zones"

export function ProfileEditForm() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fitnessLevel: "intermediate",
      primaryDiscipline: "run",
      targetRaceDate: "",
      targetRaceDistance: "",
      maxHeartRate: "",
      restingHeartRate: "",
      ftpWatts: "",
      runThresholdPace: "",
      swimCss: "",
    },
  })

  // Live preview of the zones the entered heart rates produce.
  const [maxHeartRate, restingHeartRate] = useWatch({
    control: form.control,
    name: ["maxHeartRate", "restingHeartRate"],
  })
  const zonePreview = computeZoneRanges(
    maxHeartRate ? Number(maxHeartRate) : null,
    restingHeartRate ? Number(restingHeartRate) : null
  )

  useEffect(() => {
    let cancelled = false

    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from("profiles")
        .select(
          "fitness_level, primary_discipline, target_race_date, target_race_distance, max_heart_rate, resting_heart_rate, ftp_watts, run_threshold_pace_sec, swim_css_sec"
        )
        .eq("id", user.id)
        .single()

      if (!cancelled && data) {
        form.reset({
          fitnessLevel: data.fitness_level,
          primaryDiscipline: data.primary_discipline,
          targetRaceDate: data.target_race_date ?? "",
          targetRaceDistance: data.target_race_distance ?? "",
          maxHeartRate: data.max_heart_rate?.toString() ?? "",
          restingHeartRate: data.resting_heart_rate?.toString() ?? "",
          ftpWatts: data.ftp_watts?.toString() ?? "",
          runThresholdPace: data.run_threshold_pace_sec ? formatPace(data.run_threshold_pace_sec) : "",
          swimCss: data.swim_css_sec ? formatPace(data.swim_css_sec) : "",
        })
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(values: ProfileInput) {
    setSubmitting(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from("profiles")
      .update({
        fitness_level: values.fitnessLevel as ProfileInput["fitnessLevel"],
        primary_discipline: values.primaryDiscipline as ProfileInput["primaryDiscipline"],
        target_race_date: values.targetRaceDate || null,
        target_race_distance: values.targetRaceDistance || null,
        max_heart_rate: values.maxHeartRate ? Number(values.maxHeartRate) : null,
        resting_heart_rate: values.restingHeartRate ? Number(values.restingHeartRate) : null,
        ftp_watts: values.ftpWatts ? Number(values.ftpWatts) : null,
        run_threshold_pace_sec: values.runThresholdPace ? parsePace(values.runThresholdPace) : null,
        swim_css_sec: values.swimCss ? parsePace(values.swimCss) : null,
      })
      .eq("id", user.id)

    setSubmitting(false)

    if (error) {
      toast.error(error.message)
      return
    }
    toast.success("Profile updated")
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <ProfileFields control={form.control} />

        <div className="space-y-3 border-t pt-4">
          <div>
            <h3 className="text-sm font-medium">Heart-rate zones</h3>
            <p className="text-sm text-muted-foreground">
              Optional. Your zones (Z1–Z5) are shown as heart-rate ranges on workouts and used by the coach.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="maxHeartRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max heart rate (bpm)</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="numeric" placeholder="e.g. 190" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="restingHeartRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resting heart rate (bpm)</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="numeric" placeholder="optional" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormDescription>
            With only a max heart rate, zones are percentages of it. Adding a resting rate makes them more
            accurate (heart-rate reserve method).
          </FormDescription>
          {zonePreview && (
            <dl className="grid grid-cols-1 gap-x-4 gap-y-1 rounded-lg bg-muted/60 p-3 text-sm sm:grid-cols-2">
              {INTENSITY_ZONES.map((zone) => (
                <div key={zone} className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{ZONE_LABELS[zone]}</dt>
                  <dd className="font-medium tabular-nums">{formatZoneRange(zonePreview[zone])}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <PowerPaceFields control={form.control} />

        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </Form>
  )
}
