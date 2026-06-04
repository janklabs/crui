import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/app/actions", () => ({
  loginAction: vi.fn(),
  logoutAction: vi.fn(),
  getRegistryStatusAction: vi.fn(),
  fetchAllRepositoriesAction: vi.fn(),
  fetchTagsAction: vi.fn(),
  fetchManifestAction: vi.fn(),
}))

import { loginAction } from "@/app/actions"
import { LoginForm } from "./login-form"

const mockLoginAction = vi.mocked(loginAction)

describe("LoginForm", () => {
  it("renders username field, password field, and sign-in button", () => {
    render(<LoginForm registryUrl="https://registry.example.com" />)
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
  })

  it("calls loginAction with username and password on submit", async () => {
    const user = userEvent.setup()
    mockLoginAction.mockResolvedValue({ success: true })

    render(<LoginForm registryUrl="https://registry.example.com" />)

    await user.type(screen.getByLabelText(/username/i), "admin")
    await user.type(screen.getByLabelText(/password/i), "secret")
    await user.click(screen.getByRole("button", { name: /sign in/i }))

    await waitFor(() => {
      expect(mockLoginAction).toHaveBeenCalledWith("admin", "secret")
    })
  })

  it("shows error message when login fails", async () => {
    const user = userEvent.setup()
    mockLoginAction.mockResolvedValue({ success: false, error: "Invalid credentials" })

    render(<LoginForm registryUrl="https://registry.example.com" />)

    await user.type(screen.getByLabelText(/username/i), "admin")
    await user.type(screen.getByLabelText(/password/i), "wrong")
    await user.click(screen.getByRole("button", { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })
})
