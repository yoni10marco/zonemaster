"use client"

import { useState } from "react"
import { format, parseISO } from "date-fns"
import { Check, X } from "lucide-react"
import { toast } from "sonner"

import { Avatar } from "@/components/friends/Avatar"
import { Button } from "@/components/ui/button"
import type { SessionInvite } from "@/lib/friends/sessions"
import { DISCIPLINE_LABELS, ZONE_LABELS } from "@/lib/types/domain"
import { formatDistance } from "@/lib/utils/distance"
import { DISCIPLINE_ICONS, DISCIPLINE_STYLES } from "@/lib/utils/discipline-style"
import { cn } from "@/lib/utils"

type SessionInvitesListProps = {
  invites: SessionInvite[]
  onRespond: (sessionId: number, accept: boolean) => Promise<void>
}

function details(invite: SessionInvite): string {
  return [
    format(parseISO(invite.targetDate), "EEE, MMM d"),
    invite.durationMinutes ? `${invite.durationMinutes} min` : null,
    invite.distanceKm ? formatDistance(invite.distanceKm, invite.discipline) : null,
    invite.zone ? ZONE_LABELS[invite.zone] : null,
  ]
    .filter(Boolean)
    .join(" · ")
}

export function SessionInvitesList({ invites, onRespond }: SessionInvitesListProps) {
  const [busyId, setBusyId] = useState<number | null>(null)

  async function respond(invite: SessionInvite, accept: boolean) {
    setBusyId(invite.sessionId)
    try {
      await onRespond(invite.sessionId, accept)
      toast.success(
        accept
          ? `Added to your calendar for ${format(parseISO(invite.targetDate), "EEE, MMM d")}`
          : "Invitation declined"
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setBusyId(null)
    }
  }

  if (invites.length === 0) return null

  return (
    <section className="space-y-2" aria-label="Session invitations">
      <h3 className="text-sm font-medium text-muted-foreground">Invited to train together</h3>
      <ul className="space-y-2">
        {invites.map((invite) => {
          const style = DISCIPLINE_STYLES[invite.discipline]
          const Icon = DISCIPLINE_ICONS[invite.discipline]
          const busy = busyId === invite.sessionId
          return (
            <li key={invite.sessionId} className={cn("space-y-2 rounded-xl border p-3", style.card)}>
              <div className="flex items-start gap-3">
                <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", style.iconBg)}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm">
                    <Avatar name={invite.creatorUsername} className="size-5 text-[10px]" />
                    <span className="truncate">
                      <strong>{invite.creatorUsername ?? "A friend"}</strong> invited you
                    </span>
                  </p>
                  <p className={cn("mt-1 text-xs font-semibold", style.text)}>{DISCIPLINE_LABELS[invite.discipline]}</p>
                  <p className="truncate text-sm font-semibold">{invite.title || DISCIPLINE_LABELS[invite.discipline]}</p>
                  <p className="text-xs text-muted-foreground">{details(invite)}</p>
                  {invite.otherMembers.length > 0 && (
                    <p className="mt-0.5 text-xs text-muted-foreground">With {invite.otherMembers.join(", ")}</p>
                  )}
                  {invite.notes && <p className="mt-1 text-xs text-muted-foreground">{invite.notes}</p>}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" disabled={busy} onClick={() => respond(invite, false)}>
                  <X />
                  Decline
                </Button>
                <Button size="sm" disabled={busy} onClick={() => respond(invite, true)}>
                  <Check />
                  Accept
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
