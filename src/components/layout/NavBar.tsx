import Link from "next/link"

import { UserMenu } from "@/components/layout/UserMenu"

export function NavBar({ email }: { email: string }) {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <nav className="flex items-center gap-6">
          <Link href="/calendar" className="font-heading text-lg font-semibold">
            Zone Master
          </Link>
          <Link href="/calendar" className="text-sm text-muted-foreground hover:text-foreground">
            Calendar
          </Link>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            Dashboard
          </Link>
        </nav>
        <UserMenu email={email} />
      </div>
    </header>
  )
}
