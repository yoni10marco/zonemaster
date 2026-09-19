"use client"

import { useEffect, useState } from "react"
import { Copy, IdCard } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useProfile } from "@/hooks/useProfile"
import { createClient } from "@/lib/supabase/client"
import {
  USERNAME_HELP,
  formatFriendCode,
  isValidUsername,
  normalizeUsername,
} from "@/lib/validation/friends"

async function copyText(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(done)
  } catch {
    toast.error("Couldn't copy — please select the text and copy it yourself")
  }
}

/**
 * Your username (changeable) and friend ID (permanent). Friends find you by
 * both together; nobody can search for you by anything else.
 */
export function MyFriendIdCard() {
  const { profile, loading, refetch } = useProfile()
  const [username, setUsername] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saved = profile?.username ?? ""
  useEffect(() => {
    // Keep the box in step with what is saved (after load and after saving).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUsername(saved)
  }, [saved])

  async function save() {
    const value = normalizeUsername(username)
    if (!isValidUsername(value)) {
      setError(USERNAME_HELP)
      return
    }
    setError(null)
    setSaving(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not signed in")
      const { error: updateError } = await supabase.from("profiles").update({ username: value }).eq("id", user.id)
      if (updateError) throw new Error(updateError.message)
      await refetch()
      toast.success("Username saved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save your username")
    } finally {
      setSaving(false)
    }
  }

  const friendId = profile?.friend_code ? formatFriendCode(profile.friend_code) : null
  const dirty = normalizeUsername(username) !== saved

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IdCard className="size-4 text-primary" />
          Your friend ID
        </CardTitle>
        <CardDescription>
          Friends find you with your username <strong>and</strong> friend ID together. Being friends never
          shows them your calendar, only sessions you plan together.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  save()
                }}
              >
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="e.g. alex_runs"
                  maxLength={20}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-invalid={!!error}
                />
                <Button type="submit" disabled={saving || !dirty || username.trim() === ""}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </form>
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : !saved ? (
                <p className="text-sm text-muted-foreground">
                  Choose a username so friends can find you. {USERNAME_HELP}.
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label>Friend ID</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-muted px-3 py-2 text-center font-mono text-lg font-semibold tracking-widest">
                  {friendId ?? "—"}
                </code>
                <Button
                  variant="outline"
                  size="icon-lg"
                  aria-label="Copy friend ID"
                  disabled={!friendId}
                  onClick={() => friendId && copyText(friendId, "Friend ID copied")}
                >
                  <Copy />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Your friend ID was created when you signed up and can never change.
              </p>
            </div>

            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={!saved || !friendId}
              onClick={() =>
                copyText(
                  `Add me on Zone Master. Username: ${saved}, friend ID: ${friendId}`,
                  "Invite text copied"
                )
              }
            >
              <Copy />
              Copy invite text
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
