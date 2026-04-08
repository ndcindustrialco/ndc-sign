import { redirect, notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import DocumentDetailClient from "@/components/document-detail-client"
import { getDocument } from "@/lib/actions/document"
import { getAuditEvents } from "@/lib/actions/audit"
import { supabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase"

interface Props {
  params: Promise<{ id: string }>
}

export default async function DocumentDetailPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect("/login")

  const { id } = await params

  const [docResult, auditEvents] = await Promise.all([
    getDocument(id),
    getAuditEvents(id),
  ])

  if (!docResult.ok) notFound()
  const doc = docResult.data

  // Generate a short-lived signed URL for the original PDF
  const { data: signedUrlData } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(doc.storagePath, 60 * 60) // 1 hour

  const pdfUrl = signedUrlData?.signedUrl ?? null

  // Generate signed URL for signed PDF if it exists
  let signedPdfUrl: string | null = null
  if (doc.signedStoragePath) {
    const { data: signedData } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(doc.signedStoragePath, 60 * 60)
    signedPdfUrl = signedData?.signedUrl ?? null
  }

  return (
    <>
      <DocumentDetailClient
        doc={doc}
        auditEvents={auditEvents}
        pdfUrl={pdfUrl}
        signedPdfUrl={signedPdfUrl}
      />
    </>
  )
}
