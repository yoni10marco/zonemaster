import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProfileEditForm } from "@/components/auth/ProfileEditForm"

export default function SettingsPage() {
  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="font-heading text-lg font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your training profile and integrations.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Training profile</CardTitle>
          <CardDescription>Used to tailor your training plan and, later, AI coaching.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileEditForm />
        </CardContent>
      </Card>

      <Card className="opacity-60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Strava</CardTitle>
            <Badge variant="secondary">Coming soon</Badge>
          </div>
          <CardDescription>
            Automatically sync completed activities from Strava. Not yet available.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
