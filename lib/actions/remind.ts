"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateToken, tokenExpiresAt, signingUrl } from "@/lib/token"
import { inngest } from "@/lib/inngest/client"
import { getOwnerAccessToken } from "@/lib/email/get-owner-token"
import { createAuditEvent } from "./audit"
import type { ActionResult } from "./document"

// ---------------------------------------------------------------------------
// Rate limit: one reminder per signer per hour
// ---------------------------------------------------------------------------

const REMINDER_COOLDOWN_MS = 60 * 60 * 1000

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const RemindSignerSchema = z.object({
  documentId: z.cuid(),
  signerId: z.cuid(),
  customMessage: z.string().max(2000).trim().optional(),
})

const RemindAllSchema = z.object({
  documentId: z.cuid(),
  customMessage: z.string().max(2000).trim().optional(),
})

// ---------------------------------------------------------------------------
// Check the most recent SIGNER_REINVITED audit event for this signer to
// enforce the cooldown. Returns ms remaining, or 0 if allowed.
// ---------------------------------------------------------------------------

async function cooldownRemaining(
  documentId: string,
  signerEmail: string
): Promise<number> {
  const latest = await prisma.auditEvent.findFirst({
    where: {
      documentId,
      type: "SIGNER_REINVITED",
      meta: { path: ["signerEmail"], equals: signerEmail },
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  })
  if (!latest) return 0
  const elapsed = Date.now() - latest.createdAt.getTime()
  return elapsed >= REMINDER_COOLDOWN_MS ? 0 : REMINDER_COOLDOWN_MS - elapsed
}

// ---------------------------------------------------------------------------
// Core reminder flow — idempotent, safe to call multiple times.
// Re-issues a fresh token only if the current one is missing / expired / used.
// ---------------------------------------------------------------------------

type RemindResult = {
  signerId: string
  email: string
  sent: boolean
  skippedReason?: "cooldown" | "not_pending" | "stub" | "no_token" | "no_access_token"
}

async function remindOneSigner(params: {
  documentId: string
  signerId: string
  actorUserId: string
  actorEmail?: string
  actorName?: string
  customMessage?: string
  enforceCooldown: boolean
}): Promise<RemindResult> {
  const { documentId, signerId, actorUserId, actorEmail, actorName, customMessage, enforceCooldown } = params

  const signer = await prisma.signer.findUnique({
    where: { id: signerId },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      isStub: true,
      documentId: true,
      token: { select: { id: true, expiresAt: true, usedAt: true } },
      document: {
        select: {
          id: true,
          name: true,
          uploadedBy: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  })

  if (!signer || signer.documentId !== documentId) {
    return { signerId, email: "", sent: false, skippedReason: "not_pending" }
  }
  if (signer.document.uploadedBy !== actorUserId) {
    return { signerId, email: signer.email, sent: false, skippedReason: "not_pending" }
  }
  if (signer.isStub) {
    return { signerId, email: signer.email, sent: false, skippedReason: "stub" }
  }
  if (signer.status !== "PENDING" && signer.status !== "OPENED") {
    return { signerId, email: signer.email, sent: false, skippedReason: "not_pending" }
  }

  if (enforceCooldown) {
    const wait = await cooldownRemaining(documentId, signer.email)
    if (wait > 0) {
      return { signerId, email: signer.email, sent: false, skippedReason: "cooldown" }
    }
  }

  // Ensure we have a usable token. If missing/expired/used, rotate it.
  let rawToken: string | null = null
  let expiresAt: Date
  const existing = signer.token

  const needsNewToken =
    !existing || existing.usedAt !== null || existing.expiresAt.getTime() <= Date.now()

  if (needsNewToken) {
    const { raw, hash } = generateToken()
    expiresAt = tokenExpiresAt()
    await prisma.signerToken.upsert({
      where: { signerId: signer.id },
      update: { tokenHash: hash, expiresAt, usedAt: null },
      create: { signerId: signer.id, tokenHash: hash, expiresAt },
    })
    rawToken = raw
  } else {
    // Token still valid but we can't recover the raw value — rotate so the
    // email contains a link the signer can actually click.
    const { raw, hash } = generateToken()
    expiresAt = tokenExpiresAt()
    await prisma.signerToken.update({
      where: { signerId: signer.id },
      data: { tokenHash: hash, expiresAt, usedAt: null },
    })
    rawToken = raw
  }

  const userAccessToken = await getOwnerAccessToken(actorUserId)
  if (!userAccessToken) {
    return { signerId, email: signer.email, sent: false, skippedReason: "no_access_token" }
  }

  await inngest.send({
    name: "email/signing-reminder",
    data: {
      userAccessToken,
      senderEmail: signer.document.user.email,
      senderName: signer.document.user.name ?? signer.document.user.email,
      signerName: signer.name,
      signerEmail: signer.email,
      documentName: signer.document.name,
      signingUrl: signingUrl(rawToken),
      expiresAt,
      customMessage,
    },
  })

  await createAuditEvent({
    documentId,
    type: "SIGNER_REINVITED",
    actorEmail,
    actorName,
    meta: { signerEmail: signer.email, signerName: signer.name },
  })

  return { signerId, email: signer.email, sent: true }
}

// ---------------------------------------------------------------------------
// remindSigner — remind a single signer
// ---------------------------------------------------------------------------

export async function remindSigner(
  input: z.infer<typeof RemindSignerSchema>
): Promise<ActionResult<{ sent: boolean; skippedReason?: string }>> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  const validated = RemindSignerSchema.safeParse(input)
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0]?.message ?? "Invalid input" }
  }

  const { documentId, signerId, customMessage } = validated.data

  const result = await remindOneSigner({
    documentId,
    signerId,
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? undefined,
    actorName: session.user.name ?? undefined,
    customMessage,
    enforceCooldown: true,
  })

  if (!result.sent) {
    const errMap: Record<string, string> = {
      cooldown: "กรุณารออย่างน้อย 1 ชั่วโมงก่อนส่งเตือนอีกครั้ง / Please wait at least 1 hour before reminding again",
      not_pending: "ผู้ลงนามนี้ไม่ได้อยู่ในสถานะรอลงนาม / Signer is not awaiting signature",
      stub: "ผู้ลงนามยังไม่มีอีเมล / Signer has no email address yet",
      no_token: "ไม่พบ token / Token not found",
      no_access_token: "ไม่พบ access token ของเจ้าของเอกสาร กรุณาเข้าสู่ระบบใหม่ / Owner access token missing — please sign in again",
    }
    return {
      ok: false,
      error: errMap[result.skippedReason ?? ""] ?? "ส่งไม่สำเร็จ / Reminder failed",
    }
  }

  revalidatePath(`/dashboard/documents/${documentId}`)
  return { ok: true, data: { sent: true } }
}

// ---------------------------------------------------------------------------
// remindAllPendingSigners — remind every PENDING/OPENED signer at once
// ---------------------------------------------------------------------------

export async function remindAllPendingSigners(
  input: z.infer<typeof RemindAllSchema>
): Promise<ActionResult<{ sentCount: number; skippedCount: number }>> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  const validated = RemindAllSchema.safeParse(input)
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0]?.message ?? "Invalid input" }
  }

  const { documentId, customMessage } = validated.data

  const doc = await prisma.document.findUnique({
    where: { id: documentId, uploadedBy: session.user.id },
    select: {
      id: true,
      signers: {
        where: { status: { in: ["PENDING", "OPENED"] }, isStub: false },
        select: { id: true },
      },
    },
  })

  if (!doc) return { ok: false, error: "Document not found" }
  if (doc.signers.length === 0) {
    return { ok: false, error: "ไม่มีผู้ลงนามที่รออยู่ / No pending signers to remind" }
  }

  let sentCount = 0
  let skippedCount = 0

  for (const s of doc.signers) {
    const r = await remindOneSigner({
      documentId,
      signerId: s.id,
      actorUserId: session.user.id,
      actorEmail: session.user.email ?? undefined,
      actorName: session.user.name ?? undefined,
      customMessage,
      enforceCooldown: true,
    })
    if (r.sent) sentCount++
    else skippedCount++
  }

  revalidatePath(`/dashboard/documents/${documentId}`)
  return { ok: true, data: { sentCount, skippedCount } }
}
