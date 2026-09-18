"use client"

import { useState } from "react"
import Link from "next/link"
import { addWeeks, format, parseISO } from "date-fns"
import { CalendarCheck, Check, Loader2, Sparkles, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ParsedPlan, WorkoutDraft } from "@/lib/coach/plan"
import { createClient } from "@/lib/supabase/client"
import { DISCIPLINE_LABELS, ZONE_LABELS } from "@/lib/types/domain"
import { cn } from "@/lib/utils"
import { toISODate, weekRange } from "@/lib/utils/dates"
import { formatDistance } from "@/lib/utils/distance"
import { DISCIPLINE_ICONS, DISCIPLINE_STYLES } from "@/lib/utils/discipline-style"

type WeekChoice = "this" | "next"
type DraftItem = { key: string; draft: WorkoutDraft }

function weekStartISO(choice: WeekChoice): string {
  const anchor = choice === "this" ? new Date() : addWeeks(new Date(), 1)
  return toISODate(weekRange(anchor).start)
}

export function PlanWeekPanel() {
  const [week, setWeek] = useState<WeekChoice>("next")
  const [focus, setFocus] = useState("")
  const [generating, setGenerating] = useState(false)
  const [summary, setSummary] = useState("")
  const [items, setItems] = useState<DraftItem[] | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [addedCount, setAddedCount] = useState(0)

  async function generate() {
    setGenerating(true)
    setItems(null)
    setAddedCount(0)
    try {
      const res = await fetch("/api/coach/plan-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart: weekStartISO(week),
          today: toISODate(new Date()),
          ...(focus.trim() ? { focus: focus.trim() } : {}),
        }),
      })
      if (res.redirected) throw new Error("Your session expired — please log in again")
      const body = (await res.json().catch(() => null)) as (ParsedPlan & { error?: string }) | null
      if (!res.ok || !body) throw new Error(body?.error ?? "The coach is unavailable right now")

      setSummary(body.summary)
      setItems(body.drafts.map((draft, i) => ({ key: `${draft.date}-${i}`, draft })))
      if (body.drafts.length === 0) toast.info("The coach didn't suggest any workouts — try again")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The coach is unavailable right now")
    } finally {
      setGenerating(false)
    }
  }

  async function insertDrafts(drafts: WorkoutDraft[]) {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    const { error } = await supabase.from("planned_workouts").insert(
      drafts.map((d) => ({
        user_id: user.id,
        target_date: d.date,
        discipline: d.discipline,
        planned_duration_minutes: d.durationMinutes,
        planned_distance_km: d.distanceKm,
        target_zone: d.zone,
        title: d.title,
        notes: d.notes,
      }))
    )
    if (error) throw new Error(error.message)
  }

  async function accept(item: DraftItem) {
    setBusyKey(item.key)
    try {
      await insertDrafts([item.draft])
      setItems((prev) => prev?.filter((i) => i.key !== item.key) ?? null)
      setAddedCount((n) => n + 1)
      toast.success("Added to your calendar")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add that workout")
    } finally {
      setBusyKey(null)
    }
  }

  async function acceptAll() {
    if (!items?.length) return
    setBusyKey("all")
    try {
      await insertDrafts(items.map((i) => i.draft))
      setAddedCount((n) => n + items.length)
      setItems([])
      toast.success(`Added ${items.length} workouts to your calendar`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add the workouts")
    } finally {
      setBusyKey(null)
    }
  }

  function reject(key: string) {
    setItems((prev) => prev?.filter((i) => i.key !== key) ?? null)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border bg-card p-3 sm:p-4">
        <p className="text-sm text-muted-foreground">
          The coach drafts a week based on your history and goal. Nothing is added to your calendar until
          you accept it.
        </p>
        <div className="flex flex-wrap gap-2">
          {(["this", "next"] as const).map((choice) => (
            <Button
              key={choice}
              variant={week === choice ? "default" : "outline"}
              size="sm"
              onClick={() => setWeek(choice)}
              disabled={generating}
            >
              {choice === "this" ? "This week" : "Next week"}
            </Button>
          ))}
        </div>
        <Input
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="Optional focus, e.g. build swim endurance"
          maxLength={300}
          disabled={generating}
        />
        <Button onClick={generate} disabled={generating}>
          {generating ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {generating ? "Planning..." : "Plan my week"}
        </Button>
      </div>

      {items && (
        <div className="space-y-3">
          {summary && <p className="rounded-lg bg-muted px-3 py-2 text-sm">{summary}</p>}

          {items.length > 1 && (
            <Button variant="secondary" size="sm" onClick={acceptAll} disabled={busyKey !== null}>
              <Check />
              Add all {items.length} to calendar
            </Button>
          )}

          {items.map((item) => {
            const d = item.draft
            const style = DISCIPLINE_STYLES[d.discipline]
            const Icon = DISCIPLINE_ICONS[d.discipline]
            const details = [
              d.durationMinutes ? `${d.durationMinutes} min` : null,
              d.distanceKm ? formatDistance(d.distanceKm, d.discipline) : null,
              d.zone ? ZONE_LABELS[d.zone] : null,
            ].filter(Boolean)

            return (
              <div
                key={item.key}
                className={cn("flex items-start gap-3 rounded-xl border p-3", style.card)}
              >
                <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", style.iconBg)}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-xs font-semibold", style.text)}>
                    {format(parseISO(d.date), "EEE d MMM")} · {DISCIPLINE_LABELS[d.discipline]}
                  </p>
                  <p className="truncate text-sm font-semibold">{d.title}</p>
                  {details.length > 0 && (
                    <p className="text-xs text-muted-foreground">{details.join(" · ")}</p>
                  )}
                  {d.notes && <p className="mt-1 text-xs text-muted-foreground">{d.notes}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label="Reject workout"
                    onClick={() => reject(item.key)}
                    disabled={busyKey !== null}
                  >
                    <X />
                  </Button>
                  <Button
                    size="icon"
                    aria-label="Add workout to calendar"
                    onClick={() => accept(item)}
                    disabled={busyKey !== null}
                  >
                    {busyKey === item.key ? <Loader2 className="animate-spin" /> : <Check />}
                  </Button>
                </div>
              </div>
            )
          })}

          {items.length === 0 && addedCount > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 text-sm">
              <span className="flex items-center gap-2">
                <CalendarCheck className="size-4 text-primary" />
                {addedCount} {addedCount === 1 ? "workout" : "workouts"} added
              </span>
              <Button asChild size="sm" variant="outline">
                <Link href="/calendar">View calendar</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
