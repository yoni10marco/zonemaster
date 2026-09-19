// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { DeleteAccountCard } from "@/components/auth/DeleteAccountCard"

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}))

const push = vi.fn()
const refresh = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }))

const rpc = vi.fn()
const signOut = vi.fn()
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ rpc: (...args: unknown[]) => rpc(...args), auth: { signOut: () => signOut() } }),
}))

beforeEach(() => {
  toastSuccess.mockClear()
  toastError.mockClear()
  push.mockClear()
  refresh.mockClear()
  rpc.mockReset().mockResolvedValue({ error: null })
  signOut.mockReset().mockResolvedValue({})
})

async function openDialog() {
  const user = userEvent.setup()
  render(<DeleteAccountCard />)
  await user.click(screen.getByRole("button", { name: "Delete my account" }))
  return { user, confirm: await screen.findByRole("button", { name: "Delete everything" }) }
}

describe("DeleteAccountCard", () => {
  it("does nothing until you type the confirmation word", async () => {
    const { user, confirm } = await openDialog()
    expect(confirm).toBeDisabled()
    await user.type(screen.getByLabelText(/to confirm/i), "del")
    expect(confirm).toBeDisabled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it("deletes the account, signs out and leaves for the home page", async () => {
    const { user, confirm } = await openDialog()
    await user.type(screen.getByLabelText(/to confirm/i), " Delete ")
    await user.click(confirm)

    await waitFor(() => expect(rpc).toHaveBeenCalledWith("delete_my_account"))
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"))
    expect(signOut).toHaveBeenCalled()
    expect(toastSuccess).toHaveBeenCalledWith("Your account was deleted")
  })

  it("keeps you signed in and shows the reason when deleting fails", async () => {
    rpc.mockResolvedValue({ error: { message: "Something went wrong" } })
    const { user, confirm } = await openDialog()
    await user.type(screen.getByLabelText(/to confirm/i), "delete")
    await user.click(confirm)

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Something went wrong"))
    expect(signOut).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Delete everything" })).toBeEnabled()
  })

  it("cancelling clears what you typed", async () => {
    const { user } = await openDialog()
    await user.type(screen.getByLabelText(/to confirm/i), "delete")
    await user.click(screen.getByRole("button", { name: "Cancel" }))
    await user.click(screen.getByRole("button", { name: "Delete my account" }))
    expect(await screen.findByLabelText(/to confirm/i)).toHaveValue("")
    expect(rpc).not.toHaveBeenCalled()
  })
})
