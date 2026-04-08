import { z } from "zod"

/**
 * Validates all required environment variables at startup.
 * Import this file early (e.g. in instrumentation.ts) to fail fast
 * if configuration is missing.
 */

const serverEnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // NextAuth
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),

  // Microsoft Entra ID / Azure AD
  AZURE_AD_CLIENT_ID: z.string().min(1, "AZURE_AD_CLIENT_ID is required"),
  AZURE_AD_CLIENT_SECRET: z.string().min(1, "AZURE_AD_CLIENT_SECRET is required"),
  AZURE_AD_TENANT_ID: z.string().min(1, "AZURE_AD_TENANT_ID is required"),

  // Supabase Storage
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default("documents"),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  ACCESS_TOKEN_TTL_HOURS: z.string().default("72"),

  // Optional — Sentry (no-op if missing)
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),

  // Optional — Inngest
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),

  // Optional — Redis (for multi-instance rate limiting)
  REDIS_URL: z.string().optional(),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

let _validatedEnv: ServerEnv | null = null

export function validateEnv(): ServerEnv {
  if (_validatedEnv) return _validatedEnv

  const result = serverEnvSchema.safeParse(process.env)

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n")

    console.error(
      `\n❌ Environment validation failed:\n${formatted}\n\nPlease check your .env / .env.local files.\n`
    )

    throw new Error("Missing or invalid environment variables")
  }

  _validatedEnv = result.data
  return _validatedEnv
}
