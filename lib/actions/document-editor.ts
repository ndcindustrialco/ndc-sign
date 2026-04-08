"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { supabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase"
import type { ActionResult } from "./document"
import type { FieldItem } from "./field"

export type DocumentEditorData = {
  id: string
  name: string
  status: string
  signedUrl: string
  fields: FieldItem[]
  signedStoragePath: string | null
  signedAt: Date | null
  documentHash: string | null
}

export async function getDocumentEditorData(
  documentId: string
): Promise<ActionResult<DocumentEditorData>> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      name: true,
      status: true,
      storagePath: true,
      uploadedBy: true,
      signedStoragePath: true,
      signedAt: true,
      documentHash: true,
      fields: {
        select: {
          id: true,
          signerId: true,
          type: true,
          page: true,
          x: true,
          y: true,
          width: true,
          height: true,
          label: true,
          required: true,
          options: true,
          groupId: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!document || document.uploadedBy !== session.user.id) {
    return { ok: false, error: "Not found" }
  }

  const { data: urlData, error: urlError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(document.storagePath, 60 * 60)

  if (urlError || !urlData?.signedUrl) {
    return { ok: false, error: "Could not generate file URL" }
  }

  return {
    ok: true,
    data: {
      id: document.id,
      name: document.name,
      status: document.status,
      signedUrl: urlData.signedUrl,
      fields: document.fields,
      signedStoragePath: document.signedStoragePath,
      signedAt: document.signedAt,
      documentHash: document.documentHash,
    },
  }
}

// ---------------------------------------------------------------------------
// getSignedPdfDownloadUrl — owner downloads the signed PDF
// ---------------------------------------------------------------------------

export async function getSignedPdfDownloadUrl(
  documentId: string
): Promise<ActionResult<{ url: string }>> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { uploadedBy: true, signedStoragePath: true },
  })

  if (!document || document.uploadedBy !== session.user.id) {
    return { ok: false, error: "Not found" }
  }

  if (!document.signedStoragePath) {
    return { ok: false, error: "Signed PDF is not ready yet" }
  }

  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(document.signedStoragePath, 60 * 5, {
      download: true,
    })

  if (error || !data?.signedUrl) {
    return { ok: false, error: "Could not generate download URL" }
  }

  return { ok: true, data: { url: data.signedUrl } }
}
