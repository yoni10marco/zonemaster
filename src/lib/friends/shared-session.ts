// What you may know about the other people in a shared session: their
// username, whether they accepted, and a yes/no "completed". Nothing else from
// their calendar ever reaches the browser (the database only returns this).

export type SessionMemberStatus = "accepted" | "invited" | "declined"

export type SessionMember = {
  userId: string
  username: string | null
  status: SessionMemberStatus
  completed: boolean
  isMe: boolean
  isCreator: boolean
}

export type SharedSummary = {
  /** Everyone but you, in the order shown: accepted, then waiting, then declined. */
  others: SessionMember[]
  /** You and at least one other person have each completed your own copy. */
  doneTogether: boolean
  iAmCompleted: boolean
  imTheCreator: boolean
}

const STATUS_ORDER: Record<SessionMemberStatus, number> = { accepted: 0, invited: 1, declined: 2 }
const NAME_FALLBACK = "someone"
const MAX_NAMES_SHOWN = 3

export function summarizeSession(members: SessionMember[]): SharedSummary {
  const me = members.find((m) => m.isMe)
  const others = members
    .filter((m) => !m.isMe)
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        (a.username ?? "").localeCompare(b.username ?? "")
    )
  const iAmCompleted = !!me?.completed
  return {
    others,
    iAmCompleted,
    doneTogether: iAmCompleted && others.some((m) => m.status === "accepted" && m.completed),
    imTheCreator: !!me?.isCreator,
  }
}

function label(member: SessionMember): string {
  const name = member.username ?? NAME_FALLBACK
  if (member.status === "invited") return `${name} (waiting)`
  if (member.status === "declined") return `${name} (declined)`
  return member.completed ? `${name} ✓` : name
}

/** "bobby ✓, carl (waiting)", or "" when nobody else is in the session. */
export function describeOthers(summary: SharedSummary): string {
  const shown = summary.others.slice(0, MAX_NAMES_SHOWN).map(label)
  const hidden = summary.others.length - shown.length
  return hidden > 0 ? `${shown.join(", ")} +${hidden} more` : shown.join(", ")
}
