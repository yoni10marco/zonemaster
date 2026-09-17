"use client"

import { useState } from "react"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { DisciplineVolume } from "@/lib/utils/volume"
import { minutesToHours } from "@/lib/utils/volume"
import { DISCIPLINE_LABELS } from "@/lib/types/domain"

type Metric = "hours" | "km"

export function WeeklySummaryChart({ volumes }: { volumes: DisciplineVolume[] }) {
  // Some disciplines are tracked by distance rather than duration (e.g. a
  // bike ride logged in km with no duration) — a single hours-only chart
  // would show those as flat 0-height bars, making them look missing.
  const [metric, setMetric] = useState<Metric>("hours")

  const data = volumes.map((v) => ({
    discipline: DISCIPLINE_LABELS[v.discipline],
    Planned: metric === "hours" ? minutesToHours(v.plannedMinutes) : v.plannedKm,
    Actual: metric === "hours" ? minutesToHours(v.actualMinutes) : v.actualKm,
  }))

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No workouts planned or logged this week yet.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
        <TabsList>
          <TabsTrigger value="hours">Hours</TabsTrigger>
          <TabsTrigger value="km">Distance (km)</TabsTrigger>
        </TabsList>
      </Tabs>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="discipline" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            label={{
              value: metric === "hours" ? "hours" : "km",
              angle: -90,
              position: "insideLeft",
              fontSize: 12,
            }}
          />
          <Tooltip />
          <Legend />
          <Bar dataKey="Planned" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Actual" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
