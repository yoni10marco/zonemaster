// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { TrainingPrivacyCard } from "@/components/friends/TrainingPrivacyCard"

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}))

const refetch = vi.fn(async () => {})
let profile: { share_planned_workouts: boolean } | null = null
vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({ profile, loading: false, refetch }),
}))

const updateEq = vi.fn(async () => ({ error: null as { message: string } | null }))
const update = vi.fn(() => ({ eq: updateEq }))
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: "me" } } }) },
    from: () => ({ update }),
  }),
}))

beforeEach(() => {
  toastSuccess.mockClear()
  toastError.mockClear()
  update.mockClear()
  updateEq.mockClear()
  updateEq.mockResolvedValue({ error: null })
  refetch.mockClear()
  profile = { share_planned_workouts: true }
})

describe("TrainingPrivacyCard", () => {
  it("shows the switch on when sharing is enabled", () => {
    render(<TrainingPrivacyCard />)
    expect(screen.getByRole("switch")).toBeChecked()
  })

  it("shows the switch off when sharing is disabled", () => {
    profile = { share_planned_workouts: false }
    render(<TrainingPrivacyCard />)
    expect(screen.getByRole("switch")).not.toBeChecked()
  })

  it("turns sharing off and saves it", async () => {
    render(<TrainingPrivacyCard />)
    const user = userEvent.setup()
    await user.click(screen.getByRole("switch"))
    await waitFor(() => expect(update).toHaveBeenCalledWith({ share_planned_workouts: false }))
    expect(updateEq).toHaveBeenCalledWith("id", "me")
    expect(refetch).toHaveBeenCalled()
    expect(toastSuccess).toHaveBeenCalledWith("Your planned workouts are now private")
  })

  it("reverts the switch and shows an error if saving fails", async () => {
    updateEq.mockResolvedValue({ error: { message: "could not save" } })
    render(<TrainingPrivacyCard />)
    const user = userEvent.setup()
    await user.click(screen.getByRole("switch"))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("could not save"))
    expect(screen.getByRole("switch")).toBeChecked()
  })
})
