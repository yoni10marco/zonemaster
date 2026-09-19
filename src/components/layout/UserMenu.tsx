"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Download, UserRound } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useInstallApp } from "@/hooks/useInstallApp"
import { createClient } from "@/lib/supabase/client"

export function UserMenu({ email }: { email: string }) {
  const router = useRouter()
  const installApp = useInstallApp()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  function handleInstall() {
    if (installApp.canPrompt) {
      installApp.install()
      return
    }
    // iPhone/iPad Safari has no install prompt, so explain the manual steps.
    toast.info("To install: tap the Share button, then choose Add to Home Screen.", { duration: 10000 })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="max-w-[10rem] gap-1.5 sm:max-w-none">
          <UserRound className="size-4 shrink-0" />
          <span className="truncate">{email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Signed in as {email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">Settings</Link>
        </DropdownMenuItem>
        {installApp.available && (
          <DropdownMenuItem onClick={handleInstall}>
            <Download />
            Install app
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
