"use client"

import { useMemo, useRef, useState } from "react"
import { Loader2, Upload } from "lucide-react"
import { toast } from "sonner"

import { useZoneGuide } from "@/components/calendar/ZoneGuideContext"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ACCEPTED_EXTENSIONS, parseActivityFile } from "@/lib/import/parse-activity"
import { fetchImportContext, rowsFor, saveImportedRows, type ImportContext } from "@/lib/import/save"
import { durationMinutes, externalActivityId, intensityText } from "@/lib/import/summary"
import { ImportError, type ParsedActivity } from "@/lib/import/types"
import { DISCIPLINES, DISCIPLINE_LABELS, INTENSITY_ZONES, type Discipline } from "@/lib/types/domain"
import { format } from "@/lib/utils/dates"
import { formatDistance } from "@/lib/utils/distance"
import { zoneOfActivity } from "@/lib/utils/training-zones"

type ImportActivityDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after activities were saved, so the calendar can reload. */
  onImported: () => void | Promise<void>
}

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback
}

export function ImportActivityDialog({ open, onOpenChange, onImported }: ImportActivityDialogProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const zoneGuide = useZoneGuide()
  const [reading, setReading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activities, setActivities] = useState<ParsedActivity[]>([])
  const [context, setContext] = useState<ImportContext | null>(null)
  const [problems, setProblems] = useState<string[]>([])
  const [overrides, setOverrides] = useState<Record<string, Discipline>>({})
  const [skipped, setSkipped] = useState<Set<string>>(new Set())

  const rows = useMemo(() => (context ? rowsFor(activities, overrides, context) : []), [activities, overrides, context])
  const chosen = rows.filter((r) => !r.duplicate && !skipped.has(r.key))
  const plannedTitle = (id: number | null) => context?.planned.find((w) => w.id === id)

  function reset() {
    setActivities([])
    setContext(null)
    setProblems([])
    setOverrides({})
    setSkipped(new Set())
  }

  function handleOpenChange(next: boolean) {
    if (saving) return
    if (!next) reset()
    onOpenChange(next)
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    reset()
    setReading(true)
    const found: ParsedActivity[] = []
    const failed: string[] = []
    for (const file of Array.from(files)) {
      try {
        found.push(...(await parseActivityFile(file)))
      } catch (err) {
        failed.push(err instanceof ImportError ? err.message : `${file.name} couldn't be read.`)
      }
    }
    setProblems(failed)
    try {
      if (found.length > 0) {
        setContext(await fetchImportContext(found, found.map(externalActivityId)))
        setActivities(found)
      }
    } catch (err) {
      toast.error(errorText(err, "Couldn't check your calendar"))
    } finally {
      setReading(false)
      if (fileInput.current) fileInput.current.value = ""
    }
  }

  async function handleImport() {
    setSaving(true)
    try {
      const count = await saveImportedRows(chosen)
      const linked = chosen.filter((r) => r.plannedId !== null).length
      toast.success(
        `Imported ${count} ${count === 1 ? "activity" : "activities"}` +
          (linked > 0 ? `, ${linked} matched to your plan` : "")
      )
      await onImported()
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(errorText(err, "Import failed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import activities</DialogTitle>
          <DialogDescription>
            Add workouts from your watch or bike computer. Only the summary is saved (date, time, distance, heart rate);
            your file and GPS track stay on this device.
          </DialogDescription>
        </DialogHeader>

        <div>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS.join(",")}
            className="sr-only"
            aria-label="Activity files"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button type="button" variant="outline" disabled={reading || saving} onClick={() => fileInput.current?.click()}>
            {reading ? <Loader2 className="animate-spin" /> : <Upload />}
            Choose files (.fit, .tcx, .gpx)
          </Button>
        </div>

        {problems.length > 0 && (
          <ul className="space-y-1 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}

        {rows.length > 0 && (
          <ul className="space-y-2">
            {rows.map((row) => {
              const plan = plannedTitle(row.plannedId)
              const intensity = intensityText({ ...row.activity, discipline: row.discipline })
              const zoneCheck = plan?.target_zone ? zoneOfActivity(zoneGuide, row.discipline, row.activity) : null
              const details = [
                `${durationMinutes(row.activity.durationSeconds)} min`,
                row.activity.distanceKm ? formatDistance(row.activity.distanceKm, row.discipline) : null,
                row.activity.avgHeartRate ? `${row.activity.avgHeartRate} bpm` : null,
                intensity,
              ].filter(Boolean)
              return (
                <li key={row.key} className="flex items-start gap-3 rounded-lg border p-3">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-primary"
                    aria-label={`Import ${row.activity.fileName}`}
                    checked={!row.duplicate && !skipped.has(row.key)}
                    disabled={row.duplicate || saving}
                    onChange={() =>
                      setSkipped((prev) => {
                        const next = new Set(prev)
                        if (!next.delete(row.key)) next.add(row.key)
                        return next
                      })
                    }
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium">{format(row.activity.startTime, "EEE, MMM d · HH:mm")}</p>
                    <p className="text-sm text-muted-foreground">{details.join(" · ")}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.activity.fileName}</p>
                    <p className="text-xs">
                      {row.duplicate ? (
                        <span className="text-muted-foreground">Already imported, skipped.</span>
                      ) : plan ? (
                        <span className="text-green-700 dark:text-green-400">
                          Completes your planned {DISCIPLINE_LABELS[plan.discipline].toLowerCase()}
                          {plan.title ? `: ${plan.title}` : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No matching planned workout, saved as an extra activity.</span>
                      )}
                    </p>
                    {plan?.target_zone && zoneCheck && !row.duplicate && (
                      <p className={`text-xs ${zoneCheck.zone === plan.target_zone ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}`}>
                        Planned {plan.target_zone.toUpperCase()}: your average {zoneCheck.measure} was {zoneCheck.zone.toUpperCase()}
                        {zoneCheck.zone === plan.target_zone
                          ? ", right on target."
                          : INTENSITY_ZONES.indexOf(zoneCheck.zone) > INTENSITY_ZONES.indexOf(plan.target_zone)
                            ? ", harder than planned."
                            : ", easier than planned."}
                      </p>
                    )}
                  </div>
                  <Select
                    value={row.discipline}
                    onValueChange={(next) => setOverrides((prev) => ({ ...prev, [row.key]: next as Discipline }))}
                    disabled={row.duplicate || saving}
                  >
                    <SelectTrigger className="w-28" aria-label={`Discipline for ${row.activity.fileName}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DISCIPLINES.map((d) => (
                        <SelectItem key={d} value={d}>
                          {DISCIPLINE_LABELS[d]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </li>
              )
            })}
          </ul>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleImport} disabled={chosen.length === 0 || saving}>
            {saving && <Loader2 className="animate-spin" />}
            {chosen.length === 0 ? "Import" : `Import ${chosen.length} ${chosen.length === 1 ? "activity" : "activities"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
