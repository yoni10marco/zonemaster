import { UserCog } from "lucide-react"

import { ProfileEditForm } from "@/components/auth/ProfileEditForm"
import { MyFriendIdCard } from "@/components/friends/MyFriendIdCard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SettingsPage() {
  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="font-heading text-lg font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your training profile.</p>
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

      <MyFriendIdCard />
    </div>
  )
}
