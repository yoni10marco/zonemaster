// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ConfirmDialog } from "@/components/friends/ConfirmDialog"

function setup(props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const onOpenChange = vi.fn()
  const onConfirm = vi.fn()
  render(
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      title="Remove bobby?"
      description="You can add them again later."
      confirmLabel="Remove"
      onConfirm={onConfirm}
      {...props}
    />
  )
  return { onOpenChange, onConfirm, user: userEvent.setup() }
}

describe("ConfirmDialog", () => {
  it("confirming calls onConfirm", async () => {
    const { onConfirm, user } = setup()
    await user.click(screen.getByRole("button", { name: "Remove" }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("cancelling calls onOpenChange(false) without confirming", async () => {
    const { onConfirm, onOpenChange, user } = setup()
    await user.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("shows a spinner and disables both buttons while busy", () => {
    setup({ busy: true })
    const confirm = screen.getByRole("button", { name: "Remove" })
    expect(confirm).toBeDisabled()
    expect(confirm.querySelector("svg")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
  })

  it("shows no spinner when not busy", () => {
    setup()
    expect(screen.getByRole("button", { name: "Remove" }).querySelector("svg")).not.toBeInTheDocument()
  })
})
