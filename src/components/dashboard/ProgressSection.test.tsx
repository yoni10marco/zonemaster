// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ProgressSection } from "@/components/dashboard/ProgressSection"
import { raceCountdown, weekStreak, weeklyTrend } from "@/lib/utils/progress"

const TODAY = new Date(2026, 8, 18) // Fri 2026-09-18

function renderProgress({
  raceDate = "2026-10-25",
  raceDistance = "Olympic" as string | null,
  completed = ["2026-09-15", "2026-09-08", "2026-09-01"],
  planned = ["2026-09-14", "2026-09-16", "2026-09-08"],
} = {}) {
  return render(
    <ProgressSection
      race={raceCountdown(raceDate, TODAY)}
      raceDate={raceDate}
      raceDistance={raceDistance}
      streak={weekStreak(completed, TODAY)}
      weeks={weeklyTrend(planned, completed, 8, TODAY)}
    />
  )
}

describe("ProgressSection", () => {
  it("shows the race countdown in days, weeks and days", () => {
    renderProgress()
    expect(screen.getByText("Race: Olympic")).toBeInTheDocument()
    expect(screen.getByText("37 days")).toBeInTheDocument()
    expect(screen.getByText(/5 weeks and 2 days to go/)).toBeInTheDocument()
  })

  it("shows race day and past races distinctly", () => {
    const { unmount } = renderProgress({ raceDate: "2026-09-18" })
    expect(screen.getByText("Race day!")).toBeInTheDocument()
    unmount()
    renderProgress({ raceDate: "2026-09-01" })
    expect(screen.getByText(/has passed/)).toBeInTheDocument()
  })

  it("invites the athlete to set a race when there is none", () => {
    render(
      <ProgressSection
        race={null}
        raceDate={null}
        raceDistance={null}
        streak={{ current: 0, best: 0 }}
        weeks={weeklyTrend([], [], 8, TODAY)}
      />
    )
    expect(screen.getByRole("link", { name: /add your target race/i })).toHaveAttribute("href", "/settings")
  })

  it("shows the weekly streak and the best run", () => {
    renderProgress({ completed: ["2026-09-15", "2026-09-08", "2026-08-11", "2026-08-04", "2026-07-28", "2026-07-21"] })
    expect(screen.getByText("2 weeks")).toBeInTheDocument()
    expect(screen.getByText(/best 4 weeks/)).toBeInTheDocument()
  })

  it("encourages starting a streak when there is none", () => {
    renderProgress({ completed: [] })
    expect(screen.getByText("0 weeks")).toBeInTheDocument()
    expect(screen.getByText(/complete a workout this week/i)).toBeInTheDocument()
  })

  it("describes the weekly chart for screen readers", () => {
    renderProgress()
    const chart = screen.getByRole("img", { name: /weekly sessions/i })
    // Sep 14-20: two sessions planned (14th and 16th), one completed (15th).
    expect(chart).toHaveAccessibleName(/week of Sep 14: 1 completed of 2 planned/)
    expect(screen.getByText("Last 8 weeks")).toBeInTheDocument()
  })
})
