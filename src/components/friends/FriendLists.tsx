"use client"

import { useState } from "react"
import { Ban, Check, Undo2, UserMinus, X } from "lucide-react"
import { toast } from "sonner"

import { Avatar } from "@/components/friends/Avatar"
import { ConfirmDialog } from "@/components/friends/ConfirmDialog"
import { Button } from "@/components/ui/button"
import type { Friendship } from "@/hooks/useFriends"

const NAME_FALLBACK = "Someone"

function Row({ friendship, children }: { friendship: Friendship; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border bg-card p-3">
      <Avatar name={friendship.username} />
      <p className="min-w-0 flex-1 truncate font-medium">{friendship.username ?? NAME_FALLBACK}</p>
      <div className="flex shrink-0 items-center gap-1.5">{children}</div>
    </li>
  )
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong"
}

type FriendsListProps = {
  friends: Friendship[]
  blocked: Friendship[]
  onRemove: (userId: string) => Promise<void>
  onBlock: (userId: string) => Promise<void>
  onUnblock: (userId: string) => Promise<void>
}

type Pending = { kind: "remove" | "block"; friendship: Friendship } | null

export function FriendsList({ friends, blocked, onRemove, onBlock, onUnblock }: FriendsListProps) {
  const [pending, setPending] = useState<Pending>(null)
  const [busy, setBusy] = useState(false)

  async function confirm() {
    if (!pending) return
    setBusy(true)
    try {
      if (pending.kind === "remove") {
        await onRemove(pending.friendship.userId)
        toast.success(`${pending.friendship.username ?? NAME_FALLBACK} was removed from your friends`)
      } else {
        await onBlock(pending.friendship.userId)
        toast.success(`${pending.friendship.username ?? NAME_FALLBACK} was blocked`)
      }
      setPending(null)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const name = pending?.friendship.username ?? NAME_FALLBACK

  return (
    <div className="space-y-5">
      {friends.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No friends yet. Use the <strong>Add friend</strong> tab with a friend&apos;s username and friend ID.
        </p>
      ) : (
        <ul className="space-y-2">
          {friends.map((friend) => (
            <Row key={friend.friendshipId} friendship={friend}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPending({ kind: "remove", friendship: friend })}
                aria-label={`Remove ${friend.username ?? NAME_FALLBACK} from friends`}
              >
                <UserMinus />
                <span className="hidden sm:inline">Unfriend</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPending({ kind: "block", friendship: friend })}
                aria-label={`Block ${friend.username ?? NAME_FALLBACK}`}
              >
                <Ban />
                <span className="hidden sm:inline">Block</span>
              </Button>
            </Row>
          ))}
        </ul>
      )}

      {blocked.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Blocked</h3>
          <ul className="space-y-2">
            {blocked.map((person) => (
              <Row key={person.friendshipId} friendship={person}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onUnblock(person.userId).then(
                      () => toast.success(`${person.username ?? NAME_FALLBACK} was unblocked`),
                      (err) => toast.error(errorMessage(err))
                    )
                  }
                >
                  <Undo2 />
                  Unblock
                </Button>
              </Row>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending?.kind === "block" ? `Block ${name}?` : `Unfriend ${name}?`}
        description={
          pending?.kind === "block"
            ? `${name} won't be able to find you or send you requests, and you will stop being friends. You can unblock them later.`
            : `You and ${name} will no longer be friends. Either of you can send a new request later.`
        }
        confirmLabel={pending?.kind === "block" ? "Block" : "Unfriend"}
        destructive
        busy={busy}
        onConfirm={confirm}
      />
    </div>
  )
}

type RequestsListProps = {
  incoming: Friendship[]
  outgoing: Friendship[]
  onRespond: (friendshipId: number, accept: boolean) => Promise<void>
  onCancel: (friendshipId: number) => Promise<void>
}

export function RequestsList({ incoming, outgoing, onRespond, onCancel }: RequestsListProps) {
  const [busyId, setBusyId] = useState<number | null>(null)

  async function run(id: number, action: () => Promise<void>, message: string) {
    setBusyId(id)
    try {
      await action()
      toast.success(message)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  if (incoming.length === 0 && outgoing.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        No pending requests.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {incoming.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Wants to be your friend</h3>
          <ul className="space-y-2">
            {incoming.map((request) => (
              <Row key={request.friendshipId} friendship={request}>
                <Button
                  size="sm"
                  disabled={busyId === request.friendshipId}
                  onClick={() =>
                    run(
                      request.friendshipId,
                      () => onRespond(request.friendshipId, true),
                      `You and ${request.username ?? NAME_FALLBACK} are now friends`
                    )
                  }
                >
                  <Check />
                  Accept
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busyId === request.friendshipId}
                  onClick={() =>
                    run(request.friendshipId, () => onRespond(request.friendshipId, false), "Request declined")
                  }
                >
                  <X />
                  Decline
                </Button>
              </Row>
            ))}
          </ul>
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Waiting for them to accept</h3>
          <ul className="space-y-2">
            {outgoing.map((request) => (
              <Row key={request.friendshipId} friendship={request}>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busyId === request.friendshipId}
                  onClick={() =>
                    run(request.friendshipId, () => onCancel(request.friendshipId), "Request cancelled")
                  }
                >
                  <X />
                  Cancel
                </Button>
              </Row>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
