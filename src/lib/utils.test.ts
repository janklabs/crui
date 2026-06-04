import { describe, expect, it, vi } from "vitest"

import {
  cn,
  formatBytes,
  getErrorMessage,
  getRelativeTime,
  shortenDigest,
} from "./utils"

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b")
  })
  it("dedupes conflicting tailwind classes (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4")
  })
  it("ignores falsy values", () => {
    expect(cn("a", false && "b", null, undefined, "c")).toBe("a c")
  })
})

describe("getErrorMessage", () => {
  it("returns message from Error instance", () => {
    expect(getErrorMessage(new Error("oops"), "fallback")).toBe("oops")
  })
  it("returns fallback for non-Error", () => {
    expect(getErrorMessage("string error", "fallback")).toBe("fallback")
    expect(getErrorMessage(null, "fallback")).toBe("fallback")
  })
})

describe("formatBytes", () => {
  it("returns 0 B for zero", () => {
    expect(formatBytes(0)).toBe("0 B")
  })
  it("formats KB", () => {
    expect(formatBytes(1024)).toBe("1 KB")
  })
  it("formats MB with decimals", () => {
    expect(formatBytes(1024 * 1024)).toBe("1 MB")
  })
  it("respects custom decimals", () => {
    expect(formatBytes(1536, 0)).toBe("2 KB")
  })
})

describe("shortenDigest", () => {
  it("shortens sha256 digest to prefix:12chars", () => {
    expect(shortenDigest("sha256:abcdef1234567890abcdef")).toBe(
      "sha256:abcdef123456",
    )
  })
  it("returns empty string for empty input", () => {
    expect(shortenDigest("")).toBe("")
  })
  it("truncates plain string to 19 chars if no colon prefix", () => {
    const long = "a".repeat(30)
    expect(shortenDigest(long)).toBe("a".repeat(19))
  })
})

describe("getRelativeTime", () => {
  it("returns 'just now' for recent time", () => {
    expect(getRelativeTime(new Date())).toBe("just now")
  })
  it("returns minutes ago", () => {
    const past = new Date(Date.now() - 5 * 60 * 1000)
    expect(getRelativeTime(past)).toBe("5m ago")
  })
  it("returns hours ago", () => {
    const past = new Date(Date.now() - 3 * 60 * 60 * 1000)
    expect(getRelativeTime(past)).toBe("3h ago")
  })
  it("returns days ago", () => {
    const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    expect(getRelativeTime(past)).toBe("2d ago")
  })
})
