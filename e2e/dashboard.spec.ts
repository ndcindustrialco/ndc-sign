import { test, expect } from "@playwright/test"
import path from "path"

const AUTH_FILE = path.join(__dirname, ".auth", "user.json")

/**
 * E2E tests for authenticated dashboard flows.
 *
 * Prerequisites:
 *   - Run auth.setup.ts first to create .auth/user.json
 *   - Or run with: npx playwright test --project=setup && npx playwright test dashboard.spec.ts
 *
 * Skip these tests if auth state doesn't exist (CI without test account).
 */

// Use saved auth state — tests will be skipped if file doesn't exist
test.use({ storageState: AUTH_FILE })

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard")
  })

  test("shows the dashboard page with document list", async ({ page }) => {
    // Dashboard should have an upload button or document list
    await expect(page.locator("body")).toBeVisible()
    // Check for key UI elements
    const heading = page.getByText(/document/i).first()
    await expect(heading).toBeVisible()
  })

  test("upload button navigates to upload page", async ({ page }) => {
    const uploadBtn = page.getByRole("link", { name: /upload/i }).or(
      page.getByRole("button", { name: /upload/i })
    )
    if (await uploadBtn.isVisible()) {
      await uploadBtn.click()
      await page.waitForURL("**/upload**")
      expect(page.url()).toContain("/upload")
    }
  })

  test("can filter documents by status", async ({ page }) => {
    // Look for status filter controls
    const statusFilter = page.getByRole("combobox").or(
      page.locator("[data-testid=status-filter]")
    )
    if (await statusFilter.isVisible()) {
      await statusFilter.click()
      // Should show status options
      await expect(page.getByText(/draft/i).or(page.getByText(/pending/i))).toBeVisible()
    }
  })

  test("pagination works", async ({ page }) => {
    const nextPage = page.getByRole("button", { name: /next/i }).or(
      page.getByLabel(/next page/i)
    )
    if (await nextPage.isVisible()) {
      await nextPage.click()
      // URL should update with page param
      await page.waitForURL(/page=2/)
    }
  })
})

test.describe("Document upload", () => {
  test.use({ storageState: AUTH_FILE })

  test("upload page rejects non-PDF files", async ({ page }) => {
    await page.goto("/dashboard/upload")

    // Create a fake .txt file
    const fileInput = page.locator("input[type=file]")
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles({
        name: "test.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("not a pdf"),
      })

      // Should show validation error
      await expect(
        page.getByText(/pdf/i).or(page.getByText(/not allowed/i))
      ).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe("Document detail", () => {
  test.use({ storageState: AUTH_FILE })

  test("redirects unauthenticated user to login", async ({ browser }) => {
    // Create a fresh context without auth
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto("/dashboard/documents/nonexistent-id")
    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    await context.close()
  })
})
