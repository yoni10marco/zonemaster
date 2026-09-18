import { createClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/types/database.types"

export class MissingServiceRoleKeyError extends Error {
  constructor() {
    super("SUPABASE_SERVICE_ROLE_KEY is not configured")
    this.name = "MissingServiceRoleKeyError"
  }
}

// Bypasses RLS — server-only, never import from a client component. Used for
// things the browser must not touch (OAuth tokens) and for cron jobs that
// run without a user session.
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) throw new MissingServiceRoleKeyError()

  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export type AdminClient = ReturnType<typeof createAdminClient>
