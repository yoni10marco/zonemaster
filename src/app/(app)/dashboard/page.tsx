"use client"

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CompletionRateCard } from "@/components/dashboard/CompletionRateCard"
import { DisciplineBreakdown } from "@/components/dashboard/DisciplineBreakdown"
import { WeeklySummaryChart } from "@/components/dashboard/WeeklySummaryChart"
import { usePlannedWorkouts } from "@/hooks/usePlannedWorkouts"
import { useCompletedWorkouts } from "@/hooks/useCompletedWorkouts"
import { format, nextAnchor, prevAnchor, weekRange } from "@/lib/utils/dates"
import { aggregateVolume, completionRate } from "@/lib/utils/volume"

export default function DashboardPage() {
  const [anchor, setAnchor] = useState(new Date())
  const range = useMemo(() => weekRange(anchor), [anchor])

  const { workouts, loading: loadingPlanned } = usePlannedWorkouts(range.start, range.end)
  const { completions, loading: loadingCompleted } = useCompletedWorkouts(range.start, range.end)

  const volumes = useMemo(() => aggregateVolume(workouts, completions), [workouts, completions])
  const rate = useMemo(() => completionRate(volumes), [volumes])

  const loading = loadingPlanned || loadingCompleted

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAnchor(prevAnchor(anchor, "week"))}>
            Prev
          </Button>
          <h1 className="min-w-48 text-center text-lg font-semibold">
            {format(range.start, "MMM d")} – {format(range.end, "MMM d, yyyy")}
          </h1>
          <Button variant="outline" size="sm" onClick={() => setAnchor(nextAnchor(anchor, "week"))}>
            Next
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAnchor(new Date())}>
            This week
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full max-w-xs" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <CompletionRateCard rate={rate} />
          <WeeklySummaryChart volumes={volumes} />
          <DisciplineBreakdown volumes={volumes} />
        </>
      )}
    </div>
  )
}
