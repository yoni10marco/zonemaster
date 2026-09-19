// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { FriendsNavLink } from "@/components/friends/FriendsNavLink"

let waiting = 0
vi.mock("@/hooks/useFriendBadge", () => ({ useFriendBadge: () => waiting }))

afterEach(() => {
  waiting = 0
})

describe("FriendsNavLink", () => {
  it("links to the friends page with no badge when nothing is waiting", () => {
    render(<FriendsNavLink />)
    const link = screen.getByRole("link", { name: "Friends" })
    expect(link).toHaveAttribute("href", "/friends")
    expect(link).not.toHaveTextContent(/\d/)
  })

  it("shows how many things are waiting, in the label too", () => {
    waiting = 3
    render(<FriendsNavLink />)
    expect(screen.getByRole("link", { name: "Friends, 3 waiting" })).toHaveTextContent("3")
  })

  it("caps a large number", () => {
    waiting = 25
    render(<FriendsNavLink />)
    expect(screen.getByRole("link")).toHaveTextContent("9+")
  })
})
