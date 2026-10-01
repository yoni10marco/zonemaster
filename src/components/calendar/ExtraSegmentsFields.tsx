"use client"

import { Plus, X } from "lucide-react"

import { DisciplineIcon, ZoneDot } from "@/components/calendar/DisciplineIcon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DISCIPLINES,
  DISCIPLINE_LABELS,
  INTENSITY_ZONES,
  ZONE_LABELS,
  type Discipline,
  type IntensityZone,
} from "@/lib/types/domain"
import { cn } from "@/lib/utils"
import { distanceUnit, usesMeters } from "@/lib/utils/distance"
import { DISCIPLINE_STYLES } from "@/lib/utils/discipline-style"
import { MAX_EXTRA_SEGMENTS } from "@/lib/utils/segments"
import type { ZoneGuide } from "@/lib/utils/training-zones"
import { zoneTarget } from "@/lib/utils/training-zones"
import { NO_ZONE_VALUE, zoneFromSelectValue, zoneSelectValue } from "@/lib/utils/zone-select"

/**
 * One extra leg's editable form state. Kept outside react-hook-form, the same
 * way the "Do it together" picker is — a variable-length list of rows doesn't
 * fit a single flat form schema, and each row only needs the same light
 * validation as the main discipline/duration/distance fields already have.
 */
export type EditableSegment = {
  key: string
  discipline: Discipline
  duration: string
  distance: string
  zone: IntensityZone | ""
}

let nextKey = 0
export function nextSegmentKey(): string {
  nextKey += 1
  return `seg-${nextKey}`
}
export function newSegment(discipline: Discipline = "run"): EditableSegment {
  return { key: nextSegmentKey(), discipline, duration: "", distance: "", zone: "" }
}

/** A row is complete once it has a duration or a distance, same rule as the main workout. */
export function segmentIsComplete(segment: EditableSegment): boolean {
  return segment.duration.trim() !== "" || segment.distance.trim() !== ""
}

type ExtraSegmentsFieldsProps = {
  legs: EditableSegment[]
  onChange: (legs: EditableSegment[]) => void
  zoneGuide: ZoneGuide | null
  disabled?: boolean
  showIncompleteError?: boolean
}

export function ExtraSegmentsFields({
  legs,
  onChange,
  zoneGuide,
  disabled,
  showIncompleteError,
}: ExtraSegmentsFieldsProps) {
  function update(key: string, patch: Partial<EditableSegment>) {
    onChange(legs.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  function remove(key: string) {
    onChange(legs.filter((l) => l.key !== key))
  }

  function add() {
    onChange([...legs, newSegment()])
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Add another sport (optional)</p>
          <p className="text-xs text-muted-foreground">
            For a brick like bike then run: one workout on the calendar, counted for each sport on the dashboard.
          </p>
        </div>
      </div>

      {legs.map((leg, index) => (
        <div key={leg.key} className={cn("space-y-2 rounded-md p-2", DISCIPLINE_STYLES[leg.discipline].card)}>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <DisciplineIcon discipline={leg.discipline} />
              Leg {index + 2}
            </span>
            <button
              type="button"
              aria-label={`Remove leg ${index + 2}`}
              onClick={() => remove(leg.key)}
              disabled={disabled}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="size-4" />
            </button>
          </div>
          <Select
            value={leg.discipline}
            onValueChange={(next) => update(leg.key, { discipline: next as Discipline })}
            disabled={disabled}
          >
            <SelectTrigger className="w-full" aria-label={`Discipline for leg ${index + 2}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DISCIPLINES.map((d) => (
                <SelectItem key={d} value={d}>
                  <DisciplineIcon discipline={d} />
                  {DISCIPLINE_LABELS[d]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              min={0}
              placeholder="Duration (min)"
              aria-label={`Duration for leg ${index + 2}`}
              value={leg.duration}
              disabled={disabled}
              onChange={(e) => update(leg.key, { duration: e.target.value })}
            />
            <Input
              type="number"
              min={0}
              step={usesMeters(leg.discipline) ? "1" : "0.1"}
              placeholder={`Distance (${distanceUnit(leg.discipline)})`}
              aria-label={`Distance for leg ${index + 2}`}
              value={leg.distance}
              disabled={disabled}
              onChange={(e) => update(leg.key, { distance: e.target.value })}
            />
          </div>
          <Select
            value={zoneSelectValue(leg.zone)}
            onValueChange={(next) => update(leg.key, { zone: zoneFromSelectValue(next) })}
            disabled={disabled}
          >
            <SelectTrigger className="w-full" aria-label={`Target zone for leg ${index + 2}`}>
              <SelectValue placeholder="No specific zone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_ZONE_VALUE}>No specific zone</SelectItem>
              {INTENSITY_ZONES.map((z) => {
                const target = zoneTarget(zoneGuide, leg.discipline, z)
                return (
                  <SelectItem key={z} value={z}>
                    <ZoneDot zone={z} />
                    {ZONE_LABELS[z]}
                    {target ? ` · ${target}` : ""}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          {showIncompleteError && !segmentIsComplete(leg) && (
            <p className="text-sm text-destructive">Enter a duration or a distance for this leg, or remove it.</p>
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        disabled={disabled || legs.length >= MAX_EXTRA_SEGMENTS}
      >
        <Plus />
        {legs.length === 0 ? "Add another sport" : "Add another leg"}
      </Button>
    </div>
  )
}
