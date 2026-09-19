"use client"

import { Users } from "lucide-react"

import { AddFriendForm } from "@/components/friends/AddFriendForm"
import { FriendsList, RequestsList } from "@/components/friends/FriendLists"
import { MyFriendIdCard } from "@/components/friends/MyFriendIdCard"
import { SessionInvitesList } from "@/components/friends/SessionInvitesList"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFriends } from "@/hooks/useFriends"
import { useSessionInvites } from "@/hooks/useSessionInvites"

export default function FriendsPage() {
  const friends = useFriends()
  const sessions = useSessionInvites()
  // Everything waiting for an answer: friend requests and session invitations.
  const waiting = friends.incoming.length + sessions.invites.length
  const nothingPending = waiting === 0 && friends.outgoing.length === 0

  // They already asked you and are found again in a search: accept that request.
  async function acceptIncoming(userId: string) {
    const request = friends.incoming.find((f) => f.userId === userId)
    if (!request) throw new Error("That request is no longer available.")
    await friends.respond(request.friendshipId, true)
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="flex items-center gap-2 font-heading text-lg font-semibold">
          <Users className="size-4 text-primary" />
          Friends
        </h1>
        <p className="text-sm text-muted-foreground">
          Friends only ever see the sessions you plan together, never the rest of your calendar.
        </p>
      </div>

      {friends.error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          Couldn&apos;t load your friends: {friends.error}
        </p>
      )}

      <Tabs defaultValue="friends" className="gap-4">
        <TabsList className="w-full group-data-horizontal/tabs:h-10">
          <TabsTrigger value="friends">Friends</TabsTrigger>
          <TabsTrigger value="requests">
            Requests
            {waiting > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {waiting}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="add">Add friend</TabsTrigger>
        </TabsList>

        <TabsContent value="friends">
          {friends.loading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <FriendsList
              friends={friends.friends}
              blocked={friends.blocked}
              onRemove={friends.removeFriend}
              onBlock={friends.blockUser}
              onUnblock={friends.unblockUser}
            />
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-5">
          {friends.loading || sessions.loading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <>
              <SessionInvitesList invites={sessions.invites} onRespond={sessions.respond} />
              {(friends.incoming.length > 0 || friends.outgoing.length > 0 || nothingPending) && (
                <RequestsList
                  incoming={friends.incoming}
                  outgoing={friends.outgoing}
                  onRespond={friends.respond}
                  onCancel={friends.cancelRequest}
                />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="add" className="space-y-4">
          <AddFriendForm
            findUser={friends.findUser}
            sendRequest={friends.sendRequest}
            acceptIncoming={acceptIncoming}
          />
          <MyFriendIdCard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
