"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import PdfViewer from "@/components/pdf-viewer"
import SendDrawer from "@/components/send-drawer"
import type { FieldItem } from "@/lib/actions/field"
import type { SentSigner } from "@/lib/actions/send-document"
import { SIGNER_COLORS } from "@/components/pdf-viewer/field-panel"

export type EditorSigner = {
 id: string
 name: string
}

const PARTY_LABELS = [
 "ฝ่ายที่ 1 First Party",
 "ฝ่ายที่ 2 Second Party",
 "ฝ่ายที่ 3 Third Party",
 "ฝ่ายที่ 4 Fourth Party",
 "ฝ่ายที่ 5 Fifth Party",
 "ฝ่ายที่ 6 Sixth Party",
]

interface Props {
 documentId: string
 documentName: string
 url: string
 initialFields: FieldItem[]
}

export default function DocumentEditorClient({
 documentId,
 documentName,
 url,
 initialFields,
}: Props) {
 const router = useRouter()
 const [signers, setSigners] = useState<EditorSigner[]>([
 { id: `placeholder-${Date.now()}`, name: "ฝ่ายที่ 1 First Party" },
 ])
 const [drawerOpen, setDrawerOpen] = useState(false)

 function handleAddSigner() {
 if (signers.length >= SIGNER_COLORS.length) return
 const idx = signers.length
 setSigners((prev) => [
 ...prev,
 { id: `placeholder-${Date.now()}`, name: PARTY_LABELS[idx] ?? `Party ${idx + 1}` },
 ])
 }

 function handleRemoveSigner(id: string) {
 setSigners((prev) => prev.filter((s) => s.id !== id))
 }

 function handleSent(sentSigners: SentSigner[]) {
 setDrawerOpen(false)
 // Update local signer state with real DB signers
 setSigners(
 sentSigners.map((s) => ({ id: s.id, name: s.name }))
 )
 router.push(`/dashboard/documents/${documentId}`)
 }

 // Pass ALL signers to the drawer — one locked row per party regardless of placeholder status
 const drawerInitialSigners = signers.map((s) => ({
 id: s.id,
 name: s.name,
 email: "",
 }))

 return (
 <div className="flex h-full flex-col overflow-hidden">
 {/* Toolbar */}
 <header
 className="flex h-14 shrink-0 items-center gap-2 border-b bg-white px-3 sm:gap-3 sm:px-4"
 style={{ borderColor: "var(--border, #E5E7EB)" }}
 >
 <Link
 href={`/dashboard/documents/${documentId}`}
 className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors hover:bg-slate-100"
 style={{ color: "var(--accent, #ADB5BD)" }}
 >
 <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
 </svg>
 <span className="hidden sm:inline">กลับ Back</span>
 </Link>

 <div className="h-4 w-px shrink-0" style={{ background: "var(--border, #E5E7EB)" }} />

 <span className="min-w-0 flex-1 truncate text-sm font-medium" style={{ color: "var(--foreground, #212529)" }}>
 {documentName}
 </span>

 <button
 onClick={() => setDrawerOpen(true)}
 className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 sm:px-4 sm:text-sm"
 style={{ background: "var(--primary, #0F1059)" }}
 >
 <span className="sm:hidden">ส่ง Send</span>
 <span className="hidden sm:inline">ส่งลงนาม Send for Signing</span>
 </button>
 </header>

 {/* Editor body */}
 <div className="flex-1 overflow-hidden">
 <PdfViewer
 documentId={documentId}
 url={url}
 initialFields={initialFields}
 signers={signers}
 onAddSigner={handleAddSigner}
 onRemoveSigner={handleRemoveSigner}
 />
 </div>

 {/* Send drawer */}
 <SendDrawer
 documentId={documentId}
 documentName={documentName}
 initialSigners={drawerInitialSigners}
 open={drawerOpen}
 onClose={() => setDrawerOpen(false)}
 onSent={handleSent}
 />
 </div>
 )
}
