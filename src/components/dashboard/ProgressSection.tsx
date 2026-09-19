import Link from "next/link"
import { format, parseISO } from "date-fns"
import { ChartColumn, Flag, Flame } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { RaceCountdown, WeekBucket, WeekStreak } from "@/lib/utils/progress"

type ProgressSectionProps = {
  race: RaceCountdown | null
  raceDate: string | null
  raceDistance: string | null
  streak: WeekStreak
  weeks: WeekBucket[]
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`
}

function RaceCard({ race, raceDate, raceDistance }: Pick<ProgressSectionProps, "race" | "raceDate" | "raceDistance">) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Flag className="size-4 text-primary" />
          {raceDistance ? `Race: ${raceDistance}` : "Target race"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {race === null ? (
          <p className="text-sm text-muted-foreground">
            No race set.{" "}
            <Link href="/settings" className="font-medium text-primary underline-offset-2 hover:underline">
              Add your target race
            </Link>{" "}
            to see a countdown.
          </p>
        ) : race.isToday ? (
          <p className="text-2xl font-semibold text-primary">Race day!</p>
        ) : race.isPast ? (
          <p className="text-sm text-muted-foreground">
            Your race on {format(parseISO(raceDate!), "MMM d, yyyy")} has passed.{" "}
            <Link href="/settings" className="font-medium text-primary underline-offset-2 hover:underline">
              Set a new one
            </Link>
            .
          </p>
        ) : (
          <>
            <p className="text-3xl font-semibold text-primary tabular-nums">{plural(race.days, "day")}</p>
            <p className="text-sm text-muted-foreground">
              {race.weeks > 0
                ? `${plural(race.weeks, "week")}${race.extraDays > 0 ? ` and ${plural(race.extraDays, "day")}` : ""} to go`
                : "to go"}{" "}
              &middot; {format(parseISO(raceDate!), "EEE, MMM d, yyyy")}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function StreakCard({ streak }: { streak: WeekStreak }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Flame className={cn("size-4", streak.current > 0 ? "text-orange-500" : "text-muted-foreground")} />
          Weekly streak
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {streak.current > 0 ? (
          <>
            <p className="text-3xl font-semibold tabular-nums">{plural(streak.current, "week")}</p>
            <p className="text-sm text-muted-foreground">
              in a row with a completed workout
              {streak.best > streak.current ? ` · best ${plural(streak.best, "week")}` : ""}
            </p>
          </>
        ) : (
          <>
            <p className="text-3xl font-semibold text-muted-foreground tabular-nums">0 weeks</p>
            <p className="text-sm text-muted-foreground">
              Complete a workout this week to start a streak
              {streak.best > 0 ? ` · best ${plural(streak.best, "week")}` : ""}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function TrendChart({ weeks }: { weeks: WeekBucket[] }) {
  const scale = Math.max(1, ...weeks.flatMap((w) => [w.planned, w.completed]))
  const summary = weeks
    .map((w) => `week of ${format(parseISO(w.start), "MMM d")}: ${w.completed} completed of ${w.planned} planned`)
    .join("; ")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ChartColumn className="size-4 text-primary" />
          Last {weeks.length} weeks
        </CardTitle>
        <CardDescription>Sessions completed compared with what you planned</CardDescription>
      </CardHeader>
      <CardContent>
        <div role="img" aria-label={`Weekly sessions. ${summary}`} className="flex items-end gap-1.5 sm:gap-3">
          {weeks.map((w) => (
            <div key={w.start} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className={cn("text-xs tabular-nums", w.isCurrent ? "font-semibold" : "text-muted-foreground")}>
                {w.completed}
                {w.planned > 0 ? `/${w.planned}` : ""}
              </span>
              <div className="relative flex h-28 w-full items-end justify-center">
                {w.planned > 0 && (
                  <div
                    className="absolute bottom-0 w-full rounded-t-md border-2 border-dashed border-primary/40"
                    style={{ height: `${(w.planned / scale) * 100}%` }}
                  />
                )}
                <div
                  className={cn("relative w-full rounded-t-md", w.isCurrent ? "bg-primary" : "bg-primary/70")}
                  style={{ height: `${(w.completed / scale) * 100}%`, minHeight: w.completed > 0 ? 4 : 0 }}
                />
              </div>
              <span
                className={cn(
                  "w-full truncate text-center text-[10px]",
                  w.isCurrent ? "font-semibold" : "text-muted-foreground"
                )}
              >
                {format(parseISO(w.start), "MMM d")}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm bg-primary/70" /> Completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm border-2 border-dashed border-primary/40" /> Planned
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export function ProgressSection({ race, raceDate, raceDistance, streak, weeks }: ProgressSectionProps) {
  return (
    <section aria-labelledby="progress-heading" className="space-y-3">
      <h2 id="progress-heading" className="font-heading text-base font-semibold">
        Progress
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <RaceCard race={race} raceDate={raceDate} raceDistance={raceDistance} />
        <StreakCard streak={streak} />
      </div>
      <TrendChart weeks={weeks} />
    </section>
  )
}
