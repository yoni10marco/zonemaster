"use client"

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ActivityListDialog } from "@/components/dashboard/ActivityListDialog"
import { DisciplineCards } from "@/components/dashboard/DisciplineCards"
import { SessionCompletionCard } from "@/components/dashboard/SessionCompletionCard"
import { usePlannedWorkouts } from "@/hooks/usePlannedWorkouts"
import { useCompletedWorkouts } from "@/hooks/useCompletedWorkouts"
import type { Discipline } from "@/lib/types/domain"
import { format, monthRange, nextAnchor, prevAnchor, weekRange } from "@/lib/utils/dates"
import { activityCounts, sessionCompletion } from "@/lib/utils/volume"

type Period = "week" | "month" | "all"

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("week")
  const [anchor, setAnchor] = useState(new Date())
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null)

  const range = useMemo(() => {
    if (period === "week") return weekRange(anchor)
    if (period === "month") return monthRange(anchor)
    return { start: null, end: null }
  }, [period, anchor])

  const periodLabel = useMemo(() => {
    if (period === "week") return `${format(range.start!, "MMM d")} – ${format(range.end!, "MMM d, yyyy")}`
    if (period === "month") return format(anchor, "MMMM yyyy")
    return "All time"
  }, [period, anchor, range])

  const { workouts, loading: loadingPlanned } = usePlannedWorkouts(range.start, range.end)
  const { completions, loading: loadingCompleted } = useCompletedWorkouts(range.start, range.end)

  const sessions = useMemo(() => sessionCompletion(workouts, completions), [workouts, completions])
  const counts = useMemo(() => activityCounts(completions), [completions])

  const loading = loadingPlanned || loadingCompleted

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {period !== "all" && (
            <>
              <Button variant="outline" size="sm" onClick={() => setAnchor(prevAnchor(anchor, period))}>
                Prev
              </Button>
              <h1 className="font-heading min-w-48 text-center text-lg font-semibold">{periodLabel}</h1>
              <Button variant="outline" size="sm" onClick={() => setAnchor(nextAnchor(anchor, period))}>
                Next
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setAnchor(new Date())}>
                Today
              </Button>
            </>
          )}
          {period === "all" && <h1 className="font-heading text-lg font-semibold">All time</h1>}
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="all">All time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full max-w-xs" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <SessionCompletionCard
            completed={sessions.completed}
            total={sessions.total}
            periodLabel={period === "all" ? "All-time" : period === "week" ? "This week's" : "This month's"}
          />
          <DisciplineCards counts={counts} onSelect={setSelectedDiscipline} />
        </>
      )}

      <ActivityListDialog
        discipline={selectedDiscipline}
        onOpenChange={(open) => !open && setSelectedDiscipline(null)}
      />
    </div>
  )
}
