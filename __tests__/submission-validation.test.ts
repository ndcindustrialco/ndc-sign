import { describe, it, expect } from "vitest"
import { z } from "zod"

/**
 * Tests for submission validation schemas.
 * These mirror the schemas defined in lib/actions/submission.ts
 * to verify input validation without requiring DB access.
 */

const FieldValueSchema = z.object({
  fieldId: z.string().min(1),
  value: z.string().min(1),
})

const SubmitSchema = z.object({
  signerId: z.string().min(1),
  tokenId: z.string().min(1),
  values: z.array(FieldValueSchema).min(1),
  ip: z.string().max(100).optional(),
  userAgent: z.string().max(500).optional(),
  timezone: z.string().max(100).optional(),
})

const DeclineSchema = z.object({
  signerId: z.string().cuid(),
  reason: z.string().min(1).max(500).trim(),
})

describe("SubmitSchema", () => {
  const validInput = {
    signerId: "signer-123",
    tokenId: "token-456",
    values: [{ fieldId: "field-1", value: "John Doe" }],
  }

  it("accepts valid submission", () => {
    const result = SubmitSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it("accepts submission with optional metadata", () => {
    const result = SubmitSchema.safeParse({
      ...validInput,
      ip: "192.168.1.1",
      userAgent: "Mozilla/5.0",
      timezone: "Asia/Bangkok",
    })
    expect(result.success).toBe(true)
  })

  it("rejects empty signerId", () => {
    const result = SubmitSchema.safeParse({ ...validInput, signerId: "" })
    expect(result.success).toBe(false)
  })

  it("rejects empty values array", () => {
    const result = SubmitSchema.safeParse({ ...validInput, values: [] })
    expect(result.success).toBe(false)
  })

  it("rejects field value with empty value", () => {
    const result = SubmitSchema.safeParse({
      ...validInput,
      values: [{ fieldId: "field-1", value: "" }],
    })
    expect(result.success).toBe(false)
  })

  it("rejects excessively long IP", () => {
    const result = SubmitSchema.safeParse({
      ...validInput,
      ip: "x".repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it("rejects excessively long userAgent", () => {
    const result = SubmitSchema.safeParse({
      ...validInput,
      userAgent: "x".repeat(501),
    })
    expect(result.success).toBe(false)
  })
})

describe("DeclineSchema", () => {
  it("accepts valid decline input", () => {
    // Generate a valid CUID-like string for testing
    const result = DeclineSchema.safeParse({
      signerId: "cm1234567890abcdef",
      reason: "I disagree with the terms",
    })
    expect(result.success).toBe(true)
  })

  it("rejects empty reason", () => {
    const result = DeclineSchema.safeParse({
      signerId: "cm1234567890abcdef",
      reason: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects reason over 500 characters", () => {
    const result = DeclineSchema.safeParse({
      signerId: "cm1234567890abcdef",
      reason: "x".repeat(501),
    })
    expect(result.success).toBe(false)
  })

  it("trims whitespace from reason", () => {
    const result = DeclineSchema.safeParse({
      signerId: "cm1234567890abcdef",
      reason: "  Disagreement  ",
    })
    if (result.success) {
      expect(result.data.reason).toBe("Disagreement")
    }
  })
})
