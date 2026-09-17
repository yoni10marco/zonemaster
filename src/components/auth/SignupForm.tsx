"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { ProfileFields } from "@/components/auth/ProfileFields"
import { createClient } from "@/lib/supabase/client"
import { signupSchema, type SignupInput } from "@/lib/validation/profile"

export function SignupForm() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [pendingConfirmation, setPendingConfirmation] = useState(false)

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      fitnessLevel: "intermediate",
      primaryDiscipline: "run",
      targetRaceDate: "",
      targetRaceDistance: "",
    },
  })

  async function onSubmit(values: SignupInput) {
    setSubmitting(true)
    const supabase = createClient()

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    })

    if (error) {
      toast.error(error.message)
      setSubmitting(false)
      return
    }

    const userId = data.user?.id
    if (userId) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          fitness_level: values.fitnessLevel as SignupInput["fitnessLevel"],
          primary_discipline: values.primaryDiscipline as SignupInput["primaryDiscipline"],
          target_race_date: values.targetRaceDate || null,
          target_race_distance: values.targetRaceDistance || null,
        })
        .eq("id", userId)

      if (profileError) {
        toast.error(`Signed up, but saving your profile failed: ${profileError.message}`)
      }
    }

    setSubmitting(false)

    if (!data.session) {
      // Email confirmation is required before a session exists.
      setPendingConfirmation(true)
      return
    }

    toast.success("Welcome to Zone Master!")
    router.push("/calendar")
    router.refresh()
  }

  if (pendingConfirmation) {
    return (
      <div className="space-y-2 text-center">
        <h2 className="text-lg font-medium">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          We sent a confirmation link to {form.getValues("email")}. Click it to activate your
          account, then log in.
        </p>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <ProfileFields control={form.control} />

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </Form>
  )
}
