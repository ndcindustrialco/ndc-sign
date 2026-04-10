import Link from "next/link"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import DocumentList from "@/components/document-list"
import { listDocuments } from "@/lib/actions/document"

interface PageProps {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session) redirect("/login")

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1)
  const status = params.status || undefined
  const search = params.search || undefined

  const result = await listDocuments({ page, pageSize: 20, status, search })

  return (
    <>

      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Page heading */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--foreground, #212529)" }}>
              เอกสาร Documents
            </h1>
            <p className="mt-0.5 text-sm" style={{ color: "var(--accent, #ADB5BD)" }}>
              {session.user?.name ?? session.user?.email}
            </p>
          </div>
          <Link
            href="/dashboard/upload"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--primary, #0F1059)" }}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            อัปโหลด Upload
          </Link>
        </div>

        {/* Error banner */}
        {!result.ok && (
          <div
            className="mb-4 rounded-lg px-4 py-3 text-sm"
            style={{
              border: "1px solid #FECACA",
              background: "#FEF2F2",
              color: "var(--danger, #DC3545)",
            }}
          >
            โหลดเอกสารไม่ได้ Failed to load: {result.error}
          </div>
        )}

        <DocumentList
          initialDocuments={result.ok ? result.data.items : []}
          totalPages={result.ok ? result.data.totalPages : 1}
          currentPage={page}
          currentStatus={status}
          currentSearch={search}
        />
      </div>
    </>
  )
}
