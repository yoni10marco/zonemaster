import Link from "next/link"
import { CalendarDays, LayoutDashboard, Zap } from "lucide-react"

import { UserMenu } from "@/components/layout/UserMenu"

export function NavBar({ email }: { email: string }) {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <nav className="flex items-center gap-6">
          <Link
            href="/calendar"
            className="flex items-center gap-1.5 font-heading text-lg font-semibold text-primary"
          >
            <Zap className="size-5" />
            Zone Master
          </Link>
          <Link
            href="/calendar"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <CalendarDays className="size-4" />
            Calendar
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <LayoutDashboard className="size-4" />
            Dashboard
          </Link>
        </nav>
        <UserMenu email={email} />
      </div>
    </header>
  )
}
