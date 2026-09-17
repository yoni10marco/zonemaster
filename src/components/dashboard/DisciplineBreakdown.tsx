import { Badge } from "@/components/ui/badge"
import { DISCIPLINE_LABELS } from "@/lib/types/domain"
import { DISCIPLINE_STYLES } from "@/lib/utils/discipline-style"
import type { DisciplineVolume } from "@/lib/utils/volume"
import { minutesToHours } from "@/lib/utils/volume"
import { cn } from "@/lib/utils"

export function DisciplineBreakdown({ volumes }: { volumes: DisciplineVolume[] }) {
  if (volumes.length === 0) return null

  return (
    <div className="divide-y rounded-md border">
      {volumes.map((v) => {
        const plannedHours = minutesToHours(v.plannedMinutes)
        const actualHours = minutesToHours(v.actualMinutes)
        const hoursDelta = actualHours - plannedHours
        const kmDelta = v.actualKm - v.plannedKm
        const style = DISCIPLINE_STYLES[v.discipline]

        // A discipline may be tracked by duration, distance, or both (a
        // distance-only bike ride has 0 minutes) — show whichever metrics
        // actually have data instead of always defaulting to hours.
        const showHours = v.plannedMinutes > 0 || v.actualMinutes > 0
        const showKm = v.plannedKm > 0 || v.actualKm > 0

        return (
          <div key={v.discipline} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
            <Badge className={cn("border-0", style.badge)}>{DISCIPLINE_LABELS[v.discipline]}</Badge>
            <div className="flex flex-1 flex-wrap justify-end gap-4 text-muted-foreground">
              {showHours && (
                <>
                  <span>{plannedHours}h planned</span>
                  <span>{actualHours}h actual</span>
                  <span className={cn(hoursDelta < 0 ? "text-amber-600" : "text-green-600")}>
                    {hoursDelta >= 0 ? "+" : ""}
                    {hoursDelta}h
                  </span>
                </>
              )}
              {showKm && (
                <>
                  <span>{v.plannedKm}km planned</span>
                  <span>{v.actualKm}km actual</span>
                  <span className={cn(kmDelta < 0 ? "text-amber-600" : "text-green-600")}>
                    {kmDelta >= 0 ? "+" : ""}
                    {kmDelta}km
                  </span>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
