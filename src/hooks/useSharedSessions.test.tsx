// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useSharedSessions } from "@/hooks/useSharedSessions"
import type { SessionMember } from "@/lib/friends/shared-session"

const fetchSessionOverview = vi.fn()
vi.mock("@/lib/friends/sessions", () => ({
  fetchSessionOverview: (...args: unknown[]) => fetchSessionOverview(...args),
}))

const bobby: SessionMember = { userId: "b", username: "bobby", status: "accepted", completed: false, isMe: false, isCreator: false }

beforeEach(() => {
  fetchSessionOverview.mockReset()
  fetchSessionOverview.mockResolvedValue(new Map([[5, [bobby]]]))
})

describe("useSharedSessions", () => {
  it("loads the members of the given sessions", async () => {
    const { result } = renderHook(() => useSharedSessions([5]))
    await waitFor(() => expect(result.current.members.get(5)).toEqual([bobby]))
    expect(fetchSessionOverview).toHaveBeenCalledWith([5])
  })

  it("does not refetch when the same ids arrive in a new array or another order", async () => {
    const { rerender } = renderHook(({ ids }) => useSharedSessions(ids), { initialProps: { ids: [5, 3, 5] } })
    await waitFor(() => expect(fetchSessionOverview).toHaveBeenCalledTimes(1))
    expect(fetchSessionOverview).toHaveBeenLastCalledWith([3, 5])
    rerender({ ids: [3, 5] })
    rerender({ ids: [5, 3] })
    expect(fetchSessionOverview).toHaveBeenCalledTimes(1)
  })

  it("reloads when a different session appears", async () => {
    const { rerender } = renderHook(({ ids }) => useSharedSessions(ids), { initialProps: { ids: [5] } })
    await waitFor(() => expect(fetchSessionOverview).toHaveBeenCalledTimes(1))
    rerender({ ids: [5, 9] })
    await waitFor(() => expect(fetchSessionOverview).toHaveBeenCalledTimes(2))
    expect(fetchSessionOverview).toHaveBeenLastCalledWith([5, 9])
  })

  it("reloads when the refresh key changes (for example after ticking a workout done)", async () => {
    const { rerender } = renderHook(({ key }) => useSharedSessions([5], key), { initialProps: { key: "" } })
    await waitFor(() => expect(fetchSessionOverview).toHaveBeenCalledTimes(1))
    rerender({ key: "12" })
    await waitFor(() => expect(fetchSessionOverview).toHaveBeenCalledTimes(2))
  })

  it("with no shared sessions it asks for nothing and returns nothing", async () => {
    fetchSessionOverview.mockResolvedValue(new Map())
    const { result } = renderHook(() => useSharedSessions([]))
    await waitFor(() => expect(fetchSessionOverview).toHaveBeenCalledWith([]))
    expect(result.current.members.size).toBe(0)
  })

  it("keeps working (no members) if the lookup fails", async () => {
    fetchSessionOverview.mockRejectedValue(new Error("network"))
    const { result } = renderHook(() => useSharedSessions([5]))
    await waitFor(() => expect(fetchSessionOverview).toHaveBeenCalled())
    expect(result.current.members.size).toBe(0)
  })

  it("refetch can be called by hand and picks up changes", async () => {
    const { result } = renderHook(() => useSharedSessions([5]))
    await waitFor(() => expect(result.current.members.get(5)).toEqual([bobby]))
    fetchSessionOverview.mockResolvedValue(new Map([[5, [{ ...bobby, completed: true }]]]))
    await result.current.refetch()
    await waitFor(() => expect(result.current.members.get(5)?.[0].completed).toBe(true))
  })
})
