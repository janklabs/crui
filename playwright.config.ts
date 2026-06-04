import { defineConfig, devices } from "@playwright/test"

const PORT = Number(process.env.PORT ?? 3000)
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["html", { open: "never" }], ["github"]]
    : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "pnpm start",
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      REGISTRY_URL: process.env.REGISTRY_URL ?? "https://registry.test.local",
      SESSION_SECRET:
        process.env.SESSION_SECRET ?? "test-secret-key-at-least-32-characters-long",
      SKIP_ENV_VALIDATION: "true",
    },
  },
})
