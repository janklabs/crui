import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { useAsyncData } from "./use-async-data"

describe("useAsyncData", () => {
  it("starts in loading state and resolves with data", async () => {
    const fetcher = vi.fn().mockResolvedValue(["item1", "item2"])
    const { result } = renderHook(() =>
      useAsyncData(fetcher, [], "fetch failed"),
    )

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toEqual(["item1", "item2"])
    expect(result.current.error).toBeNull()
  })

  it("sets error when fetcher rejects", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("network error"))
    const { result } = renderHook(() =>
      useAsyncData(fetcher, null, "fetch failed"),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe("network error")
    expect(result.current.data).toBeNull()
  })

  it("reload re-calls fetcher", async () => {
    let callCount = 0
    const fetcher = vi.fn().mockImplementation(async () => {
      callCount++
      return callCount
    })
    const { result } = renderHook(() =>
      useAsyncData(fetcher, 0, "fetch failed"),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toBe(1)

    await act(async () => {
      result.current.reload()
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toBe(2)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
