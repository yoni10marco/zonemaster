"use client"

import { useMemo, useState } from "react"
import { subDays, subWeeks } from "date-fns"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ActivityListDialog } from "@/components/dashboard/ActivityListDialog"
import { DisciplineCards } from "@/components/dashboard/DisciplineCards"
import { ProgressSection } from "@/components/dashboard/ProgressSection"
import { SessionCompletionCard } from "@/components/dashboard/SessionCompletionCard"
import { usePlannedWorkouts } from "@/hooks/usePlannedWorkouts"
import { useCompletedWorkouts } from "@/hooks/useCompletedWorkouts"
import { useProfile } from "@/hooks/useProfile"
import type { Discipline } from "@/lib/types/domain"
import { format, monthRange, nextAnchor, prevAnchor, weekRange } from "@/lib/utils/dates"
import { raceCountdown, weekStreak, weeklyTrend } from "@/lib/utils/progress"
import { activityCounts, sessionCompletion } from "@/lib/utils/volume"

const TREND_WEEKS = 8

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

  // Progress panel: fixed windows independent of the period selector above.
  const today = useMemo(() => new Date(), [])
  const trendStart = useMemo(() => subWeeks(weekRange(today).start, TREND_WEEKS - 1), [today])
  const { workouts: trendPlanned } = usePlannedWorkouts(trendStart, weekRange(today).end)
  // Through the end of this week, not just today: a workout ticked off ahead of
  // time is dated later in the week and must still count.
  const { completions: yearCompletions } = useCompletedWorkouts(subDays(today, 400), weekRange(today).end)
  const { profile } = useProfile()

  const progress = useMemo(() => {
    const completedDates = yearCompletions.map((c) => c.execution_date)
    return {
      weeks: weeklyTrend(trendPlanned.map((w) => w.target_date), completedDates, TREND_WEEKS, today),
      streak: weekStreak(completedDates, today),
      race: raceCountdown(profile?.target_race_date, today),
    }
  }, [trendPlanned, yearCompletions, profile?.target_race_date, today])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {period !== "all" && (
            <>
              <Button variant="outline" size="sm" onClick={() => setAnchor(prevAnchor(anchor, period))}>
                Prev
              </Button>
              <h1 className="font-heading min-w-32 text-center text-sm font-semibold sm:min-w-48 sm:text-lg">
                {periodLabel}
              </h1>
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
          <ProgressSection
            race={progress.race}
            raceDate={profile?.target_race_date ?? null}
            raceDistance={profile?.target_race_distance ?? null}
            streak={progress.streak}
            weeks={progress.weeks}
          />
        </>
      )}

      <ActivityListDialog
        discipline={selectedDiscipline}
        onOpenChange={(open) => !open && setSelectedDiscipline(null)}
      />
    </div>
  )
}
