"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { supabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase"
import { createAuditEvent } from "./audit"
import { inngest } from "@/lib/inngest/client"
import { getOwnerAccessToken } from "@/lib/email/get-owner-token"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALLOWED_MIME_TYPES = ["application/pdf"] as const
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const UploadSchema = z.object({
  name: z.string().min(1).max(255),
  mimeType: z.enum(ALLOWED_MIME_TYPES, {
    error: "Only PDF files are allowed",
  }),
  size: z.number().int().positive().max(MAX_FILE_SIZE_BYTES, {
    error: "File must be smaller than 10 MB",
  }),
})

const FinalizeSchema = z.object({
  storagePath: z.string().min(1).max(512),
  name: z.string().min(1).max(255),
  mimeType: z.enum(ALLOWED_MIME_TYPES, {
    error: "Only PDF files are allowed",
  }),
  size: z.number().int().positive().max(MAX_FILE_SIZE_BYTES, {
    error: "File must be smaller than 10 MB",
  }),
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

// ---------------------------------------------------------------------------
// createDocumentUploadUrl
//
// Step 1 of 2 for the direct-to-Supabase upload flow.
// Vercel caps function request bodies at 4.5 MB, so the browser uploads the
// PDF straight to Supabase Storage using the signed URL returned here; the
// file bytes never pass through a Server Action.
// ---------------------------------------------------------------------------

export async function createDocumentUploadUrl(input: {
  name: string
  mimeType: string
  size: number
}): Promise<ActionResult<{ storagePath: string; token: string }>> {
  const session = await auth()
  if (!session?.user?.id) {
    return { ok: false, error: "Unauthorized" }
  }

  const validated = UploadSchema.safeParse(input)
  if (!validated.success) {
    const message = validated.error.issues[0]?.message ?? "Invalid file"
    return { ok: false, error: message }
  }

  const { name } = validated.data
  const ext = name.split(".").pop() ?? "pdf"
  const storagePath = `${session.user.id}/${Date.now()}.${ext}`

  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(storagePath)

  if (error || !data) {
    return { ok: false, error: "Could not prepare upload. Please try again." }
  }

  return { ok: true, data: { storagePath: data.path, token: data.token } }
}

// ---------------------------------------------------------------------------
// finalizeDocumentUpload
//
// Step 2 of 2. Called after the browser has PUT the file to Supabase. We
// re-validate metadata, verify the object actually exists under the caller's
// prefix, then persist the Document row + audit event.
// ---------------------------------------------------------------------------

export async function finalizeDocumentUpload(input: {
  storagePath: string
  name: string
  mimeType: string
  size: number
}): Promise<ActionResult<{ id: string }>> {
  const session = await auth()
  if (!session?.user?.id) {
    return { ok: false, error: "Unauthorized" }
  }

  const validated = FinalizeSchema.safeParse(input)
  if (!validated.success) {
    const message = validated.error.issues[0]?.message ?? "Invalid input"
    return { ok: false, error: message }
  }

  const { storagePath, name, mimeType, size } = validated.data

  // Storage paths are namespaced by user id — prevents a caller from
  // finalizing a path that belongs to someone else.
  if (!storagePath.startsWith(`${session.user.id}/`)) {
    return { ok: false, error: "Invalid storage path" }
  }

  // Confirm the object really landed in the bucket before creating the row.
  const prefix = storagePath.slice(0, storagePath.lastIndexOf("/"))
  const filename = storagePath.slice(storagePath.lastIndexOf("/") + 1)
  const { data: listed, error: listError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .list(prefix, { search: filename, limit: 1 })

  if (listError || !listed || listed.length === 0) {
    return { ok: false, error: "Upload not found. Please try again." }
  }

  const document = await prisma.document.create({
    data: {
      name,
      storagePath,
      mimeType,
      size,
      uploadedBy: session.user.id,
      status: "DRAFT",
    },
    select: { id: true },
  })

  await createAuditEvent({
    documentId: document.id,
    type: "DOCUMENT_CREATED",
    actorEmail: session.user.email ?? undefined,
    actorName: session.user.name ?? undefined,
  })

  revalidatePath("/dashboard")

  return { ok: true, data: { id: document.id } }
}

// ---------------------------------------------------------------------------
// deleteDocument
// ---------------------------------------------------------------------------

export async function deleteDocument(
  documentId: string
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  if (!z.cuid().safeParse(documentId).success) {
    return { ok: false, error: "Invalid id" }
  }

  const doc = await prisma.document.findUnique({
    where: { id: documentId, uploadedBy: session.user.id },
    select: { storagePath: true, signedStoragePath: true },
  })
  if (!doc) return { ok: false, error: "Not found" }

  // Delete from storage (best-effort — don't fail if missing)
  const paths = [doc.storagePath, doc.signedStoragePath].filter(Boolean) as string[]
  if (paths.length > 0) {
    await supabaseAdmin.storage.from(STORAGE_BUCKET).remove(paths)
  }

  // Cascade deletes signers, tokens, fields, submissions via DB relations
  await prisma.document.delete({ where: { id: documentId } })

  revalidatePath("/dashboard")
  return { ok: true, data: undefined }
}

// ---------------------------------------------------------------------------
// voidDocument
// ---------------------------------------------------------------------------

const VoidSchema = z.object({
  documentId: z.cuid(),
  reason: z.string().min(1).max(500).trim(),
})

export async function voidDocument(
  documentId: string,
  reason: string
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  const validated = VoidSchema.safeParse({ documentId, reason })
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0]?.message ?? "Invalid input" }
  }

  const doc = await prisma.document.findUnique({
    where: { id: documentId, uploadedBy: session.user.id },
    select: {
      id: true,
      name: true,
      status: true,
      user: { select: { name: true, email: true } },
      signers: { select: { id: true, name: true, email: true, status: true } },
    },
  })
  if (!doc) return { ok: false, error: "Document not found" }
  if (doc.status === "COMPLETED") {
    return { ok: false, error: "Cannot void a completed document" }
  }
  if (doc.status === "VOIDED") {
    return { ok: false, error: "Document is already voided" }
  }

  await prisma.document.update({
    where: { id: documentId },
    data: { status: "VOIDED", voidedAt: new Date(), voidReason: reason },
  })

  await createAuditEvent({
    documentId,
    type: "DOCUMENT_VOIDED",
    actorEmail: session.user.email ?? undefined,
    actorName: session.user.name ?? undefined,
    meta: { reason },
  })

  // Notify affected signers
  const affectedSigners = doc.signers.filter(
    (s) => s.status === "PENDING" || s.status === "WAITING" || s.status === "OPENED"
  )
  if (affectedSigners.length > 0) {
    const userAccessToken = await getOwnerAccessToken(session.user.id)
    if (userAccessToken) {
      for (const signer of affectedSigners) {
        await inngest.send({
          name: "email/void-notification",
          data: {
            userAccessToken,
            ownerEmail: doc.user.email,
            ownerName: doc.user.name ?? doc.user.email,
            signerName: signer.name,
            signerEmail: signer.email,
            documentName: doc.name,
            voidReason: reason,
          },
        })
      }
    }
  }

  revalidatePath(`/dashboard/documents/${documentId}`)
  revalidatePath("/dashboard")
  return { ok: true, data: undefined }
}

// ---------------------------------------------------------------------------
// getDocument
// ---------------------------------------------------------------------------

export type DocumentDetail = {
  id: string
  name: string
  status: string
  storagePath: string
  signedStoragePath: string | null
  createdAt: Date
  updatedAt: Date
  voidedAt: Date | null
  voidReason: string | null
  user: { name: string | null; email: string }
  signers: {
    id: string
    name: string
    email: string
    signingOrder: number
    order: number
    status: string
    declineReason: string | null
    isStub: boolean
    createdAt: Date
  }[]
}

export async function getDocument(
  documentId: string
): Promise<ActionResult<DocumentDetail>> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  if (!z.cuid().safeParse(documentId).success) {
    return { ok: false, error: "Invalid id" }
  }

  const doc = await prisma.document.findUnique({
    where: { id: documentId, uploadedBy: session.user.id },
    select: {
      id: true,
      name: true,
      status: true,
      storagePath: true,
      signedStoragePath: true,
      createdAt: true,
      updatedAt: true,
      voidedAt: true,
      voidReason: true,
      user: { select: { name: true, email: true } },
      signers: {
        orderBy: [{ signingOrder: "asc" }, { order: "asc" }],
        select: {
          id: true,
          name: true,
          email: true,
          signingOrder: true,
          order: true,
          status: true,
          declineReason: true,
          isStub: true,
          createdAt: true,
        },
      },
    },
  })
  if (!doc) return { ok: false, error: "Document not found" }

  return { ok: true, data: doc }
}

// ---------------------------------------------------------------------------
// listDocuments
// ---------------------------------------------------------------------------

export type DocumentItem = {
  id: string
  name: string
  size: number
  status: string
  createdAt: Date
  signedCount: number
  totalSigners: number
}

export type PaginatedDocuments = {
  items: DocumentItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const ListSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  status: z.enum(["DRAFT", "PENDING", "COMPLETED", "VOIDED"]).optional(),
  search: z.string().max(255).optional(),
})

export async function listDocuments(
  input?: { page?: number; pageSize?: number; status?: string; search?: string }
): Promise<ActionResult<PaginatedDocuments>> {
  const session = await auth()
  if (!session?.user?.id) {
    return { ok: false, error: "Unauthorized" }
  }

  const params = ListSchema.safeParse(input ?? {})
  if (!params.success) {
    return { ok: false, error: params.error.issues[0]?.message ?? "Invalid input" }
  }

  const { page, pageSize, status, search } = params.data

  const where: Record<string, unknown> = { uploadedBy: session.user.id }
  if (status) where.status = status
  if (search) where.name = { contains: search, mode: "insensitive" }

  const [total, documents] = await Promise.all([
    prisma.document.count({ where }),
    prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        size: true,
        status: true,
        createdAt: true,
        signers: { select: { status: true } },
      },
    }),
  ])

  return {
    ok: true,
    data: {
      items: documents.map((doc) => ({
        id: doc.id,
        name: doc.name,
        size: doc.size,
        status: doc.status,
        createdAt: doc.createdAt,
        signedCount: doc.signers.filter((s) => s.status === "SIGNED").length,
        totalSigners: doc.signers.length,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}
