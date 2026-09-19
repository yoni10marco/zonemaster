"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, LogOut, Send, Users } from "lucide-react"

import { Avatar } from "@/components/friends/Avatar"
import { ConfirmDialog } from "@/components/friends/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { summarizeSession, type SessionMember } from "@/lib/friends/shared-session"

export const MAX_SESSION_PEOPLE = 8

export type FriendChoice = { userId: string; username: string | null }

type TogetherSectionProps = {
  friends: FriendChoice[]
  /** The people in this workout's shared session; undefined when it isn't shared yet. */
  members?: SessionMember[]
  /** Editing an existing workout (invitations can be sent right away) rather than adding a new one. */
  isEditing: boolean
  selected: string[]
  onSelectedChange: (ids: string[]) => void
  /** Send the invitations now (existing workouts only). */
  onInvite?: () => Promise<void>
  onLeave?: () => Promise<void>
  busy?: boolean
}

function statusText(member: SessionMember): string {
  if (member.isMe) return member.isCreator ? "You started this" : "You"
  if (member.status === "invited") return "Waiting to answer"
  if (member.status === "declined") return "Declined"
  return member.completed ? "Going, done ✓" : "Going"
}

export function TogetherSection({
  friends,
  members,
  isEditing,
  selected,
  onSelectedChange,
  onInvite,
  onLeave,
  busy,
}: TogetherSectionProps) {
  const [confirmLeave, setConfirmLeave] = useState(false)
  const summary = members ? summarizeSession(members) : null

  // Friends already in the session (going or waiting) can't be picked again;
  // someone who declined can be invited once more.
  const taken = new Set((members ?? []).filter((m) => m.status !== "declined").map((m) => m.userId))
  const pickable = friends.filter((f) => !taken.has(f.userId))

  const isNewRow = (id: string) => !members?.some((m) => m.userId === id)
  const total = (members?.length ?? 1) + selected.filter(isNewRow).length
  const canPickMore = (id: string) => !isNewRow(id) || total < MAX_SESSION_PEOPLE

  const canInvite = !members || summary?.imTheCreator === true
  const creatorName = members?.find((m) => m.isCreator)?.username

  function toggle(id: string) {
    onSelectedChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])
  }

  return (
    <section className="space-y-3 rounded-xl border p-3" aria-label="Do it together">
      <div>
        <h3 className="flex items-center gap-1.5 text-sm font-medium">
          <Users className="size-4 text-primary" />
          Do it together
          <span className="font-normal text-muted-foreground">(optional)</span>
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Friends you invite see only this session. When they accept it, it appears on their calendar as
          their own copy.
        </p>
      </div>

      {members && (
        <ul className="space-y-1.5">
          {members.map((member) => (
            <li key={member.userId} className="flex items-center gap-2 text-sm">
              <Avatar name={member.isMe ? "You" : member.username} className="size-6 text-xs" />
              <span className="min-w-0 flex-1 truncate">{member.isMe ? "You" : (member.username ?? "Someone")}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{statusText(member)}</span>
            </li>
          ))}
        </ul>
      )}

      {members && !canInvite && (
        <p className="text-xs text-muted-foreground">
          Only {creatorName ?? "the person who started it"} can invite more friends.
        </p>
      )}

      {canInvite &&
        (friends.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You don&apos;t have any friends yet.{" "}
            <Link href="/friends" className="font-medium text-primary underline-offset-2 hover:underline">
              Add friends
            </Link>{" "}
            to plan sessions together.
          </p>
        ) : pickable.length === 0 ? (
          <p className="text-sm text-muted-foreground">All your friends are already in this session.</p>
        ) : (
          <fieldset className="space-y-1">
            <legend className="text-xs font-medium text-muted-foreground">
              {members ? "Invite more friends" : "Invite friends"}
            </legend>
            <div className="max-h-40 space-y-0.5 overflow-y-auto">
              {pickable.map((friend) => {
                const checked = selected.includes(friend.userId)
                const disabled = !checked && !canPickMore(friend.userId)
                return (
                  <label
                    key={friend.userId}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-muted/60 has-disabled:cursor-not-allowed has-disabled:opacity-50"
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={checked}
                      disabled={disabled || busy}
                      onChange={() => toggle(friend.userId)}
                    />
                    <span className="truncate">{friend.username ?? "Someone"}</span>
                  </label>
                )
              })}
            </div>
            {total >= MAX_SESSION_PEOPLE && (
              <p className="text-xs text-muted-foreground">A session can have up to {MAX_SESSION_PEOPLE} people.</p>
            )}
          </fieldset>
        ))}

      {!isEditing && selected.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Check className="size-3.5 text-green-600" />
          {selected.length === 1 ? "1 friend" : `${selected.length} friends`} will be invited when you add the
          workout. (A shared workout can&apos;t also repeat weekly.)
        </p>
      )}

      {(isEditing || members) && (
        <div className="flex flex-wrap gap-2">
          {canInvite && onInvite && pickable.length > 0 && (
            <Button type="button" size="sm" disabled={busy || selected.length === 0} onClick={onInvite}>
              <Send />
              Send invitation
            </Button>
          )}
          {members && onLeave && (
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setConfirmLeave(true)}>
              <LogOut />
              Leave this session
            </Button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Leave this session?"
        description="Your copy stays on your calendar as an ordinary workout, and your friends no longer see whether you completed it."
        confirmLabel="Leave session"
        busy={busy}
        onConfirm={async () => {
          await onLeave?.()
          setConfirmLeave(false)
        }}
      />
    </section>
  )
}
