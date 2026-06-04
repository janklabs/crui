import { beforeEach, describe, expect, it, vi } from "vitest"

import { checkRegistryStatus, listRepositories, listTags } from "./registry"

vi.mock("@/env", () => ({
  env: {
    REGISTRY_URL: "https://registry.test.local",
    SESSION_SECRET: "test-secret-key-at-least-32-characters-long",
    NODE_ENV: "test",
  },
}))

function mockFetch(
  status: number,
  body: unknown,
  headers?: Record<string, string>,
) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...headers },
    }),
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe("checkRegistryStatus", () => {
  it("connected: true when registry returns 200", async () => {
    mockFetch(200, {})
    const result = await checkRegistryStatus(null)
    expect(result.connected).toBe(true)
    expect(result.authenticated).toBe(true)
    expect(result.requiresAuth).toBe(false)
  })

  it("requiresAuth: true when 401 and no credentials", async () => {
    mockFetch(401, { errors: [{ code: "UNAUTHORIZED" }] })
    const result = await checkRegistryStatus(null)
    expect(result.connected).toBe(true)
    expect(result.requiresAuth).toBe(true)
    expect(result.authenticated).toBe(false)
  })

  it("authenticated: true when 401 then 200 with credentials", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    fetchSpy
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
    const creds = { username: "user", password: "pass" }
    const result = await checkRegistryStatus(creds)
    expect(result.connected).toBe(true)
    expect(result.authenticated).toBe(true)
    expect(result.requiresAuth).toBe(true)
  })

  it("authenticated: false when 401 then 401 with bad credentials", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    fetchSpy
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
    const creds = { username: "user", password: "wrong" }
    const result = await checkRegistryStatus(creds)
    expect(result.connected).toBe(true)
    expect(result.requiresAuth).toBe(true)
    expect(result.authenticated).toBe(false)
    expect(result.error).toBe("Invalid credentials")
  })

  it("returns error when network throws", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"))
    const result = await checkRegistryStatus(null)
    expect(result.connected).toBe(false)
    expect(result.error).toMatch(/Cannot connect/)
  })
})

describe("listRepositories", () => {
  it("returns repositories from catalog", async () => {
    mockFetch(200, { repositories: ["nginx", "redis"] })
    const result = await listRepositories(null)
    expect(result.repositories).toEqual(["nginx", "redis"])
    expect(result.hasMore).toBe(false)
  })

  it("sends auth header when credentials provided", async () => {
    const spy = mockFetch(200, { repositories: [] })
    await listRepositories({ username: "u", password: "p" })
    const call = spy.mock.calls[0]!
    const init = call[1] as RequestInit | undefined
    const headers = init?.headers as Record<string, string> | undefined
    expect(headers?.Authorization).toMatch(/^Basic /)
  })

  it("throws when registry returns non-OK", async () => {
    mockFetch(500, {})
    await expect(listRepositories(null)).rejects.toThrow(
      /Failed to list repositories/,
    )
  })
})

describe("listTags", () => {
  it("returns tags for a repo", async () => {
    mockFetch(200, { name: "nginx", tags: ["latest", "1.25"] })
    const result = await listTags("nginx", null)
    expect(result.name).toBe("nginx")
    expect(result.tags).toContain("latest")
  })

  it("returns empty array when tags is null", async () => {
    mockFetch(200, { name: "nginx", tags: null })
    const result = await listTags("nginx", null)
    expect(result.tags).toEqual([])
  })
})
