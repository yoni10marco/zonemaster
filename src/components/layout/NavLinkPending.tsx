"use client"

import { useLinkStatus } from "next/link"

import { cn } from "@/lib/utils"

/**
 * A tiny dot shown next to a nav link while its page is still loading —
 * genuine feedback that a click registered and something is happening,
 * without a route-level loading.tsx (which hung this app; see ROADMAP.md).
 * Must render inside a <Link>; reserves its own space so nothing shifts when
 * it appears. A brief delay before fading in avoids flashing it on fast,
 * already-prefetched navigations, which are the common case.
 */
export function NavLinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus()
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-1.5 shrink-0 rounded-full bg-current opacity-0 transition-opacity",
        pending && "animate-pulse opacity-60 [transition-delay:150ms]",
        className
      )}
    />
  )
}
