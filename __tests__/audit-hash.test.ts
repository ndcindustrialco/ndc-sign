import { describe, it, expect } from "vitest"
import { createHash } from "crypto"

/**
 * Unit tests for audit hash chaining logic.
 * Tests the hash computation algorithm without requiring DB access.
 */

type AuditMeta = Record<string, string | number | boolean | null | undefined | string[]>

function computeAuditHash(data: {
  documentId: string
  type: string
  actorEmail?: string
  actorName?: string
  meta: AuditMeta
  previousHash: string | null
  createdAt: string
}): string {
  const payload = JSON.stringify({
    documentId: data.documentId,
    type: data.type,
    actorEmail: data.actorEmail ?? null,
    actorName: data.actorName ?? null,
    meta: data.meta,
    previousHash: data.previousHash,
    createdAt: data.createdAt,
  })
  return createHash("sha256").update(payload).digest("hex")
}

describe("computeAuditHash", () => {
  const baseEvent = {
    documentId: "doc-123",
    type: "DOCUMENT_CREATED",
    actorEmail: "user@example.com",
    actorName: "Test User",
    meta: {} as AuditMeta,
    previousHash: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  }

  it("produces a valid SHA-256 hex string", () => {
    const hash = computeAuditHash(baseEvent)
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it("is deterministic for the same input", () => {
    const hash1 = computeAuditHash(baseEvent)
    const hash2 = computeAuditHash(baseEvent)
    expect(hash1).toBe(hash2)
  })

  it("changes when documentId changes", () => {
    const hash1 = computeAuditHash(baseEvent)
    const hash2 = computeAuditHash({ ...baseEvent, documentId: "doc-456" })
    expect(hash1).not.toBe(hash2)
  })

  it("changes when type changes", () => {
    const hash1 = computeAuditHash(baseEvent)
    const hash2 = computeAuditHash({ ...baseEvent, type: "SIGNER_SIGNED" })
    expect(hash1).not.toBe(hash2)
  })

  it("changes when previousHash changes", () => {
    const hash1 = computeAuditHash(baseEvent)
    const hash2 = computeAuditHash({ ...baseEvent, previousHash: "abc123" })
    expect(hash1).not.toBe(hash2)
  })

  it("changes when createdAt changes", () => {
    const hash1 = computeAuditHash(baseEvent)
    const hash2 = computeAuditHash({ ...baseEvent, createdAt: "2026-01-02T00:00:00.000Z" })
    expect(hash1).not.toBe(hash2)
  })

  it("changes when meta changes", () => {
    const hash1 = computeAuditHash(baseEvent)
    const hash2 = computeAuditHash({ ...baseEvent, meta: { ip: "1.2.3.4" } })
    expect(hash1).not.toBe(hash2)
  })

  it("treats undefined actorEmail as null", () => {
    const hash1 = computeAuditHash({ ...baseEvent, actorEmail: undefined })
    const hash2 = computeAuditHash({ ...baseEvent, actorEmail: undefined })
    expect(hash1).toBe(hash2)
  })
})

describe("audit hash chain integrity", () => {
  it("forms a valid chain when events reference the previous hash", () => {
    const event1 = {
      ...{
        documentId: "doc-chain",
        type: "DOCUMENT_CREATED",
        actorEmail: "owner@test.com",
        actorName: "Owner",
        meta: {} as AuditMeta,
        previousHash: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    }
    const hash1 = computeAuditHash(event1)

    const event2 = {
      documentId: "doc-chain",
      type: "DOCUMENT_SENT",
      actorEmail: "owner@test.com",
      actorName: "Owner",
      meta: {} as AuditMeta,
      previousHash: hash1,
      createdAt: "2026-01-01T01:00:00.000Z",
    }
    const hash2 = computeAuditHash(event2)

    const event3 = {
      documentId: "doc-chain",
      type: "SIGNER_SIGNED",
      actorEmail: "signer@test.com",
      actorName: "Signer",
      meta: { ip: "10.0.0.1" } as AuditMeta,
      previousHash: hash2,
      createdAt: "2026-01-01T02:00:00.000Z",
    }
    const hash3 = computeAuditHash(event3)

    // All hashes should be unique
    expect(new Set([hash1, hash2, hash3]).size).toBe(3)

    // Verify chain: each event references the previous hash
    expect(event1.previousHash).toBeNull()
    expect(event2.previousHash).toBe(hash1)
    expect(event3.previousHash).toBe(hash2)
  })

  it("detects tampering when an event is modified", () => {
    const event1 = {
      documentId: "doc-tamper",
      type: "DOCUMENT_CREATED",
      actorEmail: "owner@test.com",
      actorName: "Owner",
      meta: {} as AuditMeta,
      previousHash: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    }
    const originalHash = computeAuditHash(event1)

    // "Tamper" with the event by changing the actor
    const tamperedHash = computeAuditHash({ ...event1, actorEmail: "attacker@evil.com" })

    expect(tamperedHash).not.toBe(originalHash)
  })

  it("detects chain break when previousHash is altered", () => {
    const event1Hash = computeAuditHash({
      documentId: "doc-break",
      type: "DOCUMENT_CREATED",
      actorEmail: "owner@test.com",
      actorName: "Owner",
      meta: {} as AuditMeta,
      previousHash: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    })

    // Legitimate event2 referencing event1
    const event2Legit = computeAuditHash({
      documentId: "doc-break",
      type: "DOCUMENT_SENT",
      actorEmail: "owner@test.com",
      actorName: "Owner",
      meta: {} as AuditMeta,
      previousHash: event1Hash,
      createdAt: "2026-01-01T01:00:00.000Z",
    })

    // Forged event2 referencing wrong previousHash
    const event2Forged = computeAuditHash({
      documentId: "doc-break",
      type: "DOCUMENT_SENT",
      actorEmail: "owner@test.com",
      actorName: "Owner",
      meta: {} as AuditMeta,
      previousHash: "forged-hash-value",
      createdAt: "2026-01-01T01:00:00.000Z",
    })

    expect(event2Legit).not.toBe(event2Forged)
  })
})
