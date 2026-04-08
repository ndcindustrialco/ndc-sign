import { redirect, notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { getDocumentEditorData } from "@/lib/actions/document-editor"
import DocumentEditorClient from "@/components/document-editor-client"

interface Props {
  params: Promise<{ id: string }>
}

export default async function DocumentEditorPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect("/login")

  const { id } = await params

  const result = await getDocumentEditorData(id)
  if (!result.ok) notFound()

  const doc = result.data

  // Only DRAFT documents can be edited
  if (doc.status !== "DRAFT") {
    redirect(`/dashboard/documents/${id}`)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <DocumentEditorClient
        documentId={doc.id}
        documentName={doc.name}
        url={doc.signedUrl}
        initialFields={doc.fields}
      />
    </div>
  )
}
