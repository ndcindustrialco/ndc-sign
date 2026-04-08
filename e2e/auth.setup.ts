import { test as setup } from "@playwright/test"
import path from "path"

/**
 * Authentication setup for E2E tests that require a logged-in session.
 *
 * This uses Playwright's storageState to persist login across tests.
 * For CI, you can either:
 * 1. Use a test account with known credentials
 * 2. Mock the auth session via a test API endpoint
 * 3. Inject cookies/storage directly
 *
 * Instructions:
 *   1. Run `npx playwright test --project=setup` once to save auth state
 *   2. Subsequent tests will reuse the saved session
 */

const AUTH_FILE = path.join(__dirname, ".auth", "user.json")

setup("authenticate", async ({ page }) => {
  // Navigate to login and authenticate via Microsoft Entra ID.
  // In CI, this should be replaced with a mock auth flow or test credentials.
  //
  // For local development:
  //   1. Start the dev server: npm run dev
  //   2. Run: npx playwright test --project=setup --headed
  //   3. Manually sign in when the browser opens
  //   4. The session will be saved to e2e/.auth/user.json

  await page.goto("/login")
  await page.getByRole("button", { name: /sign in/i }).click()

  // Wait for redirect back to dashboard after OAuth
  await page.waitForURL("**/dashboard**", { timeout: 120_000 })

  // Save signed-in state
  await page.context().storageState({ path: AUTH_FILE })
})

export { AUTH_FILE }
