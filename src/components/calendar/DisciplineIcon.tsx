import { cn } from "@/lib/utils"
import { ZONE_COLORS, type Discipline, type IntensityZone } from "@/lib/types/domain"
import { DISCIPLINE_ICONS, DISCIPLINE_STYLES } from "@/lib/utils/discipline-style"

/**
 * The same colored icon circle the calendar card uses for a discipline,
 * reused in the workout form's Discipline picker (and its dialog title) so a
 * workout's color is visible from the moment you're creating it, not only
 * once it's on the calendar.
 */
export function DisciplineIcon({ discipline, className }: { discipline: Discipline; className?: string }) {
  const Icon = DISCIPLINE_ICONS[discipline]
  return (
    <div
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full",
        DISCIPLINE_STYLES[discipline].iconBg,
        className
      )}
    >
      <Icon className="size-3" />
    </div>
  )
}

/** A small color swatch for a zone (the same five colors as the zone-dial logo), for the zone picker. */
export function ZoneDot({ zone, className }: { zone: IntensityZone; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-2.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: ZONE_COLORS[zone] }}
    />
  )
}
