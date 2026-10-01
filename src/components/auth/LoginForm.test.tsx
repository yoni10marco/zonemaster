// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LoginForm } from "@/components/auth/LoginForm"

const toastError = vi.fn()
vi.mock("sonner", () => ({ toast: { error: (...args: unknown[]) => toastError(...args) } }))

const push = vi.fn()
const refresh = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }))

const signInWithPassword = vi.fn()
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithPassword: (...args: unknown[]) => signInWithPassword(...args) } }),
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

beforeEach(() => {
  toastError.mockClear()
  push.mockClear()
  refresh.mockClear()
  signInWithPassword.mockReset()
})

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Email"), "a@b.co")
  await user.type(screen.getByLabelText("Password"), "hunter22")
  await user.click(screen.getByRole("button", { name: "Log in" }))
}

describe("LoginForm", () => {
  it("shows a spinner while signing in, and stays disabled through the navigation on success", async () => {
    const signedIn = deferred<{ error: null }>()
    signInWithPassword.mockReturnValue(signedIn.promise)
    const user = userEvent.setup()
    render(<LoginForm />)

    await fillAndSubmit(user)
    const button = screen.getByRole("button", { name: /logging in/i })
    expect(button).toBeDisabled()
    expect(button.querySelector("svg")).toBeInTheDocument()

    signedIn.resolve({ error: null })
    await waitFor(() => expect(push).toHaveBeenCalledWith("/calendar"))
    // The button never flashes back to "Log in" before the navigation lands.
    expect(screen.getByRole("button", { name: /logging in/i })).toBeDisabled()
    expect(refresh).toHaveBeenCalled()
  })

  it("re-enables the button and shows the reason when login fails", async () => {
    signInWithPassword.mockResolvedValue({ error: { message: "Invalid credentials" } })
    const user = userEvent.setup()
    render(<LoginForm />)

    await fillAndSubmit(user)
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Invalid credentials"))
    expect(screen.getByRole("button", { name: "Log in" })).toBeEnabled()
    expect(push).not.toHaveBeenCalled()
  })
})
