import { Target } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { SessionCompletion } from "@/lib/utils/volume"

type SessionCompletionCardProps = SessionCompletion & { periodLabel: string }

export function SessionCompletionCard({ completed, total, periodLabel }: SessionCompletionCardProps) {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-brand-blue/5 to-brand-cyan/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Target className="size-4 text-primary" />
          {periodLabel} completion rate
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-2xl font-semibold text-muted-foreground">No plan yet</p>
        ) : (
          <p className="text-3xl font-semibold text-primary">
            {completed} / {total}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">workouts completed</p>
      </CardContent>
    </Card>
  )
}
