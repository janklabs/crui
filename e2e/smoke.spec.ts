import { expect, test } from "@playwright/test"

test.describe("smoke", () => {
  test("home page loads and has a title", async ({ page }) => {
    await page.goto("/")
    // Wait for page to fully render
    await page.waitForLoadState("networkidle")
    // Title should not be empty
    await expect(page).toHaveTitle(/.+/)
  })
})
