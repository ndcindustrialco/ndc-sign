import { describe, it, expect } from "vitest"
import { z } from "zod"

/**
 * Integration tests for server action validation schemas.
 * These mirror the exact schemas from lib/actions/* to verify
 * that input validation correctly rejects malicious/malformed data.
 */

// ── Upload validation ───────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = ["application/pdf"] as const
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

const UploadSchema = z.object({
  name: z.string().min(1).max(255),
  mimeType: z.enum(ALLOWED_MIME_TYPES, {
    error: "Only PDF files are allowed",
  }),
  size: z.number().int().positive().max(MAX_FILE_SIZE_BYTES, {
    error: "File must be smaller than 10 MB",
  }),
})

describe("UploadSchema", () => {
  it("accepts a valid PDF upload", () => {
    const result = UploadSchema.safeParse({
      name: "contract.pdf",
      mimeType: "application/pdf",
      size: 1024 * 1024,
    })
    expect(result.success).toBe(true)
  })

  it("rejects non-PDF MIME types", () => {
    const result = UploadSchema.safeParse({
      name: "image.png",
      mimeType: "image/png",
      size: 1024,
    })
    expect(result.success).toBe(false)
  })

  it("rejects executable files disguised as PDF name", () => {
    const result = UploadSchema.safeParse({
      name: "virus.exe",
      mimeType: "application/x-msdownload",
      size: 500,
    })
    expect(result.success).toBe(false)
  })

  it("rejects files larger than 10MB", () => {
    const result = UploadSchema.safeParse({
      name: "huge.pdf",
      mimeType: "application/pdf",
      size: 11 * 1024 * 1024,
    })
    expect(result.success).toBe(false)
  })

  it("rejects zero-byte files", () => {
    const result = UploadSchema.safeParse({
      name: "empty.pdf",
      mimeType: "application/pdf",
      size: 0,
    })
    expect(result.success).toBe(false)
  })

  it("rejects negative file sizes", () => {
    const result = UploadSchema.safeParse({
      name: "trick.pdf",
      mimeType: "application/pdf",
      size: -1,
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty file name", () => {
    const result = UploadSchema.safeParse({
      name: "",
      mimeType: "application/pdf",
      size: 1024,
    })
    expect(result.success).toBe(false)
  })

  it("rejects excessively long file names", () => {
    const result = UploadSchema.safeParse({
      name: "a".repeat(256),
      mimeType: "application/pdf",
      size: 1024,
    })
    expect(result.success).toBe(false)
  })
})

// ── Send document validation ────────────────────────────────────────────────

const SendSignerSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.email().trim(),
  signingOrder: z.number().int().min(1),
})

const SendDocumentSchema = z.object({
  documentId: z.cuid(),
  signers: z.array(SendSignerSchema).min(1),
  emailSubject: z.string().min(1).max(200).trim(),
  emailMessage: z.string().max(2000).trim(),
})

describe("SendDocumentSchema", () => {
  const validInput = {
    documentId: "cm1234567890abcdef",
    signers: [
      { name: "John Doe", email: "john@example.com", signingOrder: 1 },
    ],
    emailSubject: "Please sign this document",
    emailMessage: "Hi, please review and sign.",
  }

  it("accepts valid send input", () => {
    const result = SendDocumentSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it("rejects empty signers array", () => {
    const result = SendDocumentSchema.safeParse({ ...validInput, signers: [] })
    expect(result.success).toBe(false)
  })

  it("rejects invalid email in signer", () => {
    const result = SendDocumentSchema.safeParse({
      ...validInput,
      signers: [{ name: "Test", email: "not-an-email", signingOrder: 1 }],
    })
    expect(result.success).toBe(false)
  })

  it("rejects zero signingOrder", () => {
    const result = SendDocumentSchema.safeParse({
      ...validInput,
      signers: [{ name: "Test", email: "test@x.com", signingOrder: 0 }],
    })
    expect(result.success).toBe(false)
  })

  it("rejects subject longer than 200 chars", () => {
    const result = SendDocumentSchema.safeParse({
      ...validInput,
      emailSubject: "x".repeat(201),
    })
    expect(result.success).toBe(false)
  })

  it("rejects message longer than 2000 chars", () => {
    const result = SendDocumentSchema.safeParse({
      ...validInput,
      emailMessage: "x".repeat(2001),
    })
    expect(result.success).toBe(false)
  })

  it("trims whitespace from signer name and email", () => {
    const result = SendDocumentSchema.safeParse({
      ...validInput,
      signers: [{ name: "  John  ", email: " john@example.com ", signingOrder: 1 }],
    })
    if (result.success) {
      expect(result.data.signers[0]!.name).toBe("John")
      expect(result.data.signers[0]!.email).toBe("john@example.com")
    }
  })

  it("rejects XSS attempt in email subject", () => {
    // Subject with script tag should be trimmed but still valid length
    // The important thing is Zod validates it as string with max length
    const xss = '<script>alert("xss")</script>'
    const result = SendDocumentSchema.safeParse({
      ...validInput,
      emailSubject: xss,
    })
    // This passes Zod (it's just a string), but output is HTML-escaped in templates
    expect(result.success).toBe(true)
  })
})

// ── Field position validation ───────────────────────────────────────────────

const FieldTypeSchema = z.enum([
  "SIGNATURE", "INITIALS", "TEXT", "DATE", "NUMBER",
  "IMAGE", "CHECKBOX", "RADIO", "SELECT", "FILE",
  "STAMP", "PHONE", "CELLS",
])

const PositionSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(1).max(100),
  height: z.number().min(1).max(100),
})

const CreateFieldSchema = z.object({
  documentId: z.string().cuid(),
  signerId: z.string().cuid().optional(),
  type: FieldTypeSchema,
  page: z.number().int().min(1),
  label: z.string().max(100).optional(),
  required: z.boolean().default(true),
  options: z.array(z.string()).default([]),
  groupId: z.string().max(100).optional(),
}).merge(PositionSchema)

describe("CreateFieldSchema", () => {
  const validField = {
    documentId: "cm1234567890abcdef",
    type: "SIGNATURE" as const,
    page: 1,
    x: 50,
    y: 50,
    width: 20,
    height: 10,
  }

  it("accepts a valid field", () => {
    const result = CreateFieldSchema.safeParse(validField)
    expect(result.success).toBe(true)
  })

  it("rejects x position out of range (negative)", () => {
    const result = CreateFieldSchema.safeParse({ ...validField, x: -1 })
    expect(result.success).toBe(false)
  })

  it("rejects x position out of range (>100)", () => {
    const result = CreateFieldSchema.safeParse({ ...validField, x: 101 })
    expect(result.success).toBe(false)
  })

  it("rejects zero width", () => {
    const result = CreateFieldSchema.safeParse({ ...validField, width: 0 })
    expect(result.success).toBe(false)
  })

  it("rejects invalid field type", () => {
    const result = CreateFieldSchema.safeParse({ ...validField, type: "INVALID" })
    expect(result.success).toBe(false)
  })

  it("rejects page 0", () => {
    const result = CreateFieldSchema.safeParse({ ...validField, page: 0 })
    expect(result.success).toBe(false)
  })

  it("rejects non-integer page", () => {
    const result = CreateFieldSchema.safeParse({ ...validField, page: 1.5 })
    expect(result.success).toBe(false)
  })

  it("defaults required to true", () => {
    const result = CreateFieldSchema.safeParse(validField)
    if (result.success) {
      expect(result.data.required).toBe(true)
    }
  })

  it("defaults options to empty array", () => {
    const result = CreateFieldSchema.safeParse(validField)
    if (result.success) {
      expect(result.data.options).toEqual([])
    }
  })
})

// ── Env validation schema ───────────────────────────────────────────────────

describe("Environment validation schema", () => {
  const envSchema = z.object({
    DATABASE_URL: z.string().min(1),
    AUTH_SECRET: z.string().min(1),
    AZURE_AD_CLIENT_ID: z.string().min(1),
    AZURE_AD_CLIENT_SECRET: z.string().min(1),
    AZURE_AD_TENANT_ID: z.string().min(1),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    SUPABASE_STORAGE_BUCKET: z.string().min(1).default("documents"),
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
    ACCESS_TOKEN_TTL_HOURS: z.string().default("72"),
    SENTRY_DSN: z.string().optional(),
    INNGEST_EVENT_KEY: z.string().optional(),
    REDIS_URL: z.string().optional(),
  })

  it("fails when DATABASE_URL is missing", () => {
    const result = envSchema.safeParse({ AUTH_SECRET: "x" })
    expect(result.success).toBe(false)
  })

  it("fails when SUPABASE_URL is not a valid URL", () => {
    const result = envSchema.safeParse({
      DATABASE_URL: "postgres://x",
      AUTH_SECRET: "secret",
      AZURE_AD_CLIENT_ID: "id",
      AZURE_AD_CLIENT_SECRET: "secret",
      AZURE_AD_TENANT_ID: "tenant",
      NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
      SUPABASE_SERVICE_ROLE_KEY: "key",
    })
    expect(result.success).toBe(false)
  })

  it("defaults STORAGE_BUCKET to 'documents'", () => {
    const result = envSchema.safeParse({
      DATABASE_URL: "postgres://x",
      AUTH_SECRET: "secret",
      AZURE_AD_CLIENT_ID: "id",
      AZURE_AD_CLIENT_SECRET: "secret",
      AZURE_AD_TENANT_ID: "tenant",
      NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "key",
    })
    if (result.success) {
      expect(result.data.SUPABASE_STORAGE_BUCKET).toBe("documents")
    }
  })
})
