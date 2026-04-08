import { describe, it, expect } from "vitest"
import { rateLimit } from "@/lib/rate-limit"

describe("rateLimit (in-memory fallback)", () => {
  const config = { limit: 3, windowMs: 1000 }

  it("allows requests within the limit", async () => {
    const key = `test-allow-${Date.now()}`

    const r1 = await rateLimit(key, config)
    const r2 = await rateLimit(key, config)
    const r3 = await rateLimit(key, config)

    expect(r1.allowed).toBe(true)
    expect(r1.remaining).toBe(2)

    expect(r2.allowed).toBe(true)
    expect(r2.remaining).toBe(1)

    expect(r3.allowed).toBe(true)
    expect(r3.remaining).toBe(0)
  })

  it("blocks requests exceeding the limit", async () => {
    const key = `test-block-${Date.now()}`

    await rateLimit(key, config)
    await rateLimit(key, config)
    await rateLimit(key, config)
    const blocked = await rateLimit(key, config)

    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
  })

  it("includes correct limit in result", async () => {
    const key = `test-limit-${Date.now()}`
    const result = await rateLimit(key, config)
    expect(result.limit).toBe(3)
  })

  it("different keys are independent", async () => {
    const key1 = `test-key1-${Date.now()}`
    const key2 = `test-key2-${Date.now()}`

    await rateLimit(key1, config)
    await rateLimit(key1, config)
    await rateLimit(key1, config)

    const result = await rateLimit(key2, config)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(2)
  })

  it("provides resetAt timestamp in the future", async () => {
    const key = `test-reset-${Date.now()}`
    const result = await rateLimit(key, config)
    expect(result.resetAt).toBeGreaterThan(Date.now() - 100)
  })
})
