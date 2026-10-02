import Link from "next/link"
import { CalendarDays, LayoutDashboard, Sparkles } from "lucide-react"

import { FriendsNavLink } from "@/components/friends/FriendsNavLink"
import { NavLinkPending } from "@/components/layout/NavLinkPending"
import { UserMenu } from "@/components/layout/UserMenu"
import { ZoneLogo } from "@/components/layout/ZoneLogo"

export function NavBar({ email }: { email: string }) {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-3 sm:px-4">
        <Link
          href="/calendar"
          aria-label="Zone Master"
          className="flex shrink-0 items-center gap-1.5 font-heading text-base font-semibold text-primary sm:text-lg"
        >
          <ZoneLogo className="size-7 shrink-0" />
          <span className="hidden sm:inline">Zone Master</span>
        </Link>
        {/* The same links move to BottomNav below the sm breakpoint, so there is only one nav at a time. */}
        <nav className="hidden min-w-0 items-center gap-3 sm:flex sm:gap-6">
          <Link
            href="/calendar"
            className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <CalendarDays className="size-4 shrink-0" />
            <span className="hidden sm:inline">Calendar</span>
            <NavLinkPending />
          </Link>
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <LayoutDashboard className="size-4 shrink-0" />
            <span className="hidden sm:inline">Dashboard</span>
            <NavLinkPending />
          </Link>
          <Link
            href="/coach"
            className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <Sparkles className="size-4 shrink-0" />
            <span className="hidden sm:inline">Coach</span>
            <NavLinkPending />
          </Link>
          <FriendsNavLink />
        </nav>
        <UserMenu email={email} />
      </div>
    </header>
  )
}
