import { cn } from "@/lib/utils"

// A round badge with the person's initial. Zone Master has no profile photos,
// so this is the only thing that stands in for one.
export function Avatar({ name, className }: { name: string | null; className?: string }) {
  const initial = (name?.trim()[0] ?? "?").toUpperCase()
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary",
        className
      )}
    >
      {initial}
    </span>
  )
}
