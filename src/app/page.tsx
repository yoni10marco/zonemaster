import Link from "next/link"
import { redirect } from "next/navigation"
import { Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/calendar")
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Zap className="size-8 text-brand-blue" />
          <h1 className="bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text font-heading text-4xl font-semibold tracking-tight text-transparent">
            Zone Master
          </h1>
        </div>
        <p className="max-w-sm text-muted-foreground">
          Plan, track, and analyze your endurance training &mdash; on your terms.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/signup">Get started</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Log in</Link>
        </Button>
      </div>
    </div>
  )
}
