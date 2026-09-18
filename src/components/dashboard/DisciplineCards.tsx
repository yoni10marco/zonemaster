import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { DISCIPLINE_LABELS } from "@/lib/types/domain"
import { DISCIPLINE_STYLES } from "@/lib/utils/discipline-style"
import type { DisciplineVolume } from "@/lib/utils/volume"
import { minutesToHours } from "@/lib/utils/volume"
import { cn } from "@/lib/utils"

type MetricRowProps = {
  label: string
  actual: number
  planned: number
  unit: string
}

function MetricRow({ label, actual, planned, unit }: MetricRowProps) {
  const hasPlan = planned > 0
  const pct = hasPlan ? Math.round((actual / planned) * 100) : null
  const barWidth = hasPlan ? Math.min((actual / planned) * 100, 100) : 0

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>
          {actual}
          {unit} {hasPlan ? `/ ${planned}${unit}` : "logged (not planned)"}
          {pct !== null && <span className="ml-1.5 font-medium text-foreground">{pct}%</span>}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        {hasPlan && (
          <div
            className={cn("h-full rounded-full", actual >= planned ? "bg-green-500" : "bg-primary")}
            style={{ width: `${barWidth}%` }}
          />
        )}
      </div>
    </div>
  )
}

// One card per discipline instead of a shared chart: bike distances are
// routinely far larger than run/swim distances, and any discipline can be
// tracked by duration, distance, or both from session to session — a single
// shared axis or unit would either dwarf smaller disciplines or hide
// whichever metric wasn't picked as "the" one for that discipline.
export function DisciplineCards({ volumes }: { volumes: DisciplineVolume[] }) {
  if (volumes.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No workouts planned or logged this week yet.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {volumes.map((v) => {
        const style = DISCIPLINE_STYLES[v.discipline]
        const showHours = v.plannedMinutes > 0 || v.actualMinutes > 0
        const showKm = v.plannedKm > 0 || v.actualKm > 0

        return (
          <Card key={v.discipline}>
            <CardHeader className="pb-2">
              <Badge className={cn("w-fit border-0", style.badge)}>
                {DISCIPLINE_LABELS[v.discipline]}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {showHours && (
                <MetricRow
                  label="Duration"
                  actual={minutesToHours(v.actualMinutes)}
                  planned={minutesToHours(v.plannedMinutes)}
                  unit="h"
                />
              )}
              {showKm && <MetricRow label="Distance" actual={v.actualKm} planned={v.plannedKm} unit="km" />}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
