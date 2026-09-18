"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Link2, RefreshCw, Unplug } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

type StravaConnectionProps = {
  configured: boolean
  connected: boolean
  lastSyncedAt: string | null
  /** Result of the OAuth round-trip, from the ?strava= query param. */
  notice: string | null
}

const NOTICES: Record<string, { type: "success" | "error"; message: string }> = {
  connected: { type: "success", message: "Strava connected — your activities are syncing" },
  denied: { type: "error", message: "Strava access was declined" },
  invalid_state: { type: "error", message: "Connection expired — please try again" },
  missing_scope: {
    type: "error",
    message: "Please allow access to your activities on Strava's consent screen",
  },
  not_configured: { type: "error", message: "Strava isn't set up on the server yet" },
  failed: { type: "error", message: "Couldn't connect to Strava — please try again" },
}

function formatLastSynced(iso: string | null): string {
  if (!iso) return "Not synced yet"
  return `Last synced ${new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`
}

export function StravaConnection({ configured, connected, lastSyncedAt, notice }: StravaConnectionProps) {
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    if (!notice) return
    const entry = NOTICES[notice]
    if (entry) toast[entry.type](entry.message)
    // Drop the query param so a refresh doesn't replay the toast.
    router.replace("/settings")
  }, [notice, router])

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch("/api/strava/sync", { method: "POST" })
      const body = (await res.json().catch(() => null)) as
        | { imported?: number; linked?: number; error?: string }
        | null
      if (!res.ok) throw new Error(body?.error ?? "Sync failed")

      const imported = body?.imported ?? 0
      toast.success(
        imported === 0
          ? "Already up to date"
          : `Imported ${imported} ${imported === 1 ? "activity" : "activities"}`
      )
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("integrations").delete().eq("provider", "strava")
      if (error) throw new Error(error.message)
      toast.success("Strava disconnected")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't disconnect")
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Link2 className="size-4 text-primary" />
            Strava
          </CardTitle>
          {connected ? (
            <Badge>Connected</Badge>
          ) : !configured ? (
            <Badge variant="secondary">Setup pending</Badge>
          ) : null}
        </div>
        <CardDescription>
          {connected
            ? `Completed activities are imported automatically and matched to your plan. ${formatLastSynced(lastSyncedAt)}.`
            : "Import your completed activities from Strava and match them to your plan automatically."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {connected ? (
          <>
            <Button onClick={handleSync} disabled={syncing || disconnecting}>
              <RefreshCw className={syncing ? "animate-spin" : undefined} />
              {syncing ? "Syncing..." : "Sync now"}
            </Button>
            <Button variant="outline" onClick={handleDisconnect} disabled={syncing || disconnecting}>
              <Unplug />
              Disconnect
            </Button>
          </>
        ) : !configured ? (
          <Button disabled>
            <Link2 />
            Connect Strava
          </Button>
        ) : (
          // A plain anchor, not next/link: this route redirects off-site and
          // must not be prefetched or handled by the client router.
          <Button asChild>
            <a href="/api/strava/connect">
              <Link2 />
              Connect Strava
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
