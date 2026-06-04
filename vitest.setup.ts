import "@testing-library/jest-dom/vitest"

import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

// Prevent @t3-oss/env-nextjs from throwing at module load time
process.env.SKIP_ENV_VALIDATION = "true"
process.env.REGISTRY_URL = "https://registry.test.local"
process.env.SESSION_SECRET = "test-secret-key-at-least-32-characters-long"

afterEach(() => cleanup())

// Mock next/navigation router APIs
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

// Mock next/image to render a plain img tag (jsdom has no image loading)
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string
    alt: string
    [key: string]: unknown
  }) => {
    const { createElement } = require("react")
    return createElement("img", { src, alt, ...props })
  },
}))

// Mock next-themes to avoid window.matchMedia issues in jsdom
vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
    resolvedTheme: "light",
  }),
}))
