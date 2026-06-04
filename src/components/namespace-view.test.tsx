import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { fetchAllRepositoriesAction } from "@/app/actions"
import { NamespaceView } from "./namespace-view"

vi.mock("@/app/actions", () => ({
  fetchAllRepositoriesAction: vi.fn(),
}))

const mockFetchAllRepositoriesAction = vi.mocked(fetchAllRepositoriesAction)

describe("NamespaceView", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    })
  })

  it("shows images in a namespace with the correct image count", async () => {
    mockFetchAllRepositoriesAction.mockResolvedValue([
      "library/nginx",
      "library/redis",
      "internal/api",
    ])

    render(<NamespaceView namespace="library" />)

    expect(
      await screen.findByRole("heading", { name: "library" }),
    ).toBeInTheDocument()
    expect(screen.getByText("2 images")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "nginx" })).toHaveAttribute(
      "href",
      "/images/library/nginx",
    )
    expect(screen.getByRole("link", { name: "redis" })).toHaveAttribute(
      "href",
      "/images/library/redis",
    )
    expect(screen.queryByRole("link", { name: "api" })).not.toBeInTheDocument()
  })

  it("filters images and updates the filtered metadata count", async () => {
    const user = userEvent.setup()
    mockFetchAllRepositoriesAction.mockResolvedValue([
      "library/nginx",
      "library/redis",
      "library/postgres",
    ])

    render(<NamespaceView namespace="library" />)

    await screen.findByRole("link", { name: "nginx" })
    await user.type(screen.getByPlaceholderText("Filter images..."), "red")

    await waitFor(() => {
      expect(screen.getByText("1 of 3 images")).toBeInTheDocument()
    })
    expect(screen.getByRole("link", { name: "redis" })).toBeInTheDocument()
    expect(
      screen.queryByRole("link", { name: "nginx" }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("link", { name: "postgres" }),
    ).not.toBeInTheDocument()
  })
})
