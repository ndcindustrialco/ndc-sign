import { describe, it, expect, vi, beforeEach } from "vitest"

describe("validateEnv", () => {
  const VALID_ENV = {
    DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    AUTH_SECRET: "supersecret",
    AZURE_AD_CLIENT_ID: "client-id",
    AZURE_AD_CLIENT_SECRET: "client-secret",
    AZURE_AD_TENANT_ID: "tenant-id",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  }

  beforeEach(() => {
    vi.resetModules()
  })

  it("succeeds with valid env", async () => {
    vi.stubEnv("DATABASE_URL", VALID_ENV.DATABASE_URL)
    vi.stubEnv("AUTH_SECRET", VALID_ENV.AUTH_SECRET)
    vi.stubEnv("AZURE_AD_CLIENT_ID", VALID_ENV.AZURE_AD_CLIENT_ID)
    vi.stubEnv("AZURE_AD_CLIENT_SECRET", VALID_ENV.AZURE_AD_CLIENT_SECRET)
    vi.stubEnv("AZURE_AD_TENANT_ID", VALID_ENV.AZURE_AD_TENANT_ID)
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", VALID_ENV.NEXT_PUBLIC_SUPABASE_URL)
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", VALID_ENV.SUPABASE_SERVICE_ROLE_KEY)

    const { validateEnv } = await import("@/lib/env")
    const result = validateEnv()

    expect(result.DATABASE_URL).toBe(VALID_ENV.DATABASE_URL)
    expect(result.SUPABASE_STORAGE_BUCKET).toBe("documents") // default
  })

  it("throws when required vars are missing", async () => {
    // Clear all env vars
    vi.stubEnv("DATABASE_URL", "")
    vi.stubEnv("AUTH_SECRET", "")
    vi.stubEnv("AZURE_AD_CLIENT_ID", "")
    vi.stubEnv("AZURE_AD_CLIENT_SECRET", "")
    vi.stubEnv("AZURE_AD_TENANT_ID", "")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "")
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "")

    const { validateEnv } = await import("@/lib/env")
    expect(() => validateEnv()).toThrow("Missing or invalid environment variables")
  })

  it("rejects invalid SUPABASE_URL format", async () => {
    vi.stubEnv("DATABASE_URL", VALID_ENV.DATABASE_URL)
    vi.stubEnv("AUTH_SECRET", VALID_ENV.AUTH_SECRET)
    vi.stubEnv("AZURE_AD_CLIENT_ID", VALID_ENV.AZURE_AD_CLIENT_ID)
    vi.stubEnv("AZURE_AD_CLIENT_SECRET", VALID_ENV.AZURE_AD_CLIENT_SECRET)
    vi.stubEnv("AZURE_AD_TENANT_ID", VALID_ENV.AZURE_AD_TENANT_ID)
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not-a-url")
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", VALID_ENV.SUPABASE_SERVICE_ROLE_KEY)

    const { validateEnv } = await import("@/lib/env")
    expect(() => validateEnv()).toThrow()
  })
})
