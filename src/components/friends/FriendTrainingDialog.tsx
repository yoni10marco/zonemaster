"use client"

import { FriendsTrainingList } from "@/components/friends/FriendsTrainingList"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { FriendWorkout } from "@/hooks/useFriendsWorkouts"

type FriendTrainingDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  username: string | null
  workouts: FriendWorkout[]
}

/** One friend's shared planned workouts for the last and next 7 days, opened
 *  from their row in the Friends list. */
export function FriendTrainingDialog({ open, onOpenChange, username, workouts }: FriendTrainingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{username ?? "Friend"}&apos;s training</DialogTitle>
          <DialogDescription>Planned for the last and next 7 days.</DialogDescription>
        </DialogHeader>
        <FriendsTrainingList workouts={workouts} loading={false} error={null} showFriend={false} />
      </DialogContent>
    </Dialog>
  )
}
