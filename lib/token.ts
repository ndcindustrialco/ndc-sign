import { createHash, randomBytes } from "crypto"

const TTL_HOURS = parseInt(process.env.ACCESS_TOKEN_TTL_HOURS ?? "72", 10)

// ---------------------------------------------------------------------------
// Generate a raw token + its SHA-256 hash
// ---------------------------------------------------------------------------

export function generateToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("hex")
  const hash = hashToken(raw)
  return { raw, hash }
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}

export function tokenExpiresAt(): Date {
  return new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000)
}

// ---------------------------------------------------------------------------
// Build the signing URL for a raw token
// ---------------------------------------------------------------------------

export function signingUrl(rawToken: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  return `${base}/sign/${rawToken}`
}

// ---------------------------------------------------------------------------
// Verify token from URL param against DB record
// Returns null if invalid / expired / already used
// ---------------------------------------------------------------------------

export type TokenVerifyResult =
  | { valid: true; signerId: string; tokenId: string }
  | { valid: false; reason: "not_found" | "expired" | "used"; signerId?: string }

import { prisma } from "@/lib/prisma"

export async function verifySignerToken(
  rawToken: string
): Promise<TokenVerifyResult> {
  const tokenHash = hashToken(rawToken)

  const record = await prisma.signerToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      signerId: true,
      expiresAt: true,
      usedAt: true,
    },
  })

  if (!record) return { valid: false, reason: "not_found" }
  if (record.expiresAt < new Date()) return { valid: false, reason: "expired", signerId: record.signerId }
  if (record.usedAt) return { valid: false, reason: "used", signerId: record.signerId }

  return { valid: true, signerId: record.signerId, tokenId: record.id }
}

// ---------------------------------------------------------------------------
// Mark token as used (call when signer opens the signing page)
// ---------------------------------------------------------------------------

export async function consumeSignerToken(tokenId: string): Promise<void> {
  await prisma.signerToken.update({
    where: { id: tokenId },
    data: { usedAt: new Date() },
  })
}
