"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateToken, tokenExpiresAt, signingUrl } from "@/lib/token"
import { sendSigningInvite } from "@/lib/email/send"
import { getOwnerAccessToken } from "@/lib/email/get-owner-token"
import type { ActionResult } from "./document"

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const AddSignerSchema = z.object({
  documentId: z.cuid(),
  name: z.string().min(1).max(100).trim(),
  email: z.email().trim(),
  signingOrder: z.number().int().min(1).default(1),
})

const UpdateSignerSchema = z.object({
  signerId: z.cuid(),
  signingOrder: z.number().int().min(1).optional(),
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SignerItem = {
  id: string
  name: string
  email: string
  role: "SIGNER"
  order: number
  signingOrder: number
  status: "PENDING" | "WAITING" | "OPENED" | "SIGNED" | "DECLINED"
  signingUrl: string | null
  tokenExpiresAt: Date | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function assertDocumentOwner(documentId: string, userId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { uploadedBy: true },
  })
  return doc?.uploadedBy === userId
}

async function getDocumentWithOwner(documentId: string) {
  return prisma.document.findUnique({
    where: { id: documentId },
    select: {
      name: true,
      user: { select: { name: true, email: true } },
    },
  })
}

/**
 * Returns the minimum signingOrder across all PENDING/WAITING signers
 * for the given document — i.e., the current "active" signing round.
 */
export async function getActiveSigningOrder(documentId: string): Promise<number> {
  const result = await prisma.signer.aggregate({
    where: {
      documentId,
      status: { in: ["PENDING", "WAITING"] },
      role: "SIGNER",
    },
    _min: { signingOrder: true },
  })
  return result._min.signingOrder ?? 1
}

// ---------------------------------------------------------------------------
// addSigner
// ---------------------------------------------------------------------------

export async function addSigner(
  input: z.infer<typeof AddSignerSchema>
): Promise<ActionResult<SignerItem>> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  const validated = AddSignerSchema.safeParse(input)
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0]?.message ?? "Invalid input" }
  }

  const { documentId, name, email, signingOrder } = validated.data

  const isOwner = await assertDocumentOwner(documentId, session.user.id)
  if (!isOwner) return { ok: false, error: "Not found" }

  // Check duplicate email on same document
  const existing = await prisma.signer.findFirst({
    where: { documentId, email },
    select: { id: true },
  })
  if (existing) {
    return { ok: false, error: `${email} is already a recipient of this document` }
  }

  // Determine next display order number
  const maxOrder = await prisma.signer.aggregate({
    where: { documentId },
    _max: { order: true },
  })
  const order = (maxOrder._max.order ?? 0) + 1

  // Determine initial status:
  // If signingOrder > 1, this signer is WAITING until earlier groups complete
  const activeOrder = await getActiveSigningOrder(documentId)
  const initialStatus = signingOrder > activeOrder
    ? ("WAITING" as const)
    : ("PENDING" as const)

  // Generate secure token
  const { raw, hash } = generateToken()
  const expiresAt = tokenExpiresAt()

  const signer = await prisma.signer.create({
    data: {
      documentId,
      name,
      email,
      role: "SIGNER",
      signingOrder,
      order,
      status: initialStatus,
      token: {
        create: {
          tokenHash: hash,
          expiresAt,
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      order: true,
      signingOrder: true,
      status: true,
      token: {
        select: { expiresAt: true },
      },
    },
  })

  revalidatePath(`/dashboard/documents/${documentId}`)

  // Only send invite email for active signers (not WAITING)
  if (initialStatus === "PENDING") {
    const doc = await getDocumentWithOwner(documentId)
    const userAccessToken = await getOwnerAccessToken(session.user.id)
    if (doc && userAccessToken) {
      sendSigningInvite({
        userAccessToken,
        senderEmail: doc.user.email,
        senderName: doc.user.name ?? doc.user.email,
        signerName: signer.name,
        signerEmail: signer.email,
        documentName: doc.name,
        signingUrl: signingUrl(raw),
        expiresAt,
      }).catch((err: unknown) => {
        console.error("[addSigner] sendSigningInvite failed", {
          documentId,
          signerEmail: signer.email,
          error: err instanceof Error ? err.message : String(err),
        })
      })
    }
  }


  return {
    ok: true,
    data: {
      id: signer.id,
      name: signer.name,
      email: signer.email,
      role: signer.role,
      order: signer.order,
      signingOrder: signer.signingOrder,
      status: signer.status,
      signingUrl: initialStatus === "PENDING" ? signingUrl(raw) : null,
      tokenExpiresAt: signer.token?.expiresAt ?? null,
    },
  }
}

// ---------------------------------------------------------------------------
// listSigners
// ---------------------------------------------------------------------------

export async function listSigners(
  documentId: string
): Promise<ActionResult<SignerItem[]>> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  const isOwner = await assertDocumentOwner(documentId, session.user.id)
  if (!isOwner) return { ok: false, error: "Not found" }

  const signers = await prisma.signer.findMany({
    where: { documentId },
    orderBy: [{ signingOrder: "asc" }, { order: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      order: true,
      signingOrder: true,
      status: true,
      token: {
        select: { expiresAt: true, usedAt: true },
      },
    },
  })

  return {
    ok: true,
    data: signers.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      role: s.role,
      order: s.order,
      signingOrder: s.signingOrder,
      status: s.status,
      signingUrl: null,
      tokenExpiresAt: s.token?.expiresAt ?? null,
    })),
  }
}

// ---------------------------------------------------------------------------
// updateSigner
// ---------------------------------------------------------------------------

export async function updateSigner(
  input: z.infer<typeof UpdateSignerSchema>
): Promise<ActionResult<SignerItem>> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  const validated = UpdateSignerSchema.safeParse(input)
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0]?.message ?? "Invalid input" }
  }

  const { signerId, signingOrder } = validated.data

  const signer = await prisma.signer.findUnique({
    where: { id: signerId },
    select: { documentId: true, status: true },
  })
  if (!signer) return { ok: false, error: "Not found" }

  if (signer.status === "SIGNED") {
    return { ok: false, error: "Cannot modify a signer who has already signed" }
  }

  const isOwner = await assertDocumentOwner(signer.documentId, session.user.id)
  if (!isOwner) return { ok: false, error: "Not found" }

  const updated = await prisma.signer.update({
    where: { id: signerId },
    data: {
      ...(signingOrder !== undefined && { signingOrder }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      order: true,
      signingOrder: true,
      status: true,
      token: { select: { expiresAt: true } },
    },
  })

  revalidatePath(`/dashboard/documents/${signer.documentId}`)

  return {
    ok: true,
    data: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      order: updated.order,
      signingOrder: updated.signingOrder,
      status: updated.status,
      signingUrl: null,
      tokenExpiresAt: updated.token?.expiresAt ?? null,
    },
  }
}

// ---------------------------------------------------------------------------
// removeSigner
// ---------------------------------------------------------------------------

export async function removeSigner(
  signerId: string
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  if (!z.cuid().safeParse(signerId).success) {
    return { ok: false, error: "Invalid id" }
  }

  const signer = await prisma.signer.findUnique({
    where: { id: signerId },
    select: { documentId: true, status: true },
  })
  if (!signer) return { ok: false, error: "Not found" }

  const isOwner = await assertDocumentOwner(signer.documentId, session.user.id)
  if (!isOwner) return { ok: false, error: "Not found" }

  if (signer.status === "SIGNED") {
    return { ok: false, error: "Cannot remove a signer who has already signed" }
  }

  await prisma.signer.delete({ where: { id: signerId } })

  revalidatePath(`/dashboard/documents/${signer.documentId}`)
  return { ok: true, data: undefined }
}
