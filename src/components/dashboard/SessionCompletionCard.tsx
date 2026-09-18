import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { SessionCompletion } from "@/lib/utils/volume"

export function SessionCompletionCard({ completed, total }: SessionCompletion) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          This week&apos;s completion rate
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
