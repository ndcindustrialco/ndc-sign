"use server"

import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { supabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase"
import { logger } from "@/lib/logger"
import type { ActionResult } from "./document"

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const DeletionRequestSchema = z.object({
  userId: z.string().cuid(),
  confirmation: z.literal("DELETE_ALL_MY_DATA"),
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UserDataExport = {
  user: {
    id: string
    name: string | null
    email: string
    createdAt: Date
  }
  documents: Array<{
    id: string
    name: string
    status: string
    createdAt: Date
    signers: Array<{
      name: string
      email: string
      status: string
    }>
  }>
  signingActivity: Array<{
    documentName: string
    status: string
    signedAt: Date | null
  }>
  savedSignatures: Array<{
    email: string
    createdAt: Date
  }>
  auditEvents: Array<{
    documentId: string
    type: string
    createdAt: Date
    meta: unknown
  }>
  exportedAt: string
}

// ---------------------------------------------------------------------------
// GDPR Article 15 — Right of Access (Data Export)
// ---------------------------------------------------------------------------

export async function exportUserData(): Promise<ActionResult<UserDataExport>> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  const userId = session.user.id

  try {
    const [user, documents, signerRecords, savedSignatures, auditEvents] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true, createdAt: true },
        }),
        prisma.document.findMany({
          where: { uploadedBy: userId },
          select: {
            id: true,
            name: true,
            status: true,
            createdAt: true,
            signers: {
              select: { name: true, email: true, status: true },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        // Documents where this user was a signer (by email)
        session.user.email
          ? prisma.signer.findMany({
              where: { email: session.user.email },
              select: {
                status: true,
                createdAt: true,
                document: { select: { name: true } },
              },
              orderBy: { createdAt: "desc" },
            })
          : [],
        session.user.email
          ? prisma.savedSignature.findMany({
              where: { email: session.user.email },
              select: { email: true, createdAt: true },
            })
          : [],
        prisma.auditEvent.findMany({
          where: { actorEmail: session.user.email },
          select: {
            documentId: true,
            type: true,
            createdAt: true,
            meta: true,
          },
          orderBy: { createdAt: "desc" },
        }),
      ])

    if (!user) return { ok: false, error: "User not found" }

    const exportData: UserDataExport = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      documents,
      signingActivity: signerRecords.map((s) => ({
        documentName: s.document.name,
        status: s.status,
        signedAt: s.createdAt,
      })),
      savedSignatures,
      auditEvents,
      exportedAt: new Date().toISOString(),
    }

    logger.info("GDPR data export completed", { userId })

    return { ok: true, data: exportData }
  } catch (error) {
    logger.error("GDPR data export failed", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    })
    return { ok: false, error: "Failed to export data" }
  }
}

// ---------------------------------------------------------------------------
// GDPR Article 17 — Right to Erasure (Account Deletion)
// ---------------------------------------------------------------------------

export async function deleteUserAccount(
  input: { userId: string; confirmation: string }
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  // Only the user themselves can delete their account
  if (session.user.id !== input.userId) {
    return { ok: false, error: "You can only delete your own account" }
  }

  const validated = DeletionRequestSchema.safeParse(input)
  if (!validated.success) {
    return { ok: false, error: "You must confirm with 'DELETE_ALL_MY_DATA'" }
  }

  const userId = validated.data.userId

  try {
    // 1. Get all documents to clean up storage
    const documents = await prisma.document.findMany({
      where: { uploadedBy: userId },
      select: { storagePath: true, signedStoragePath: true },
    })

    // 2. Delete files from Supabase storage
    const storagePaths = documents.flatMap((d) =>
      [d.storagePath, d.signedStoragePath].filter(Boolean) as string[]
    )

    if (storagePaths.length > 0) {
      await supabaseAdmin.storage.from(STORAGE_BUCKET).remove(storagePaths)
    }

    // 3. Delete saved signatures
    if (session.user.email) {
      await prisma.savedSignature.deleteMany({
        where: { email: session.user.email },
      })
    }

    // 4. Anonymize audit trail (keep events for legal compliance, remove PII)
    if (session.user.email) {
      await prisma.auditEvent.updateMany({
        where: { actorEmail: session.user.email },
        data: {
          actorEmail: "[deleted]",
          actorName: "[deleted]",
        },
      })
    }

    // 5. Delete the user (cascades: documents, signers, fields, submissions, sessions, accounts)
    await prisma.user.delete({
      where: { id: userId },
    })

    logger.info("GDPR account deletion completed", { userId })

    return { ok: true, data: undefined }
  } catch (error) {
    logger.error("GDPR account deletion failed", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    })
    return { ok: false, error: "Failed to delete account" }
  }
}

// ---------------------------------------------------------------------------
// GDPR Article 7(3) — Right to Withdraw Consent (Delete Saved Signature)
// ---------------------------------------------------------------------------

export async function deleteSavedSignatureData(): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.email) return { ok: false, error: "Unauthorized" }

  try {
    await prisma.savedSignature.deleteMany({
      where: { email: session.user.email },
    })

    logger.info("Saved signature deleted", { email: session.user.email })
    return { ok: true, data: undefined }
  } catch (error) {
    logger.error("Failed to delete saved signature", {
      email: session.user.email,
      error: error instanceof Error ? error.message : String(error),
    })
    return { ok: false, error: "Failed to delete saved signature" }
  }
}

// ---------------------------------------------------------------------------
// Data Retention — Auto-cleanup of expired tokens
// ---------------------------------------------------------------------------

export async function cleanupExpiredTokens(): Promise<ActionResult<{ deleted: number }>> {
  try {
    const result = await prisma.signerToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
        usedAt: { not: null }, // Only delete used + expired tokens
      },
    })

    logger.info("Expired tokens cleaned up", { count: result.count })
    return { ok: true, data: { deleted: result.count } }
  } catch (error) {
    logger.error("Token cleanup failed", {
      error: error instanceof Error ? error.message : String(error),
    })
    return { ok: false, error: "Cleanup failed" }
  }
}
