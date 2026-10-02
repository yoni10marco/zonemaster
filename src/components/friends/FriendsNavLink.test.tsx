// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { FriendsNavLink } from "@/components/friends/FriendsNavLink"
import { NavigationProgressProvider } from "@/components/layout/NavigationProgress"

let waiting = 0
vi.mock("@/hooks/useFriendBadge", () => ({ useFriendBadge: () => waiting }))
vi.mock("next/navigation", () => ({ usePathname: () => "/calendar" }))

afterEach(() => {
  waiting = 0
})

function renderFriendsNavLink() {
  return render(
    <NavigationProgressProvider>
      <FriendsNavLink />
    </NavigationProgressProvider>
  )
}

describe("FriendsNavLink", () => {
  it("links to the friends page with no badge when nothing is waiting", () => {
    renderFriendsNavLink()
    const link = screen.getByRole("link", { name: "Friends" })
    expect(link).toHaveAttribute("href", "/friends")
    expect(link).not.toHaveTextContent(/\d/)
  })

  it("shows how many things are waiting, in the label too", () => {
    waiting = 3
    renderFriendsNavLink()
    expect(screen.getByRole("link", { name: "Friends, 3 waiting" })).toHaveTextContent("3")
  })

  it("caps a large number", () => {
    waiting = 25
    renderFriendsNavLink()
    expect(screen.getByRole("link")).toHaveTextContent("9+")
  })
})
