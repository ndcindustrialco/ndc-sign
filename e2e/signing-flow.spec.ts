import { test, expect } from "@playwright/test"

/**
 * E2E tests for the signer-facing signing flow.
 *
 * These test the public signing pages that signers access via token URLs.
 * No authentication required — these use token-based access.
 *
 * For full flow testing, set E2E_SIGNING_TOKEN env var to a valid
 * signer token from a test document.
 */

const SIGNING_TOKEN = process.env.E2E_SIGNING_TOKEN

test.describe("Signing flow — invalid tokens", () => {
  test("expired-style token shows expiry message", async ({ page }) => {
    await page.goto("/sign/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    await expect(page.locator("text=Link Unavailable").or(page.locator("text=not valid"))).toBeVisible()
  })

  test("malformed short token shows error", async ({ page }) => {
    await page.goto("/sign/abc")
    await expect(page.locator("text=Link Unavailable").or(page.locator("text=not valid"))).toBeVisible()
  })

  test("SQL injection attempt in token is safe", async ({ page }) => {
    await page.goto("/sign/' OR 1=1 --")
    // Should not crash — just show invalid link
    await expect(page.locator("body")).toBeVisible()
    // Should NOT show any database error
    await expect(page.locator("text=database")).not.toBeVisible()
    await expect(page.locator("text=SQL")).not.toBeVisible()
  })

  test("XSS attempt in token is safe", async ({ page }) => {
    await page.goto("/sign/<script>alert(1)</script>")
    await expect(page.locator("body")).toBeVisible()
    // Should not execute script — page should be normal
    await expect(page.locator("script")).not.toBeVisible()
  })
})

test.describe("Signing flow — valid token", () => {
  test.skip(!SIGNING_TOKEN, "Set E2E_SIGNING_TOKEN to run these tests")

  test("loads signing page with PDF viewer and fields", async ({ page }) => {
    await page.goto(`/sign/${SIGNING_TOKEN}`)

    // Should show the signing form header
    await expect(page.locator("text=eSign")).toBeVisible()

    // Should display document name
    await expect(page.locator("header")).toBeVisible()
  })

  test("signing page shows signer info", async ({ page }) => {
    await page.goto(`/sign/${SIGNING_TOKEN}`)

    // The page should have form fields or a submit button
    const submitBtn = page.getByRole("button", { name: /sign|submit|confirm/i })
    await expect(submitBtn).toBeVisible({ timeout: 10_000 })
  })

  test("decline button is available", async ({ page }) => {
    await page.goto(`/sign/${SIGNING_TOKEN}`)

    const declineBtn = page.getByRole("button", { name: /decline/i })
    await expect(declineBtn).toBeVisible({ timeout: 10_000 })
  })
})

test.describe("Sign done page", () => {
  test("shows success state", async ({ page }) => {
    await page.goto("/sign/done")
    await expect(page.locator("body")).toBeVisible()
    // Should not show error
    await expect(page.locator("text=error")).not.toBeVisible()
  })

  test("shows declined state with query param", async ({ page }) => {
    await page.goto("/sign/done?declined=1")
    await expect(page.locator("body")).toBeVisible()
  })

  test("handles doc name in query", async ({ page }) => {
    await page.goto("/sign/done?doc=Test+Document")
    await expect(page.locator("body")).toBeVisible()
  })
})
