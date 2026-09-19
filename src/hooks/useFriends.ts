"use client"

import { useCallback, useEffect, useState } from "react"

import { createClient } from "@/lib/supabase/client"

export const FRIENDS_CHANGED_EVENT = "friends:changed"

export type FriendKind = "friend" | "incoming" | "outgoing" | "blocked"
export type Relationship = "none" | "friends" | "pending_out" | "pending_in"

export type Friendship = {
  friendshipId: number
  userId: string
  /** Null only for an account that hasn't chosen a username yet. */
  username: string | null
  kind: FriendKind
  createdAt: string
}

export type FoundUser = {
  userId: string
  username: string
  relationship: Relationship
}

function unwrap<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message)
  return result.data
}

// Every friend action goes through a database function (the browser has no
// direct access to the friend tables), and only ever gets back a username and
// the state of the relationship.
export function useFriends() {
  const [friendships, setFriendships] = useState<Friendship[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase.rpc("list_friendships")
    if (error) {
      setError(error.message)
    } else {
      setError(null)
      setFriendships(
        data.map((row) => ({
          friendshipId: row.friendship_id,
          userId: row.other_user_id,
          username: row.username,
          kind: row.kind as FriendKind,
          createdAt: row.created_at,
        }))
      )
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // Standard fetch-on-mount pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch()
  }, [refetch])

  // Runs an action, refreshes the list, and tells the menu badge to recount.
  async function act(action: () => PromiseLike<{ error: { message: string } | null }>) {
    const result = await action()
    if (result.error) throw new Error(result.error.message)
    await refetch()
    window.dispatchEvent(new Event(FRIENDS_CHANGED_EVENT))
  }

  async function findUser(username: string, friendCode: string): Promise<FoundUser | null> {
    const supabase = createClient()
    const rows =
      unwrap(await supabase.rpc("find_user", { p_username: username, p_friend_code: friendCode })) ?? []
    const row = rows[0]
    return row
      ? { userId: row.user_id, username: row.username, relationship: row.relationship as Relationship }
      : null
  }

  const supabase = createClient()
  return {
    friendships,
    friends: friendships.filter((f) => f.kind === "friend"),
    incoming: friendships.filter((f) => f.kind === "incoming"),
    outgoing: friendships.filter((f) => f.kind === "outgoing"),
    blocked: friendships.filter((f) => f.kind === "blocked"),
    loading,
    error,
    refetch,
    findUser,
    sendRequest: (userId: string) => act(() => supabase.rpc("send_friend_request", { p_user_id: userId })),
    respond: (friendshipId: number, accept: boolean) =>
      act(() => supabase.rpc("respond_friend_request", { p_friendship_id: friendshipId, p_accept: accept })),
    cancelRequest: (friendshipId: number) =>
      act(() => supabase.rpc("cancel_friend_request", { p_friendship_id: friendshipId })),
    removeFriend: (userId: string) => act(() => supabase.rpc("remove_friend", { p_user_id: userId })),
    blockUser: (userId: string) => act(() => supabase.rpc("block_user", { p_user_id: userId })),
    unblockUser: (userId: string) => act(() => supabase.rpc("unblock_user", { p_user_id: userId })),
  }
}
