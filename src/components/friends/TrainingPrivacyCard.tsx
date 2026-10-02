"use client"

import { useEffect, useState } from "react"
import { Eye } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useProfile } from "@/hooks/useProfile"
import { createClient } from "@/lib/supabase/client"

/**
 * Whether friends can see your planned workouts for the next and previous 7
 * days (in the Friends page's Training tab). On by default; this is the one
 * place to turn it off. Never affects shared sessions (always visible to the
 * people in them) or anything outside that 2-week window.
 */
export function TrainingPrivacyCard() {
  const { profile, loading, refetch } = useProfile()
  const [saving, setSaving] = useState(false)
  // Local optimistic copy so the switch flips instantly instead of waiting on
  // the round trip; reverted if the save fails.
  const [shared, setShared] = useState(true)

  useEffect(() => {
    if (profile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShared(profile.share_planned_workouts)
    }
  }, [profile])

  async function toggle(next: boolean) {
    setShared(next)
    setSaving(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not signed in")
      const { error } = await supabase
        .from("profiles")
        .update({ share_planned_workouts: next })
        .eq("id", user.id)
      if (error) throw new Error(error.message)
      await refetch()
      toast.success(next ? "Friends can now see your planned workouts" : "Your planned workouts are now private")
    } catch (err) {
      setShared(!next)
      toast.error(err instanceof Error ? err.message : "Couldn't save that")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="size-4 text-primary" />
          Training visibility
        </CardTitle>
        <CardDescription>
          When on, your friends can see what you have planned for the next and previous 7 days in their
          Training tab, and copy it to their own calendar. They never see anything outside that window, your
          completed workouts, or your notes elsewhere in the app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="share-planned-workouts" className="flex-1">
              Share my planned workouts with friends
            </Label>
            <Switch
              id="share-planned-workouts"
              checked={shared}
              disabled={saving}
              onCheckedChange={toggle}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
