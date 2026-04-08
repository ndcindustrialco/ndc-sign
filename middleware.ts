import { NextRequest, NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"

// ---------------------------------------------------------------------------
// Rate limit configurations per route pattern
// ---------------------------------------------------------------------------

const API_LIMIT = { limit: 60, windowMs: 60_000 } // 60 req/min
const AUTH_LIMIT = { limit: 10, windowMs: 60_000 } // 10 req/min
const SIGN_LIMIT = { limit: 20, windowMs: 60_000 } // 20 req/min

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  )
}

function rateLimitResponse(resetAt: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
      },
    }
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = getClientIp(request)

  // Rate limit API routes
  if (pathname.startsWith("/api/")) {
    const config = pathname.startsWith("/api/auth") ? AUTH_LIMIT : API_LIMIT
    const key = `api:${ip}:${pathname}`
    const result = await rateLimit(key, config)

    if (!result.allowed) {
      return rateLimitResponse(result.resetAt)
    }

    const response = NextResponse.next()
    response.headers.set("X-RateLimit-Limit", String(result.limit))
    response.headers.set("X-RateLimit-Remaining", String(result.remaining))
    return response
  }

  // Rate limit signing pages (prevent token brute-force)
  if (pathname.startsWith("/sign/")) {
    const key = `sign:${ip}`
    const result = await rateLimit(key, SIGN_LIMIT)

    if (!result.allowed) {
      return rateLimitResponse(result.resetAt)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/api/:path*", "/sign/:path*"],
}
