"use client"

import Link from "next/link"
import { Users } from "lucide-react"

import { useFriendBadge } from "@/hooks/useFriendBadge"

export function FriendsNavLink() {
  const waiting = useFriendBadge()

  return (
    <Link
      href="/friends"
      aria-label={waiting > 0 ? `Friends, ${waiting} waiting` : "Friends"}
      className="relative flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <Users className="size-4 shrink-0" />
      <span className="hidden sm:inline">Friends</span>
      {waiting > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-2 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground sm:static sm:ml-0.5"
        >
          {waiting > 9 ? "9+" : waiting}
        </span>
      )}
    </Link>
  )
}
