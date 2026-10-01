// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SignupForm } from "@/components/auth/SignupForm"

const toastError = vi.fn()
const toastSuccess = vi.fn()
vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => toastError(...args), success: (...args: unknown[]) => toastSuccess(...args) },
}))

const push = vi.fn()
const refresh = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }))

const signUp = vi.fn()
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signUp: (...args: unknown[]) => signUp(...args) } }),
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Email"), "a@b.co")
  await user.type(screen.getByLabelText("Password"), "longenough")
  await user.type(screen.getByLabelText("Confirm password"), "longenough")
  await user.click(screen.getByRole("button", { name: "Create account" }))
}

beforeEach(() => {
  toastError.mockClear()
  toastSuccess.mockClear()
  push.mockClear()
  refresh.mockClear()
  signUp.mockReset()
})

describe("SignupForm", () => {
  it("shows a spinner while creating the account, and stays disabled through the navigation on success", async () => {
    const created = deferred<{ data: { session: object }; error: null }>()
    signUp.mockReturnValue(created.promise)
    const user = userEvent.setup()
    render(<SignupForm />)

    await fillAndSubmit(user)
    const button = screen.getByRole("button", { name: /creating account/i })
    expect(button).toBeDisabled()
    expect(button.querySelector("svg")).toBeInTheDocument()

    created.resolve({ data: { session: {} }, error: null })
    await waitFor(() => expect(push).toHaveBeenCalledWith("/calendar"))
    // No flash back to "Create account" before the navigation lands.
    expect(screen.getByRole("button", { name: /creating account/i })).toBeDisabled()
  })

  it("re-enables the button and asks to check email when confirmation is required", async () => {
    signUp.mockResolvedValue({ data: { session: null }, error: null })
    const user = userEvent.setup()
    render(<SignupForm />)

    await fillAndSubmit(user)
    expect(await screen.findByText("Check your email")).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it("re-enables the button and shows the reason when signup fails", async () => {
    signUp.mockResolvedValue({ data: null, error: { message: "Email already registered" } })
    const user = userEvent.setup()
    render(<SignupForm />)

    await fillAndSubmit(user)
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Email already registered"))
    expect(screen.getByRole("button", { name: "Create account" })).toBeEnabled()
  })
})
