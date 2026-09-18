import { redirect } from "next/navigation"

import { BackgroundIcons } from "@/components/layout/BackgroundIcons"
import { NavBar } from "@/components/layout/NavBar"
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
    <div className="flex min-h-full flex-1 flex-col">
      <BackgroundIcons />
      <NavBar email={user.email ?? ""} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  )
}
