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
        const delta = actualHours - plannedHours
        const style = DISCIPLINE_STYLES[v.discipline]

        return (
          <div key={v.discipline} className="flex items-center justify-between gap-3 p-3 text-sm">
            <Badge className={cn("border-0", style.badge)}>{DISCIPLINE_LABELS[v.discipline]}</Badge>
            <div className="flex flex-1 justify-end gap-4 text-muted-foreground">
              <span>{plannedHours}h planned</span>
              <span>{actualHours}h actual</span>
              {v.plannedMinutes > 0 && (
                <span className={cn(delta < 0 ? "text-amber-600" : "text-green-600")}>
                  {delta >= 0 ? "+" : ""}
                  {delta}h
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
