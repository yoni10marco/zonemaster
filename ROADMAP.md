# Zone Master roadmap

## Next: training with friends

Add friends and plan training together.

**Goals**

- Send, accept and decline friend requests (by email or an invite link).
- See a friend's planned and completed workouts, if they choose to share them.
- Plan a session together: invite a friend to a workout, they accept, and it appears on both calendars.
- A shared view of who is training what this week.

**Design notes to settle before building**

- **Privacy first.** Sharing is opt-in and revocable. Per-friend visibility levels (nothing / planned sessions only / planned and completed). Coach chat history and profile details (heart rate, race goal) stay private unless explicitly shared.
- **Data model.** A `friendships` table (requester, addressee, status: pending / accepted / blocked), and a `workout_invites` table (workout, invitee, status). Row-level security must allow a friend to read only what has been shared, never the whole `planned_workouts` table.
- **Shared sessions.** Decide whether an accepted invite creates a copy on the friend's calendar (independent afterwards) or a linked workout (edits sync). Copies are simpler; links are better for "same session, same time".
- **Notifications.** An invite needs to reach the friend somewhere (a badge in the app at minimum).
- **Coach.** Optionally let "Plan my week" take a friend's plan into account, but only with their consent.

**Suggested first slice**

1. Friend requests and a friends list (no sharing yet).
2. Share planned workouts with accepted friends, read-only.
3. Invite a friend to a workout.

## Ideas parked for later

- Pace and power zones (heart-rate zones are done).
- A "forgot password" flow.
- Automatic activity import (Strava is not viable: paid API access, and its terms forbid AI use; Intervals.icu or FIT/TCX file upload are the researched alternatives).
