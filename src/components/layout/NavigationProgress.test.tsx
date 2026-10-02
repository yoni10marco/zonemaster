// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
  NavigationProgressOverlay,
  NavigationProgressProvider,
  useStartNavigationProgress,
} from "@/components/layout/NavigationProgress"

let pathname = "/calendar"
vi.mock("next/navigation", () => ({ usePathname: () => pathname }))

function Harness() {
  const start = useStartNavigationProgress()
  return (
    <>
      <button onClick={start}>Go</button>
      <NavigationProgressOverlay />
    </>
  )
}

function renderHarness() {
  return render(
    <NavigationProgressProvider>
      <Harness />
    </NavigationProgressProvider>
  )
}

describe("NavigationProgress", () => {
  it("shows nothing until a navigation starts", () => {
    pathname = "/calendar"
    renderHarness()
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument()
  })

  it("shows the overlay the instant a nav link is clicked", async () => {
    pathname = "/calendar"
    const { default: userEvent } = await import("@testing-library/user-event")
    renderHarness()
    await userEvent.setup().click(screen.getByRole("button", { name: "Go" }))
    expect(screen.getByText("Loading…")).toBeInTheDocument()
  })

  it("clears the overlay once the path actually changes", async () => {
    pathname = "/calendar"
    const { default: userEvent } = await import("@testing-library/user-event")
    const { rerender } = renderHarness()
    await userEvent.setup().click(screen.getByRole("button", { name: "Go" }))
    expect(screen.getByText("Loading…")).toBeInTheDocument()

    pathname = "/dashboard"
    rerender(
      <NavigationProgressProvider>
        <Harness />
      </NavigationProgressProvider>
    )
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument()
  })

  it("clears itself after the failsafe timeout even if the path never changes", async () => {
    vi.useFakeTimers()
    pathname = "/calendar"
    renderHarness()
    act(() => screen.getByRole("button", { name: "Go" }).click())
    expect(screen.getByText("Loading…")).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(4000))
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it("throws a clear error when used outside the provider", () => {
    function Lonely() {
      useStartNavigationProgress()
      return null
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => render(<Lonely />)).toThrow(/must be used within NavigationProgressProvider/)
    spy.mockRestore()
  })
})
