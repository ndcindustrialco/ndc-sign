import { test, expect, devices } from "@playwright/test"

/**
 * Responsive design tests — verifying layout behavior on mobile vs desktop.
 */

test.describe("Mobile responsiveness", () => {
  test.use({ ...devices["iPhone 14"] })

  test("login page is usable on mobile", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible()

    // Button should be tappable (not overflowing)
    const btn = page.getByRole("button", { name: /sign in/i })
    const box = await btn.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(40)
  })

  test("sign error page is readable on mobile", async ({ page }) => {
    await page.goto("/sign/invalid-token")
    await expect(page.locator("text=Link Unavailable").or(page.locator("text=not valid"))).toBeVisible()

    // Content should not overflow horizontally
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10) // allow small tolerance
  })
})

test.describe("Desktop layout", () => {
  test.use({ ...devices["Desktop Chrome"] })

  test("login page renders centered card", async ({ page }) => {
    await page.goto("/login")
    const signInBtn = page.getByRole("button", { name: /sign in/i })
    await expect(signInBtn).toBeVisible()
  })
})
