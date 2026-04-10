import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import DocumentUploadForm from "@/components/document-upload-form"

export default async function UploadPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <>
      <div className="mx-auto w-full max-w-xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground, #212529)" }}>
            อัปโหลดเอกสาร Upload Document
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--accent, #ADB5BD)" }}>
            PDF เท่านั้น · ไม่เกิน 10 MB
          </p>
        </div>

        <DocumentUploadForm />
      </div>
    </>
  )
}
