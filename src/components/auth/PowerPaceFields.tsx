"use client"

import { useWatch, type Control } from "react-hook-form"

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { ZONE_LABELS } from "@/lib/types/domain"
import type { ProfileInput } from "@/lib/validation/profile"
import { buildZoneGuide, parsePace, zoneTable } from "@/lib/utils/training-zones"

function ZonePreview({ title, rows }: { title: string; rows: { zone: keyof typeof ZONE_LABELS; text: string }[] }) {
  if (rows.length === 0) return null
  return (
    <div className="rounded-lg bg-muted/60 p-3 text-sm">
      <p className="mb-1 font-medium">{title}</p>
      <dl className="space-y-1">
        {rows.map((row) => (
          <div key={row.zone} className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{ZONE_LABELS[row.zone]}</dt>
            <dd className="whitespace-nowrap font-medium tabular-nums">{row.text}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/** Optional bike power and run / swim pace inputs, with a live preview of the zones they produce. */
export function PowerPaceFields({ control }: { control: Control<ProfileInput> }) {
  const [ftp, runPace, swimCss] = useWatch({ control, name: ["ftpWatts", "runThresholdPace", "swimCss"] })
  // The preview only needs the numbers the athlete typed; invalid input simply shows nothing.
  const guide = buildZoneGuide({
    ftp_watts: ftp ? Number(ftp) : null,
    run_threshold_pace_sec: runPace ? parsePace(runPace) : null,
    swim_css_sec: swimCss ? parsePace(swimCss) : null,
  })

  return (
    <div className="space-y-3 border-t pt-4">
      <div>
        <h3 className="text-sm font-medium">Power and pace zones</h3>
        <p className="text-sm text-muted-foreground">
          Optional. Heart rate isn&apos;t the best guide in every sport, so rides can use power and runs and swims can
          use pace. When a number is set, that sport&apos;s workouts show watts or pace instead of heart rate, imported
          activities are checked against the zone you planned, and the coach uses them too.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          control={control}
          name="ftpWatts"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bike FTP (watts)</FormLabel>
              <FormControl>
                <Input type="number" inputMode="numeric" placeholder="e.g. 250" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="runThresholdPace"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Run threshold pace (per km)</FormLabel>
              <FormControl>
                <Input inputMode="numeric" placeholder="e.g. 5:00" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="swimCss"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Swim CSS (per 100 m)</FormLabel>
              <FormControl>
                <Input inputMode="numeric" placeholder="e.g. 1:45" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormDescription>
        <strong>FTP</strong> is the power you could hold for about an hour; a common estimate is 95% of your best
        20-minute average power. <strong>Threshold pace</strong> is the run pace you could hold for about an hour (for
        many people, close to a hard 10 km race pace). <strong>CSS</strong> is your swim pace per 100 m: swim 400 m and
        200 m as hard as you can, then take (time for 400 m minus time for 200 m) divided by 2.
      </FormDescription>

      <div className="grid gap-3 sm:grid-cols-2">
        <ZonePreview title="Bike power" rows={zoneTable(guide, "bike")} />
        <ZonePreview title="Run pace" rows={zoneTable(guide, "run")} />
        <ZonePreview title="Swim pace" rows={zoneTable(guide, "swim")} />
      </div>
    </div>
  )
}
