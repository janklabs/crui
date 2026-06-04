import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/registry", () => ({
  checkRegistryStatus: vi.fn(),
  listRepositories: vi.fn(),
  listTags: vi.fn(),
  getManifest: vi.fn(),
}))

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
  setSession: vi.fn(),
  clearSession: vi.fn(),
}))

import { checkRegistryStatus } from "@/lib/registry"
import { clearSession, getSession, setSession } from "@/lib/session"
import {
  getRegistryStatusAction,
  loginAction,
  logoutAction,
} from "./actions"

const mockCheckRegistryStatus = vi.mocked(checkRegistryStatus)
const mockGetSession = vi.mocked(getSession)
const mockSetSession = vi.mocked(setSession)
const mockClearSession = vi.mocked(clearSession)

beforeEach(() => {
  vi.clearAllMocks()
})

describe("loginAction", () => {
  it("returns success: true when registry authenticates", async () => {
    mockCheckRegistryStatus.mockResolvedValue({
      connected: true,
      requiresAuth: true,
      authenticated: true,
      registryUrl: "https://registry.test.local",
    })
    mockSetSession.mockResolvedValue(undefined)

    const result = await loginAction("admin", "password123")

    expect(result.success).toBe(true)
    expect(mockSetSession).toHaveBeenCalledWith("admin", "password123")
  })

  it("returns success: false when registry rejects credentials", async () => {
    mockCheckRegistryStatus.mockResolvedValue({
      connected: true,
      requiresAuth: true,
      authenticated: false,
      registryUrl: "https://registry.test.local",
      error: "Invalid credentials",
    })

    const result = await loginAction("admin", "wrongpass")

    expect(result.success).toBe(false)
    expect(result.error).toBe("Invalid credentials")
    expect(mockSetSession).not.toHaveBeenCalled()
  })
})

describe("logoutAction", () => {
  it("calls clearSession", async () => {
    mockClearSession.mockResolvedValue(undefined)
    await logoutAction()
    expect(mockClearSession).toHaveBeenCalledOnce()
  })
})

describe("getRegistryStatusAction", () => {
  it("calls checkRegistryStatus with session credentials", async () => {
    const creds = { username: "user", password: "pass" }
    mockGetSession.mockResolvedValue(creds)
    mockCheckRegistryStatus.mockResolvedValue({
      connected: true,
      requiresAuth: false,
      authenticated: true,
      registryUrl: "https://registry.test.local",
    })

    const status = await getRegistryStatusAction()

    expect(mockGetSession).toHaveBeenCalledOnce()
    expect(mockCheckRegistryStatus).toHaveBeenCalledWith(creds)
    expect(status.connected).toBe(true)
  })
})
