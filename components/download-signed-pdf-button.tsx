"use client"

import { useState, useTransition } from "react"
import { getSignedPdfDownloadUrl } from "@/lib/actions/document-editor"

interface Props {
 documentId: string
 signedAt: Date
 documentHash: string | null
}

export default function DownloadSignedPdfButton({ documentId, signedAt, documentHash }: Props) {
 const [isPending, startTransition] = useTransition()
 const [error, setError] = useState<string | null>(null)

 function handleDownload() {
 setError(null)
 startTransition(async () => {
 const result = await getSignedPdfDownloadUrl(documentId)
 if (!result.ok) {
 setError(result.error)
 return
 }
 window.open(result.data.url, "_blank")
 })
 }

 return (
 <div className="rounded-xl border border-green-200 bg-green-50 p-4">
 <div className="flex items-center justify-between gap-4">
 <div>
 <p className="text-sm font-semibold text-green-800">
 Signed PDF ready
 </p>
 <p className="mt-0.5 text-xs text-green-600">
 Signed on {new Intl.DateTimeFormat("en-GB", {
 day: "2-digit", month: "short", year: "numeric",
 hour: "2-digit", minute: "2-digit",
 }).format(new Date(signedAt))}
 </p>
 {documentHash && (
 <p className="mt-1 font-mono text-[10px] text-green-600">
 SHA-256: {documentHash.slice(0, 16)}…
 </p>
 )}
 </div>
 <button
 onClick={handleDownload}
 disabled={isPending}
 className="flex shrink-0 items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-800 disabled:opacity-50"
 >
 <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
 </svg>
 {isPending ? "Preparing…" : "Download"}
 </button>
 </div>
 {error && (
 <p className="mt-3 rounded-lg bg-red-100 px-3 py-2 text-xs text-red-700">
 {error}
 </p>
 )}
 </div>
 )
}
