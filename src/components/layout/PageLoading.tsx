import { ZoneLogo } from "@/components/layout/ZoneLogo"

/**
 * The instant loading state Next.js shows (via loading.tsx) the moment a
 * navigation starts, before the destination page's own content — or, for an
 * async page like the coach, before it has even fetched anything — is ready.
 * Shown in place of a blank screen; the app's nav/chrome around it stays put.
 */
export function PageLoading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
      <ZoneLogo className="size-10 animate-spin" />
      <p className="text-sm">Loading…</p>
    </div>
  )
}
