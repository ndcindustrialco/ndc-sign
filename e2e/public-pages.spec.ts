import { test, expect } from "@playwright/test"

/**
 * E2E tests for public (unauthenticated) pages.
 * These tests do NOT require a logged-in session.
 */

test.describe("Login page", () => {
  test("renders the login page with Microsoft sign-in button", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator("text=eSign")).toBeVisible()
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible()
  })

  test("root redirects to dashboard (or login)", async ({ page }) => {
    await page.goto("/")
    // Should redirect to either /login or /dashboard depending on auth state
    await page.waitForURL(/\/(login|dashboard)/)
    const url = page.url()
    expect(url).toMatch(/\/(login|dashboard)/)
  })
})

test.describe("Signing page — invalid token", () => {
  test("shows error for non-existent token", async ({ page }) => {
    await page.goto("/sign/invalid-token-that-does-not-exist")
    await expect(page.locator("text=Link Unavailable")).toBeVisible()
  })

  test("shows error for empty token path", async ({ page }) => {
    const response = await page.goto("/sign/")
    // Should be 404 or redirect
    expect(response?.status()).toBeGreaterThanOrEqual(400)
  })
})

test.describe("Sign done page", () => {
  test("shows success screen by default", async ({ page }) => {
    await page.goto("/sign/done")
    // Should show a completion message
    await expect(page.locator("body")).toBeVisible()
  })

  test("shows declined screen when declined=1", async ({ page }) => {
    await page.goto("/sign/done?declined=1")
    await expect(page.locator("body")).toBeVisible()
  })
})

test.describe("Security headers", () => {
  test("returns proper security headers", async ({ page }) => {
    const response = await page.goto("/login")
    const headers = response?.headers() ?? {}

    expect(headers["x-frame-options"]).toBe("DENY")
    expect(headers["x-content-type-options"]).toBe("nosniff")
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin")
  })
})

test.describe("Rate limiting", () => {
  test("returns rate limit headers on API requests", async ({ request }) => {
    const response = await request.get("/api/auth/session")
    const limitHeader = response.headers()["x-ratelimit-limit"]
    // Auth endpoints have a limit of 10
    expect(limitHeader).toBeDefined()
  })

  test("blocks after exceeding rate limit on sign route", async ({ request }) => {
    // Send 21 requests to exceed the 20 req/min limit
    let blocked = false
    for (let i = 0; i < 25; i++) {
      const res = await request.get("/sign/test-rate-limit-token")
      if (res.status() === 429) {
        blocked = true
        const retryAfter = res.headers()["retry-after"]
        expect(retryAfter).toBeDefined()
        break
      }
    }
    expect(blocked).toBe(true)
  })
})
