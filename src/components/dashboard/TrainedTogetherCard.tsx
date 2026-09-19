import Link from "next/link"
import { Users } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TogetherStats } from "@/lib/friends/shared-session"

const MAX_PARTNERS_SHOWN = 3

type TrainedTogetherCardProps = { stats: TogetherStats; periodLabel: string }

export function TrainedTogetherCard({ stats, periodLabel }: TrainedTogetherCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Users className="size-4 text-primary" />
          {periodLabel} trained together
        </CardTitle>
      </CardHeader>
      <CardContent>
        {stats.planned === 0 ? (
          <p className="text-sm text-muted-foreground">
            No shared sessions yet. Open any workout and use <strong>Do it together</strong> to invite a friend, or{" "}
            <Link href="/friends" className="text-primary underline underline-offset-2">
              add friends
            </Link>
            .
          </p>
        ) : (
          <>
            <p className="text-3xl font-semibold text-primary">
              {stats.done} / {stats.planned}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">shared sessions done together</p>
            {stats.partners.length > 0 && (
              <p className="mt-3 text-sm">
                With{" "}
                {stats.partners
                  .slice(0, MAX_PARTNERS_SHOWN)
                  .map((p) => `${p.name} (${p.count})`)
                  .join(", ")}
                {stats.partners.length > MAX_PARTNERS_SHOWN && ` +${stats.partners.length - MAX_PARTNERS_SHOWN} more`}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
