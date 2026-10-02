import { redirect } from "next/navigation"

import { BackgroundIcons } from "@/components/layout/BackgroundIcons"
import { BottomNav } from "@/components/layout/BottomNav"
import { NavBar } from "@/components/layout/NavBar"
import { NavigationProgressOverlay, NavigationProgressProvider } from "@/components/layout/NavigationProgress"
import { PageTransition } from "@/components/layout/PageTransition"
import { createClient } from "@/lib/supabase/server"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <NavigationProgressProvider>
      <div className="flex min-h-full flex-1 flex-col">
        <BackgroundIcons />
        <NavBar email={user.email ?? ""} />
        <main className="relative mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-24 sm:pb-6">
          <PageTransition>{children}</PageTransition>
          <NavigationProgressOverlay />
        </main>
        <BottomNav />
      </div>
    </NavigationProgressProvider>
  )
}
