"use client"

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import type { DisciplineVolume } from "@/lib/utils/volume"
import { minutesToHours } from "@/lib/utils/volume"
import { DISCIPLINE_LABELS } from "@/lib/types/domain"

export function WeeklySummaryChart({ volumes }: { volumes: DisciplineVolume[] }) {
  const data = volumes.map((v) => ({
    discipline: DISCIPLINE_LABELS[v.discipline],
    Planned: minutesToHours(v.plannedMinutes),
    Actual: minutesToHours(v.actualMinutes),
  }))

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No workouts planned or logged this week yet.
      </p>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="discipline" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} label={{ value: "hours", angle: -90, position: "insideLeft", fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="Planned" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Actual" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
