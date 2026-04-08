/**
 * Sliding-window rate limiter with Redis store (production)
 * and in-memory fallback (development / single-instance).
 *
 * Automatically uses Redis when REDIS_URL is set, otherwise
 * falls back to in-memory Map.
 */

import Redis from "ioredis"

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

interface RateLimitStore {
  consume(key: string, limit: number, windowMs: number): Promise<{ tokens: number; resetAt: number }>
}

// ---------------------------------------------------------------------------
// Redis store (multi-instance safe)
// ---------------------------------------------------------------------------

let redisClient: Redis | null = null

function getRedis(): Redis | null {
  if (redisClient) return redisClient

  const url = process.env.REDIS_URL
  if (!url) return null

  try {
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
    })

    redisClient.on("error", (err) => {
      console.error(`[rate-limit] Redis error: ${err.message}`)
    })

    void redisClient.connect().catch(() => {
      // Connection will retry automatically
    })

    return redisClient
  } catch {
    return null
  }
}

// Lua script: atomic sliding-window token bucket
const LUA_CONSUME = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local data = redis.call("HMGET", key, "tokens", "lastRefill")
local tokens = tonumber(data[1])
local lastRefill = tonumber(data[2])

if tokens == nil then
  tokens = limit - 1
  lastRefill = now
  redis.call("HMSET", key, "tokens", tokens, "lastRefill", lastRefill)
  redis.call("PEXPIRE", key, windowMs * 2)
  return {tokens, lastRefill + windowMs}
end

local elapsed = now - lastRefill
local refill = math.floor((elapsed / windowMs) * limit)

if refill > 0 then
  tokens = math.min(limit, tokens + refill)
  lastRefill = now
end

if tokens > 0 then
  tokens = tokens - 1
  redis.call("HMSET", key, "tokens", tokens, "lastRefill", lastRefill)
  redis.call("PEXPIRE", key, windowMs * 2)
  return {tokens, lastRefill + windowMs}
end

redis.call("HMSET", key, "tokens", tokens, "lastRefill", lastRefill)
redis.call("PEXPIRE", key, windowMs * 2)
return {-1, lastRefill + windowMs}
`

class RedisStore implements RateLimitStore {
  constructor(private client: Redis) {}

  async consume(key: string, limit: number, windowMs: number) {
    const now = Date.now()
    const result = (await this.client.eval(
      LUA_CONSUME,
      1,
      `rl:${key}`,
      limit,
      windowMs,
      now
    )) as [number, number]

    const tokens = result[0]
    const resetAt = result[1]

    return { tokens: Math.max(0, tokens), resetAt }
  }
}

// ---------------------------------------------------------------------------
// In-memory store (fallback for dev / single instance)
// ---------------------------------------------------------------------------

interface MemoryEntry {
  tokens: number
  lastRefill: number
}

const memoryStore = new Map<string, MemoryEntry>()
let lastCleanup = Date.now()
const CLEANUP_INTERVAL_MS = 60_000

function memoryCleanup(windowMs: number) {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now
  const cutoff = now - windowMs * 2
  for (const [key, entry] of memoryStore) {
    if (entry.lastRefill < cutoff) {
      memoryStore.delete(key)
    }
  }
}

class MemoryStore implements RateLimitStore {
  async consume(key: string, limit: number, windowMs: number) {
    const now = Date.now()
    memoryCleanup(windowMs)

    const entry = memoryStore.get(key)

    if (!entry) {
      memoryStore.set(key, { tokens: limit - 1, lastRefill: now })
      return { tokens: limit - 1, resetAt: now + windowMs }
    }

    const elapsed = now - entry.lastRefill
    const refill = Math.floor((elapsed / windowMs) * limit)

    if (refill > 0) {
      entry.tokens = Math.min(limit, entry.tokens + refill)
      entry.lastRefill = now
    }

    if (entry.tokens > 0) {
      entry.tokens -= 1
      return { tokens: entry.tokens, resetAt: entry.lastRefill + windowMs }
    }

    return { tokens: -1, resetAt: entry.lastRefill + windowMs }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number
  /** Window duration in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
  /** Unix ms when the bucket fully refills */
  resetAt: number
}

let store: RateLimitStore | null = null

function getStore(): RateLimitStore {
  if (store) return store

  const redis = getRedis()
  if (redis) {
    store = new RedisStore(redis)
  } else {
    store = new MemoryStore()
  }

  return store
}

export async function rateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { limit, windowMs } = config

  try {
    const result = await getStore().consume(key, limit, windowMs)

    return {
      allowed: result.tokens >= 0,
      remaining: Math.max(0, result.tokens),
      limit,
      resetAt: result.resetAt,
    }
  } catch {
    // If Redis is down, fall back to allowing the request
    // to avoid blocking all traffic. Log will appear via Redis error handler.
    return { allowed: true, remaining: limit, limit, resetAt: Date.now() + windowMs }
  }
}
