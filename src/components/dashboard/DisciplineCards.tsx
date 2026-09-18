import { ListFilter } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { DISCIPLINE_LABELS } from "@/lib/types/domain"
import { DISCIPLINE_ICONS, DISCIPLINE_STYLES } from "@/lib/utils/discipline-style"
import type { DisciplineActivityCount } from "@/lib/utils/volume"
import { cn } from "@/lib/utils"

type DisciplineCardsProps = {
  counts: DisciplineActivityCount[]
  onSelect: (discipline: DisciplineActivityCount["discipline"]) => void
}

export function DisciplineCards({ counts, onSelect }: DisciplineCardsProps) {
  if (counts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
        <ListFilter className="size-8 text-muted-foreground/50" />
        No activities logged for this period yet.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {counts.map(({ discipline, count }) => {
        const style = DISCIPLINE_STYLES[discipline]
        const Icon = DISCIPLINE_ICONS[discipline]

        return (
          <button key={discipline} type="button" onClick={() => onSelect(discipline)} className="text-left">
            <Card className="transition-shadow hover:shadow-md hover:ring-1 hover:ring-ring">
              <CardContent className="flex flex-col items-start gap-2">
                <div className="flex w-full items-center justify-between">
                  <Badge className={cn("border-0", style.badge)}>{DISCIPLINE_LABELS[discipline]}</Badge>
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-semibold">{count}</p>
                <p className="text-xs text-muted-foreground">
                  {count === 1 ? "activity" : "activities"} &mdash; view all
                </p>
              </CardContent>
            </Card>
          </button>
        )
      })}
    </div>
  )
}
