"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateToken, tokenExpiresAt, signingUrl } from "@/lib/token"
import { createAuditEvent } from "./audit"
import type { ActionResult } from "./document"

// ---------------------------------------------------------------------------
// selfSign
//
// Creates a Signer record for the document owner (themselves), assigns all
// unassigned fields to that signer, generates a one-time signing token, and
// returns the signing URL so the editor can redirect the owner to /sign/[token].
//
// The actual signing (PDF generation, status update, email) is handled by the
// existing submitSignature action — no duplication needed.
// ---------------------------------------------------------------------------

const SelfSignSchema = z.object({
  documentId: z.string().cuid(),
})

export type SelfSignResult = {
  signingUrl: string
  signerId: string
}

export async function selfSign(
  documentId: string
): Promise<ActionResult<SelfSignResult>> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  const validated = SelfSignSchema.safeParse({ documentId })
  if (!validated.success) {
    return { ok: false, error: "Invalid document ID" }
  }

  const doc = await prisma.document.findUnique({
    where: { id: documentId, uploadedBy: session.user.id },
    select: {
      id: true,
      name: true,
      status: true,
      fields: { select: { id: true, signerId: true } },
      signers: { select: { id: true, status: true } },
    },
  })

  if (!doc) return { ok: false, error: "Document not found" }
  if (doc.status !== "DRAFT") {
    return { ok: false, error: "Only DRAFT documents can be self-signed" }
  }

  const userName = session.user.name ?? session.user.email ?? "Owner"
  const userEmail = session.user.email ?? ""

  if (!userEmail) return { ok: false, error: "User email is required" }

  // Remove any existing signers (draft — none should be SIGNED yet)
  if (doc.signers.length > 0) {
    await prisma.signer.deleteMany({ where: { documentId } })
  }

  const { raw, hash } = generateToken()
  const expiresAt = tokenExpiresAt()

  // Create the owner as the sole signer
  const signer = await prisma.signer.create({
    data: {
      documentId,
      name: userName,
      email: userEmail,
      role: "SIGNER",
      signingOrder: 1,
      order: 1,
      status: "PENDING",
      token: {
        create: { tokenHash: hash, expiresAt },
      },
    },
    select: { id: true },
  })

  // Assign all fields (including those with placeholder groupId) to this signer
  await prisma.documentField.updateMany({
    where: { documentId },
    data: { signerId: signer.id, groupId: null },
  })

  // Update document status to PENDING
  await prisma.document.update({
    where: { id: documentId },
    data: { status: "PENDING" },
  })

  await createAuditEvent({
    documentId,
    type: "DOCUMENT_SENT",
    actorEmail: userEmail,
    actorName: userName,
  })

  await createAuditEvent({
    documentId,
    type: "SIGNER_INVITED",
    actorEmail: userEmail,
    actorName: userName,
    meta: { signerEmail: userEmail, signerName: userName, selfSign: true },
  })

  revalidatePath(`/dashboard/documents/${documentId}`)

  return {
    ok: true,
    data: {
      signingUrl: signingUrl(raw),
      signerId: signer.id,
    },
  }
}
