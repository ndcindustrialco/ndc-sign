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
// Types
// ---------------------------------------------------------------------------

export type SendSignerInput = {
  name: string
  email: string
  signingOrder: number
  partyIndex: number  // original row index in the editor (matches groupId "party:N")
}

export type SendDocumentInput = {
  documentId: string
  signers: SendSignerInput[]
  emailSubject: string
  emailMessage: string
  partyCount: number
}

export type SentSigner = {
  id: string
  name: string
  email: string
  signingOrder: number
  status: "PENDING" | "WAITING"
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const SendSignerSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.email().trim(),
  signingOrder: z.number().int().min(1),
  partyIndex: z.number().int().min(0),
})

const SendDocumentSchema = z.object({
  documentId: z.cuid(),
  signers: z.array(SendSignerSchema).min(1),
  emailSubject: z.string().min(1).max(200).trim(),
  emailMessage: z.string().max(2000).trim(),
  partyCount: z.number().int().min(1),
})

// ---------------------------------------------------------------------------
// sendDocument
// Replaces all existing PENDING/WAITING signers and sends fresh invites.
// Idempotent: safe to call multiple times (e.g. re-send after editing).
// ---------------------------------------------------------------------------

export async function sendDocument(
  input: SendDocumentInput
): Promise<ActionResult<SentSigner[]>> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  const validated = SendDocumentSchema.safeParse(input)
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0]?.message ?? "Invalid input" }
  }

  const { documentId, signers, emailSubject, emailMessage } = validated.data

  // Verify ownership
  const doc = await prisma.document.findUnique({
    where: { id: documentId, uploadedBy: session.user.id },
    select: {
      id: true,
      name: true,
      user: { select: { name: true, email: true } },
      signers: { select: { id: true, status: true } },
    },
  })
  if (!doc) return { ok: false, error: "Document not found" }

  // Block if any signer has already signed
  const hasSigned = doc.signers.some((s) => s.status === "SIGNED")
  if (hasSigned) {
    return { ok: false, error: "Cannot re-send: one or more signers have already signed" }
  }

  // Remove existing unsigned signers (cascade deletes tokens + submissions)
  if (doc.signers.length > 0) {
    await prisma.signer.deleteMany({ where: { documentId } })
  }

  // Determine which signers get PENDING (lowest order) vs WAITING
  const minOrder = Math.min(...signers.map((s) => s.signingOrder))

  // Create all signers + tokens in one transaction
  const createdSigners: SentSigner[] = []
  const tokenMap: Map<string, string> = new Map() // signerId → raw token

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < signers.length; i++) {
      const s = signers[i]!
      const status: "PENDING" | "WAITING" =
        s.signingOrder === minOrder ? "PENDING" : "WAITING"

      const { raw, hash } = generateToken()
      const expiresAt = tokenExpiresAt()

      const created = await tx.signer.create({
        data: {
          documentId,
          name: s.name,
          email: s.email,
          role: "SIGNER",
          signingOrder: s.signingOrder,
          order: i + 1,
          status,
          token: {
            create: { tokenHash: hash, expiresAt },
          },
        },
        select: { id: true, name: true, email: true, signingOrder: true, status: true },
      })

      tokenMap.set(created.id, raw)
      createdSigners.push({
        id: created.id,
        name: created.name,
        email: created.email,
        signingOrder: created.signingOrder,
        status: created.status as "PENDING" | "WAITING",
      })
    }
  })

  // Map party:N groupId → real signerId using each signer's partyIndex.
  // partyIndex is the original row position in the editor, not the array index here,
  // so this correctly handles cases where some party rows were skipped/left empty.
  for (let i = 0; i < signers.length; i++) {
    const signer = createdSigners[i]
    const signerInput = signers[i]
    if (!signer || !signerInput) continue
    await prisma.documentField.updateMany({
      where: { documentId, groupId: `party:${signerInput.partyIndex}` },
      data: { signerId: signer.id, groupId: null },
    })
  }

  // Update document status to PENDING
  await prisma.document.update({
    where: { id: documentId },
    data: { status: "PENDING" },
  })

  // Audit
  const actorEmail = session.user.email ?? undefined
  const actorName = session.user.name ?? undefined

  await createAuditEvent({ documentId, type: "DOCUMENT_SENT", actorEmail, actorName })

  for (const s of createdSigners) {
    await createAuditEvent({
      documentId,
      type: "SIGNER_INVITED",
      actorEmail,
      actorName,
      meta: { signerEmail: s.email, signerName: s.name },
    })
  }

  revalidatePath(`/dashboard/documents/${documentId}`)

  // Send invite emails (fire-and-forget)
  const senderName = doc.user.name ?? doc.user.email
  const senderEmail = doc.user.email
  const userAccessToken = await getOwnerAccessToken(session.user.id)

  if (!userAccessToken) {
    console.error("[sendDocument] No access_token found for user — emails will not be sent", {
      documentId,
      userId: session.user.id,
    })
    return { ok: true, data: createdSigners }
  }

  for (const signer of createdSigners) {
    if (signer.status !== "PENDING") continue
    const raw = tokenMap.get(signer.id)
    if (!raw) continue

    const signerToken = await prisma.signerToken.findUnique({
      where: { signerId: signer.id },
      select: { expiresAt: true },
    })
    if (!signerToken) continue

    await inngest.send({
      name: "email/signing-invite",
      data: {
        userAccessToken,
        senderEmail,
        senderName,
        signerName: signer.name,
        signerEmail: signer.email,
        documentName: doc.name,
        signingUrl: signingUrl(raw),
        expiresAt: signerToken.expiresAt,
        customSubject: emailSubject,
        customMessage: emailMessage,
      },
    })
  }

  return { ok: true, data: createdSigners }
}
