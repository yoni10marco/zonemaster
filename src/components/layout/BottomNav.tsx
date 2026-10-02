"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, LayoutDashboard, Sparkles, UserRound, Users } from "lucide-react"

import { useFriendBadge } from "@/hooks/useFriendBadge"
import { NavLinkPending } from "@/components/layout/NavLinkPending"
import { useStartNavigationProgress } from "@/components/layout/NavigationProgress"
import { cn } from "@/lib/utils"

const TABS = [
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/coach", label: "Coach", icon: Sparkles },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/settings", label: "Profile", icon: UserRound },
] as const

/**
 * The mobile nav: a fixed bar across the bottom of the screen (the thumb-reach
 * pattern most phone apps use), shown only below the `sm` breakpoint. The
 * NavBar's own links are hidden at that width so there is exactly one nav.
 */
export function BottomNav() {
  const pathname = usePathname()
  const waiting = useFriendBadge()
  const startNavigation = useStartNavigationProgress()

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            onClick={startNavigation}
            aria-label={label === "Friends" && waiting > 0 ? `Friends, ${waiting} waiting` : label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="size-5" />
            {label}
            <NavLinkPending />
            {label === "Friends" && waiting > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-1 right-1/2 flex h-4 min-w-4 translate-x-3 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground"
              >
                {waiting > 9 ? "9+" : waiting}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
