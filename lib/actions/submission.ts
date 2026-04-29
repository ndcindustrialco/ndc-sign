"use server"

import { z } from "zod"
import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"
import { generateSignedPdf } from "@/lib/pdf/generate-signed-pdf"
import { generateAuditPdf } from "@/lib/pdf/generate-audit-pdf"
import { generateToken, tokenExpiresAt, signingUrl } from "@/lib/token"
import { createAuditEvent, getAuditEvents } from "./audit"
import { inngest } from "@/lib/inngest/client"
import { getOwnerAccessToken } from "@/lib/email/get-owner-token"
import { uploadTempPdf } from "@/lib/email/pdf-storage"
import { logger } from "@/lib/logger"
import type { ActionResult } from "./document"

async function getRequestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers()
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null
  const userAgent = h.get("user-agent") ?? null
  return { ip, userAgent }
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

const SIGNING_ROLES: ("SIGNER")[] = ["SIGNER"]

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const FieldValueSchema = z.object({
  fieldId: z.string().min(1),
  value: z.string(), // empty string allowed (e.g. unchecked CHECKBOX)
})

const SubmitSchema = z.object({
  signerId: z.string().min(1),
  tokenId: z.string().min(1),
  values: z.array(FieldValueSchema),
  timezone: z.string().max(100).optional(),
})

// ---------------------------------------------------------------------------
// triggerNextSigningGroup
// After a signer completes, check if their signing order group is done.
// If so, unlock and invite the next group via Inngest (with retry).
// ---------------------------------------------------------------------------

async function triggerNextSigningGroup(
  documentId: string,
  completedSigningOrder: number
): Promise<{ triggeredNextGroup: boolean }> {
  const currentGroup = await prisma.signer.findMany({
    where: { documentId, signingOrder: completedSigningOrder, role: { in: SIGNING_ROLES } },
    select: { status: true },
  })

  const groupDone = currentGroup.every(
    (s) => s.status === "SIGNED" || s.status === "DECLINED"
  )
  if (!groupDone) return { triggeredNextGroup: false }

  const nextGroupResult = await prisma.signer.aggregate({
    where: {
      documentId,
      signingOrder: { gt: completedSigningOrder },
      role: { in: SIGNING_ROLES },
      status: "WAITING",
    },
    _min: { signingOrder: true },
  })
  const nextOrder = nextGroupResult._min?.signingOrder
  if (!nextOrder) return { triggeredNextGroup: false }

  const nextSigners = await prisma.signer.findMany({
    where: { documentId, signingOrder: nextOrder, role: { in: SIGNING_ROLES }, status: "WAITING" },
    select: { id: true, name: true, email: true },
  })

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { name: true, uploadedBy: true, user: { select: { name: true, email: true } } },
  })
  if (!doc) return { triggeredNextGroup: false }

  const userAccessToken = await getOwnerAccessToken(doc.uploadedBy)

  for (const nextSigner of nextSigners) {
    const { raw, hash } = generateToken()
    const expiresAt = tokenExpiresAt()

    const existingToken = await prisma.signerToken.findUnique({
      where: { signerId: nextSigner.id },
      select: { usedAt: true },
    })
    if (existingToken?.usedAt) {
      logger.warn("[triggerNextSigningGroup] resetting already-consumed token for WAITING signer", {
        documentId,
        signerId: nextSigner.id,
      })
    }

    await prisma.$transaction([
      prisma.signer.update({
        where: { id: nextSigner.id },
        data: { status: "PENDING" },
      }),
      prisma.signerToken.upsert({
        where: { signerId: nextSigner.id },
        create: { signerId: nextSigner.id, tokenHash: hash, expiresAt },
        update: { tokenHash: hash, expiresAt, usedAt: null },
      }),
    ])

    if (userAccessToken) {
      await inngest.send({
        name: "email/signing-invite",
        data: {
          userAccessToken,
          senderEmail: doc.user.email,
          senderName: doc.user.name ?? doc.user.email,
          signerName: nextSigner.name,
          signerEmail: nextSigner.email,
          documentName: doc.name,
          signingUrl: signingUrl(raw),
          expiresAt,
        },
      })
    }

    createAuditEvent({
      documentId,
      type: "SIGNER_INVITED",
      meta: { signerEmail: nextSigner.email, signerName: nextSigner.name, resent: false },
    }).catch(() => {})
  }

  return { triggeredNextGroup: true }
}

// ---------------------------------------------------------------------------
// submitSignature
// ---------------------------------------------------------------------------

export async function submitSignature(
  input: z.infer<typeof SubmitSchema>
): Promise<ActionResult> {
  const validated = SubmitSchema.safeParse(input)
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0]?.message ?? "Invalid input" }
  }

  const { signerId, tokenId, values, timezone } = validated.data
  const { ip, userAgent } = await getRequestMeta()

  const signer = await prisma.signer.findUnique({
    where: { id: signerId },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      role: true,
      signingOrder: true,
      documentId: true,
      document: {
        select: {
          name: true,
          uploadedBy: true,
          fields: { where: { signerId }, select: { id: true, required: true, type: true, label: true } },
          user: { select: { name: true, email: true } },
        },
      },
    },
  })

  if (!signer) return { ok: false, error: "Signer not found" }
  if (signer.status === "SIGNED") return { ok: false, error: "Document has already been signed" }
  if (signer.status === "DECLINED") return { ok: false, error: "This signing request was declined" }
  if (signer.status === "WAITING") return { ok: false, error: "It is not your turn to sign yet" }

  const submittedValueMap = new Map(values.map((v) => [v.fieldId, v.value]))
  const missingRequired = signer.document.fields.filter((f) => {
    if (f.type === "CHECKBOX") return false
    if (!f.required) return false
    const val = submittedValueMap.get(f.id)
    return val === undefined || val.trim() === ""
  })
  if (missingRequired.length > 0) {
    return { ok: false, error: `${missingRequired.length} required field(s) are missing` }
  }

  const validFieldIds = new Set(signer.document.fields.map((f) => f.id))
  const invalidField = values.find((v) => v.value !== "" && !validFieldIds.has(v.fieldId))
  if (invalidField) return { ok: false, error: "Invalid field reference" }

  const fieldTypeMap = new Map(signer.document.fields.map((f) => [f.id, f.type]))
  const phoneRegex = /^[0-9+\-\s().]{7,20}$/
  const invalidPhone = values.find(
    (v) => fieldTypeMap.get(v.fieldId) === "PHONE" && !phoneRegex.test(v.value)
  )
  if (invalidPhone) return { ok: false, error: "Invalid phone number format" }

  // Use interactive transaction with optimistic lock to prevent double-submit
  const txResult = await prisma.$transaction(async (tx) => {
    // Re-check status inside transaction to prevent race condition
    const locked = await tx.signer.findUnique({
      where: { id: signerId },
      select: { status: true },
    })
    if (!locked || locked.status === "SIGNED") {
      return { ok: false as const, error: "Document has already been signed" }
    }

    // Consume token atomically inside the transaction so it is never burned
    // if a subsequent step fails (signer lookup, validation, etc.)
    await tx.signerToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    })

    for (const v of values) {
      await tx.fieldSubmission.upsert({
        where: { signerId_fieldId: { signerId, fieldId: v.fieldId } },
        create: { signerId, fieldId: v.fieldId, value: v.value },
        update: { value: v.value },
      })
    }

    await tx.signer.update({
      where: { id: signerId },
      data: { status: "SIGNED" },
    })

    return { ok: true as const }
  })

  if (!txResult.ok) {
    return { ok: false, error: txResult.error }
  }

  const submittedIds = new Set(values.map((v) => v.fieldId))
  const fieldLabels = signer.document.fields
    .filter((f) => submittedIds.has(f.id))
    .map((f, idx) => f.label ?? `${f.type} Field ${idx + 1}`)

  await createAuditEvent({
    documentId: signer.documentId,
    type: "SIGNER_SIGNED",
    actorEmail: signer.email,
    actorName: signer.name,
    meta: {
      signerEmail: signer.email,
      signerName: signer.name,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
      timezone: timezone ?? null,
      fields: fieldLabels,
    },
  })

  // Generate signed PDF
  let signedPdfBytes: Uint8Array | null = null
  try {
    const result = await generateSignedPdf(signer.documentId, signerId)
    signedPdfBytes = result.signedBytes
  } catch (err) {
    logger.error("[submitSignature] generateSignedPdf failed", {
      documentId: signer.documentId,
      signerId,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  const ownerEmail = signer.document.user.email
  const ownerName = signer.document.user.name ?? ownerEmail
  const documentName = signer.document.name
  const documentUrl = `${APP_URL}/dashboard/documents/${signer.documentId}`
  const now = new Date()
  const userAccessToken = await getOwnerAccessToken(signer.document.uploadedBy)

  const { triggeredNextGroup } = await triggerNextSigningGroup(signer.documentId, signer.signingOrder)

  const allRequiredSigners = await prisma.signer.findMany({
    where: { documentId: signer.documentId, role: { in: SIGNING_ROLES } },
    select: { status: true },
  })
  const allSigned = allRequiredSigners.every((s) => s.status === "SIGNED")

  if (allSigned && allRequiredSigners.length > 0) {
    // All signers done — complete the document and send one round of notifications
    await prisma.document.update({
      where: { id: signer.documentId },
      data: { status: "COMPLETED" },
    })

    await createAuditEvent({
      documentId: signer.documentId,
      type: "DOCUMENT_COMPLETED",
      meta: { totalSigners: allRequiredSigners.length },
    })

    try {
      const completedDoc = await prisma.document.findUnique({
        where: { id: signer.documentId },
        select: {
          documentHash: true,
          user: { select: { name: true, email: true } },
          signers: { select: { name: true, email: true, status: true }, orderBy: { order: "asc" } },
        },
      })

      if (completedDoc) {
        const auditEvents = await getAuditEvents(signer.documentId)

        let signedDocumentHash: string | null = null
        let auditPdfBytes: Uint8Array | null = null
        if (signedPdfBytes) {
          const { createHash } = await import("crypto")
          signedDocumentHash = createHash("sha256").update(signedPdfBytes).digest("hex")
          auditPdfBytes = await generateAuditPdf({
            documentName,
            documentHash: completedDoc.documentHash,
            signedDocumentHash,
            ownerEmail,
            ownerName,
            signers: completedDoc.signers,
            auditEvents,
            completedAt: now,
          })
        }

        // Persist audit PDF to permanent storage so it can be viewed on the document detail page
        if (auditPdfBytes) {
          try {
            const { supabaseAdmin, STORAGE_BUCKET } = await import("@/lib/supabase")
            const auditPath = `${completedDoc.user.email.replace(/[^a-z0-9]/gi, "_")}/audit-${signer.documentId}.pdf`
            await supabaseAdmin.storage
              .from(STORAGE_BUCKET)
              .upload(auditPath, Buffer.from(auditPdfBytes), { contentType: "application/pdf", upsert: true })
            await prisma.document.update({
              where: { id: signer.documentId },
              data: { auditStoragePath: auditPath },
            })
          } catch (err) {
            console.error("[submitSignature] audit PDF permanent upload failed:", err)
          }
        }

        // Upload to temp storage (avoids Inngest 256KB limit)
        let completedSignedPath: string | undefined
        let completedAuditPath: string | undefined
        if (signedPdfBytes) {
          completedSignedPath = await uploadTempPdf(signedPdfBytes, "completed-signed")
        }
        if (auditPdfBytes) {
          completedAuditPath = await uploadTempPdf(auditPdfBytes, "completed-audit")
        }

        // Notify owner — all signed
        await inngest.send({
          name: "email/completed-notification",
          data: {
            userAccessToken: userAccessToken ?? "",
            ownerEmail,
            ownerName,
            documentName,
            documentUrl,
            totalSigners: allRequiredSigners.length,
            completedAt: now,
            signedPdfPath: completedSignedPath,
            auditPdfPath: completedAuditPath,
          },
        })

        // Send final copy to every signer
        // Each event must have its own temp path — resolvePdfPaths deletes the file after
        // downloading, so sharing a path across events means only the first event gets the PDF.
        const signedSigners = completedDoc.signers.filter((s) => s.status === "SIGNED")
        for (const s of signedSigners) {
          let signerSignedPath: string | undefined
          let signerAuditPath: string | undefined
          try {
            if (signedPdfBytes) signerSignedPath = await uploadTempPdf(signedPdfBytes, "signer-copy-signed")
            if (auditPdfBytes) signerAuditPath = await uploadTempPdf(auditPdfBytes, "signer-copy-audit")
          } catch (err) {
            console.error("[submitSignature] signer-copy upload failed:", err)
          }
          await inngest.send({
            name: "email/signer-copy",
            data: {
              userAccessToken: userAccessToken ?? "",
              ownerEmail,
              ownerName,
              signerName: s.name,
              signerEmail: s.email,
              documentName,
              signedAt: now,
              signedPdfPath: signerSignedPath,
              auditPdfPath: signerAuditPath,
            },
          })
        }
      }
    } catch (err) {
      console.error("[submitSignature] Completed notification failed:", err)
    }
  } else if (!triggeredNextGroup) {
    // Document still in progress and no new group was just unlocked —
    // notify owner this signer is done. (If a next group was just triggered,
    // that group's invite email already signals progress; an extra interim
    // notification here would be confusing.)
    // Upload interim signed PDF for owner notification only (no audit PDF at interim stage)
    let ownerSignedPath: string | undefined
    if (signedPdfBytes) {
      try {
        ownerSignedPath = await uploadTempPdf(signedPdfBytes, "signed-interim-owner")
      } catch (err) {
        console.error("[submitSignature] Interim signed PDF upload failed:", err)
      }
    }

    // Notify owner that this signer completed
    await inngest.send({
      name: "email/signed-notification",
      data: {
        userAccessToken: userAccessToken ?? "",
        ownerEmail,
        ownerName,
        signerName: signer.name,
        signerEmail: signer.email,
        documentName,
        documentUrl,
        signedAt: now,
        signedPdfPath: ownerSignedPath,
        // auditPdfPath intentionally omitted — audit PDF only sent on completion
      },
    })
    // Signer copy intentionally omitted here — signers receive their copy only
    // when the document is fully completed (avoids duplicate/confusing emails)
  }

  return { ok: true, data: undefined }
}

// ---------------------------------------------------------------------------
// declineSignature
// ---------------------------------------------------------------------------

const DeclineSchema = z.object({
  signerId: z.string().cuid(),
  reason: z.string().min(1).max(500).trim(),
})

export async function declineSignature(input: {
  signerId: string
  reason: string
}): Promise<ActionResult> {
  const validated = DeclineSchema.safeParse(input)
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0]?.message ?? "Invalid input" }
  }

  const { signerId, reason } = validated.data
  const { ip, userAgent } = await getRequestMeta()

  const signer = await prisma.signer.findUnique({
    where: { id: signerId },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      documentId: true,
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

  if (!signer) return { ok: false, error: "Signer not found" }
  if (signer.status === "SIGNED") return { ok: false, error: "Already signed" }
  if (signer.status === "DECLINED") return { ok: false, error: "Already declined" }
  if (signer.status === "WAITING") return { ok: false, error: "It is not your turn to sign yet" }

  // Optimistic lock: only update if status hasn't changed
  const updated = await prisma.signer.updateMany({
    where: { id: signerId, status: { in: ["PENDING", "OPENED"] } },
    data: { status: "DECLINED", declineReason: reason },
  })
  if (updated.count === 0) {
    return { ok: false, error: "Signer status has changed — please refresh" }
  }

  await createAuditEvent({
    documentId: signer.documentId,
    type: "SIGNER_DECLINED",
    actorEmail: signer.email,
    actorName: signer.name,
    meta: {
      reason,
      signerEmail: signer.email,
      signerName: signer.name,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    },
  })

  const declineToken = await getOwnerAccessToken(signer.document.uploadedBy)
  if (declineToken) {
    await inngest.send({
      name: "email/decline-notification",
      data: {
        userAccessToken: declineToken,
        ownerEmail: signer.document.user.email,
        ownerName: signer.document.user.name ?? signer.document.user.email,
        signerName: signer.name,
        signerEmail: signer.email,
        documentName: signer.document.name,
        documentUrl: `${APP_URL}/dashboard/documents/${signer.documentId}`,
        declineReason: reason,
      },
    })
  }

  return { ok: true, data: undefined }
}

// ---------------------------------------------------------------------------
// openedSignature
// ---------------------------------------------------------------------------

export async function openedSignature(
  signerId: string,
  opts?: { ip?: string; userAgent?: string }
): Promise<void> {
  const signer = await prisma.signer.findUnique({
    where: { id: signerId },
    select: { id: true, status: true, email: true, name: true, documentId: true },
  })
  if (!signer || signer.status !== "PENDING") return

  await prisma.signer.update({
    where: { id: signerId },
    data: { status: "OPENED" },
  })

  await createAuditEvent({
    documentId: signer.documentId,
    type: "SIGNER_OPENED",
    actorEmail: signer.email,
    actorName: signer.name,
    meta: {
      signerEmail: signer.email,
      signerName: signer.name,
      ip: opts?.ip ?? null,
      userAgent: opts?.userAgent ?? null,
    },
  })
}
