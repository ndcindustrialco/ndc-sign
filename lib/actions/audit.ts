"use server"

import { createHash } from "crypto"
import { prisma } from "@/lib/prisma"
import type { AuditEventType } from "@/app/generated/prisma/client"

export type AuditMeta = Record<string, string | number | boolean | null | undefined | string[]>

/**
 * Compute SHA-256 hash of an audit event's content.
 * The hash covers all meaningful fields so any tampering is detectable.
 */
function computeAuditHash(data: {
  documentId: string
  type: AuditEventType
  actorEmail?: string
  actorName?: string
  meta: AuditMeta
  previousHash: string | null
  createdAt: string // ISO string
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

export async function createAuditEvent(data: {
  documentId: string
  type: AuditEventType
  actorEmail?: string
  actorName?: string
  meta?: AuditMeta
}): Promise<void> {
  const meta = data.meta ?? {}

  // Fetch the previous event's hash to form the chain.
  // Use a transaction to prevent concurrent inserts from breaking the chain.
  await prisma.$transaction(async (tx) => {
    const previous = await tx.auditEvent.findFirst({
      where: { documentId: data.documentId },
      orderBy: { createdAt: "desc" },
      select: { auditHash: true },
    })

    const previousHash = previous?.auditHash ?? null
    const createdAt = new Date()

    const auditHash = computeAuditHash({
      documentId: data.documentId,
      type: data.type,
      actorEmail: data.actorEmail,
      actorName: data.actorName,
      meta,
      previousHash,
      createdAt: createdAt.toISOString(),
    })

    await tx.auditEvent.create({
      data: {
        documentId: data.documentId,
        type: data.type,
        actorEmail: data.actorEmail,
        actorName: data.actorName,
        meta,
        auditHash,
        previousHash,
        createdAt,
      },
    })
  })
}

export async function getAuditEvents(documentId: string) {
  return prisma.auditEvent.findMany({
    where: { documentId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      type: true,
      actorEmail: true,
      actorName: true,
      meta: true,
      auditHash: true,
      previousHash: true,
      createdAt: true,
    },
  })
}

/**
 * Verify the integrity of a document's audit chain.
 * Returns true if the chain is intact (no tampering detected).
 */
export async function verifyAuditChain(documentId: string): Promise<{
  valid: boolean
  brokenAt?: string // event ID where the chain breaks
}> {
  const events = await prisma.auditEvent.findMany({
    where: { documentId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      documentId: true,
      type: true,
      actorEmail: true,
      actorName: true,
      meta: true,
      auditHash: true,
      previousHash: true,
      createdAt: true,
    },
  })

  let lastHash: string | null = null

  for (const event of events) {
    // Check chain link
    if (event.previousHash !== lastHash) {
      return { valid: false, brokenAt: event.id }
    }

    // Recompute hash and verify
    const expectedHash = computeAuditHash({
      documentId: event.documentId,
      type: event.type as AuditEventType,
      actorEmail: event.actorEmail ?? undefined,
      actorName: event.actorName ?? undefined,
      meta: (event.meta ?? {}) as AuditMeta,
      previousHash: event.previousHash,
      createdAt: event.createdAt.toISOString(),
    })

    if (event.auditHash !== expectedHash) {
      return { valid: false, brokenAt: event.id }
    }

    lastHash = event.auditHash
  }

  return { valid: true }
}
