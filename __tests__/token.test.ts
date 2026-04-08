import { describe, it, expect } from "vitest"
import { generateToken, hashToken, tokenExpiresAt } from "@/lib/token"

describe("token", () => {
  describe("generateToken", () => {
    it("returns a raw token and its SHA-256 hash", () => {
      const { raw, hash } = generateToken()

      expect(raw).toHaveLength(64) // 32 bytes hex-encoded
      expect(hash).toHaveLength(64) // SHA-256 hex digest
      expect(raw).not.toBe(hash)
    })

    it("generates unique tokens on each call", () => {
      const t1 = generateToken()
      const t2 = generateToken()

      expect(t1.raw).not.toBe(t2.raw)
      expect(t1.hash).not.toBe(t2.hash)
    })
  })

  describe("hashToken", () => {
    it("is deterministic", () => {
      const raw = "test-token-value"
      expect(hashToken(raw)).toBe(hashToken(raw))
    })

    it("produces different hashes for different inputs", () => {
      expect(hashToken("a")).not.toBe(hashToken("b"))
    })

    it("hash of generated token matches", () => {
      const { raw, hash } = generateToken()
      expect(hashToken(raw)).toBe(hash)
    })
  })

  describe("tokenExpiresAt", () => {
    it("returns a future date", () => {
      const expires = tokenExpiresAt()
      expect(expires.getTime()).toBeGreaterThan(Date.now())
    })

    it("defaults to ~72 hours from now", () => {
      const expires = tokenExpiresAt()
      const diffHours = (expires.getTime() - Date.now()) / (60 * 60 * 1000)
      // Allow 1 minute tolerance
      expect(diffHours).toBeGreaterThan(71.9)
      expect(diffHours).toBeLessThan(72.1)
    })
  })
})
