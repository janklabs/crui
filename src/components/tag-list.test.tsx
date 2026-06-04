import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { fetchTagsAction } from "@/app/actions"
import { TagList } from "./tag-list"

vi.mock("@/app/actions", () => ({
  fetchTagsAction: vi.fn(),
}))

const mockFetchTagsAction = vi.mocked(fetchTagsAction)

describe("TagList", () => {
  it("shows repository tags with the correct tag count", async () => {
    mockFetchTagsAction.mockResolvedValue({
      name: "library/nginx",
      tags: ["latest", "1.25", "stable"],
    })

    render(<TagList repoName="library/nginx" selectedTag="1.25" />)

    expect(
      await screen.findByRole("button", { name: "latest" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "1.25" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "stable" })).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("filters repository tags and updates the filtered count", async () => {
    const user = userEvent.setup()
    mockFetchTagsAction.mockResolvedValue({
      name: "library/nginx",
      tags: ["latest", "1.25", "stable"],
    })

    render(<TagList repoName="library/nginx" selectedTag={null} />)

    await screen.findByRole("button", { name: "latest" })
    await user.type(screen.getByPlaceholderText("Filter tags..."), "sta")

    await waitFor(() => {
      expect(screen.getByText("1 / 3")).toBeInTheDocument()
    })
    expect(screen.getByRole("button", { name: "stable" })).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "latest" }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "1.25" }),
    ).not.toBeInTheDocument()
  })
})
