"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { Skeleton } from "@/components/ui/skeleton"
import { ProfileFields } from "@/components/auth/ProfileFields"
import { createClient } from "@/lib/supabase/client"
import { profileSchema, type ProfileInput } from "@/lib/validation/profile"

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
    },
  })

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
        .select("fitness_level, primary_discipline, target_race_date, target_race_distance")
        .eq("id", user.id)
        .single()

      if (!cancelled && data) {
        form.reset({
          fitnessLevel: data.fitness_level,
          primaryDiscipline: data.primary_discipline,
          targetRaceDate: data.target_race_date ?? "",
          targetRaceDistance: data.target_race_distance ?? "",
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
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </Form>
  )
}
