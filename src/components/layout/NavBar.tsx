import Link from "next/link"
import { CalendarDays, LayoutDashboard, Sparkles, Zap } from "lucide-react"

import { UserMenu } from "@/components/layout/UserMenu"

export function NavBar({ email }: { email: string }) {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-3 sm:px-4">
        <nav className="flex min-w-0 items-center gap-3 sm:gap-6">
          <Link
            href="/calendar"
            className="flex shrink-0 items-center gap-1.5 font-heading text-base font-semibold text-primary sm:text-lg"
          >
            <Zap className="size-5 shrink-0" />
            <span className="hidden sm:inline">Zone Master</span>
          </Link>
          <Link
            href="/calendar"
            className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <CalendarDays className="size-4 shrink-0" />
            <span className="hidden sm:inline">Calendar</span>
          </Link>
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <LayoutDashboard className="size-4 shrink-0" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <Link
            href="/coach"
            className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <Sparkles className="size-4 shrink-0" />
            <span className="hidden sm:inline">Coach</span>
          </Link>
        </nav>
        <UserMenu email={email} />
      </div>
    </header>
  )
}
