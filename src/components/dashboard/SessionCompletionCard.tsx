import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { SessionCompletion } from "@/lib/utils/volume"

type SessionCompletionCardProps = SessionCompletion & { periodLabel: string }

export function SessionCompletionCard({ completed, total, periodLabel }: SessionCompletionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {periodLabel} completion rate
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-2xl font-semibold text-muted-foreground">No plan yet</p>
        ) : (
          <p className="text-3xl font-semibold">
            {completed} / {total}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">workouts completed</p>
      </CardContent>
    </Card>
  )
}
