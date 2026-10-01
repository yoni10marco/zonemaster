"use client"

import { usePathname } from "next/navigation"

/**
 * Wraps a layout's routed content so moving between pages (Calendar ->
 * Dashboard, say) gets a quick, deliberate fade instead of an abrupt pop,
 * while the surrounding nav/chrome stays mounted and interactive. Keying by
 * the path makes each navigation a fresh mount, which is what replays the
 * `animate-in` entrance below (the same fade-in Dialog and Select already use,
 * see globals.css for the prefers-reduced-motion opt-out).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div key={pathname} className="animate-in fade-in-0 duration-200">
      {children}
    </div>
  )
}
