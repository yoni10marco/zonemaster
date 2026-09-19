// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { MarkdownLite } from "@/components/coach/MarkdownLite"

describe("MarkdownLite", () => {
  it("renders bold text, bullet lists and numbered lists", () => {
    render(<MarkdownLite text={"Plan for **Friday**:\n- warm up\n- main set\n\n1. cool down\n2. stretch"} />)
    expect(screen.getByText("Friday").tagName).toBe("STRONG")
    expect(screen.getAllByRole("list")).toHaveLength(2)
    expect(screen.getAllByRole("listitem")).toHaveLength(4)
    expect(screen.getByText("warm up").closest("ul")).toBeInTheDocument()
    expect(screen.getByText("cool down").closest("ol")).toBeInTheDocument()
  })

  it("never turns text into HTML", () => {
    const { container } = render(<MarkdownLite text={'<img src=x onerror="alert(1)"> and <b>bold?</b>'} />)
    expect(container.querySelector("img")).toBeNull()
    expect(container.querySelector("b")).toBeNull()
    expect(container).toHaveTextContent('<img src=x onerror="alert(1)"> and <b>bold?</b>')
  })

  it("renders nothing for empty text", () => {
    const { container } = render(<MarkdownLite text="" />)
    expect(container.querySelectorAll("p, ul, ol")).toHaveLength(0)
  })
})
