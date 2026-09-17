import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function CompletionRateCard({ rate }: { rate: number | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          This week&apos;s completion rate
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rate === null ? (
          <p className="text-2xl font-semibold text-muted-foreground">No plan yet</p>
        ) : (
          <p className="text-3xl font-semibold">{rate}%</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          of planned training time completed
        </p>
      </CardContent>
    </Card>
  )
}
