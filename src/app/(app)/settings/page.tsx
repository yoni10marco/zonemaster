import { UserCog } from "lucide-react"

import { ProfileEditForm } from "@/components/auth/ProfileEditForm"
import { StravaConnection } from "@/components/settings/StravaConnection"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { stravaConfig } from "@/lib/strava/client"

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ strava?: string }>
}) {
  const { strava } = await searchParams

  // Token columns are not readable by the browser role, so select only the
  // status fields explicitly (a `select *` would be rejected).
  const supabase = await createClient()
  const { data: integration } = await supabase
    .from("integrations")
    .select("connected_at, last_synced_at")
    .eq("provider", "strava")
    .maybeSingle()

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="font-heading text-lg font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your training profile and integrations.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="size-4 text-primary" />
            Training profile
          </CardTitle>
          <CardDescription>Used to tailor your training plan and AI coaching.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileEditForm />
        </CardContent>
      </Card>

      <StravaConnection
        configured={stravaConfig() !== null}
        connected={!!integration?.connected_at}
        lastSyncedAt={integration?.last_synced_at ?? null}
        notice={strava ?? null}
      />
    </div>
  )
}
