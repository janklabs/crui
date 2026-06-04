import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Button } from "./button"

describe("Button", () => {
  it("renders with text content", () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument()
  })

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Submit</Button>)
    await user.click(screen.getByRole("button", { name: /submit/i }))
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it("renders as anchor when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/home">Home</a>
      </Button>,
    )
    const link = screen.getByRole("link", { name: /home/i })
    expect(link).toBeInTheDocument()
    expect(link.tagName).toBe("A")
  })

  it("is disabled when disabled prop is set", async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>,
    )
    const btn = screen.getByRole("button", { name: /disabled/i })
    expect(btn).toBeDisabled()
    await user.click(btn)
    expect(handleClick).not.toHaveBeenCalled()
  })
})
