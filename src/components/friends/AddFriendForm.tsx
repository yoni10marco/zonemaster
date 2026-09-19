"use client"

import { useState } from "react"
import { Check, Clock, Loader2, Search, UserPlus } from "lucide-react"
import { toast } from "sonner"

import { Avatar } from "@/components/friends/Avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { FoundUser } from "@/hooks/useFriends"
import { findFriendSchema, normalizeFriendCode, normalizeUsername } from "@/lib/validation/friends"

type AddFriendFormProps = {
  findUser: (username: string, friendCode: string) => Promise<FoundUser | null>
  sendRequest: (userId: string) => Promise<void>
  /** They already asked you: accept their request instead of sending a new one. */
  acceptIncoming: (userId: string) => Promise<void>
}

export function AddFriendForm({ findUser, sendRequest, acceptIncoming }: AddFriendFormProps) {
  const [username, setUsername] = useState("")
  const [friendCode, setFriendCode] = useState("")
  const [searching, setSearching] = useState(false)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // undefined = not searched yet, null = searched and nobody matched
  const [result, setResult] = useState<FoundUser | null | undefined>(undefined)

  async function search() {
    const parsed = findFriendSchema.safeParse({ username, friendCode })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }
    setError(null)
    setSearching(true)
    setResult(undefined)
    try {
      setResult(await findUser(normalizeUsername(username), normalizeFriendCode(friendCode)))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't search right now")
    } finally {
      setSearching(false)
    }
  }

  async function act(run: () => Promise<void>, relationship: FoundUser["relationship"], message: string) {
    if (!result) return
    setActing(true)
    try {
      await run()
      setResult({ ...result, relationship })
      toast.success(message)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setActing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="size-4 text-primary" />
          Add a friend
        </CardTitle>
        <CardDescription>
          Ask your friend for their username and friend ID (they can find both in Settings). Both must
          match exactly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            search()
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="friend-username">Username</Label>
              <Input
                id="friend-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. alex_runs"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="friend-code">Friend ID</Label>
              <Input
                id="friend-code"
                value={friendCode}
                onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                placeholder="e.g. K7M2-9QXA"
                className="font-mono tracking-wider"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={searching}>
            {searching ? <Loader2 className="animate-spin" /> : <Search />}
            Find
          </Button>
        </form>

        {result === null && (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground" role="status">
            No one matches that username and friend ID. Check both with your friend: they have to match
            exactly.
          </p>
        )}

        {result && (
          <div className="flex items-center gap-3 rounded-xl border p-3" role="status">
            <Avatar name={result.username} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{result.username}</p>
              <p className="text-sm text-muted-foreground">
                {result.relationship === "friends"
                  ? "You're already friends"
                  : result.relationship === "pending_out"
                    ? "Request sent, waiting for them to accept"
                    : result.relationship === "pending_in"
                      ? "They already sent you a request"
                      : "Found"}
              </p>
            </div>
            {result.relationship === "none" && (
              <Button
                disabled={acting}
                onClick={() =>
                  act(() => sendRequest(result.userId), "pending_out", `Request sent to ${result.username}`)
                }
              >
                <UserPlus />
                Send request
              </Button>
            )}
            {result.relationship === "pending_in" && (
              <Button
                disabled={acting}
                onClick={() =>
                  act(() => acceptIncoming(result.userId), "friends", `You and ${result.username} are now friends`)
                }
              >
                <Check />
                Accept
              </Button>
            )}
            {result.relationship === "pending_out" && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="size-4" />
                Pending
              </span>
            )}
            {result.relationship === "friends" && <Check className="size-5 text-green-600" aria-label="Friends" />}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
