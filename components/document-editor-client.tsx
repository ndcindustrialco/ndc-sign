"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import PdfViewer from "@/components/pdf-viewer"
import SendDrawer from "@/components/send-drawer"
import type { FieldItem } from "@/lib/actions/field"
import type { SentSigner } from "@/lib/actions/send-document"
import { selfSign } from "@/lib/actions/self-sign"
import { SIGNER_COLORS } from "@/components/pdf-viewer/field-panel"

export type EditorSigner = {
 id: string
 name: string
 isSelf?: boolean
}

const PARTY_LABELS = [
 "ฝ่ายที่ 1 First Party",
 "ฝ่ายที่ 2 Second Party",
 "ฝ่ายที่ 3 Third Party",
 "ฝ่ายที่ 4 Fourth Party",
 "ฝ่ายที่ 5 Fifth Party",
 "ฝ่ายที่ 6 Sixth Party",
]

const SELF_SIGNER_ID = "self"

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
 const [selfSignMode, setSelfSignMode] = useState(false)
 const [selfSignError, setSelfSignError] = useState<string | null>(null)
 const [isSelfSigning, startSelfSign] = useTransition()

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
 setSigners(sentSigners.map((s) => ({ id: s.id, name: s.name })))
 router.push(`/dashboard/documents/${documentId}`)
 }

 function handleEnterSelfSignMode() {
 setSelfSignMode(true)
 setSelfSignError(null)
 setSigners([{ id: SELF_SIGNER_ID, name: "ตัวเอง Myself", isSelf: true }])
 }

 function handleExitSelfSignMode() {
 setSelfSignMode(false)
 setSelfSignError(null)
 setSigners([{ id: `placeholder-${Date.now()}`, name: "ฝ่ายที่ 1 First Party" }])
 }

 function handleConfirmSelfSign() {
 setSelfSignError(null)
 startSelfSign(async () => {
 const result = await selfSign(documentId)
 if (!result.ok) {
 setSelfSignError(result.error)
 return
 }
 router.push(result.data.signingUrl)
 })
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
 {selfSignMode ? (
 <button
 onClick={handleExitSelfSignMode}
 className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors hover:bg-slate-100"
 style={{ color: "var(--accent, #ADB5BD)" }}
 >
 <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
 </svg>
 <span className="hidden sm:inline">ยกเลิก Cancel</span>
 </button>
 ) : (
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
 )}

 <div className="h-4 w-px shrink-0" style={{ background: "var(--border, #E5E7EB)" }} />

 <span className="min-w-0 flex-1 truncate text-sm font-medium" style={{ color: "var(--foreground, #212529)" }}>
 {selfSignMode ? (
 <span className="flex items-center gap-1.5">
 <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
 <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
 </svg>
 </span>
 <span className="text-emerald-700 font-semibold text-xs sm:text-sm">ลงนามด้วยตนเอง Self-Sign Mode</span>
 </span>
 ) : documentName}
 </span>

 {selfSignMode ? (
 <div className="flex items-center gap-2 shrink-0">
 {selfSignError && (
 <span className="hidden sm:inline text-xs text-red-500">{selfSignError}</span>
 )}
 <button
 onClick={handleConfirmSelfSign}
 disabled={isSelfSigning}
 className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 sm:px-4 sm:text-sm"
 style={{ background: "var(--success, #198754)" }}
 >
 {isSelfSigning ? "กำลังเตรียม…" : (
 <>
 <span className="sm:hidden">เซ็น Sign</span>
 <span className="hidden sm:inline">เซ็นเอกสาร Proceed to Sign</span>
 </>
 )}
 </button>
 </div>
 ) : (
 <div className="flex items-center gap-2 shrink-0">
 <button
 onClick={handleEnterSelfSignMode}
 className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-zinc-100 sm:px-4 sm:text-sm"
 style={{ color: "var(--primary, #0F1059)", border: "1px solid var(--border, #E5E7EB)" }}
 >
 <span className="sm:hidden">ลงนาม</span>
 <span className="hidden sm:inline">ลงนามด้วยตนเอง Sign Myself</span>
 </button>
 <button
 onClick={() => setDrawerOpen(true)}
 className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 sm:px-4 sm:text-sm"
 style={{ background: "var(--primary, #0F1059)" }}
 >
 <span className="sm:hidden">ส่ง Send</span>
 <span className="hidden sm:inline">ส่งลงนาม Send for Signing</span>
 </button>
 </div>
 )}
 </header>

 {/* Self-sign error (mobile fallback) */}
 {selfSignMode && selfSignError && (
 <div className="sm:hidden shrink-0 bg-red-50 px-4 py-2 text-xs text-red-600">
 {selfSignError}
 </div>
 )}

 {/* Editor body */}
 <div className="flex-1 overflow-hidden">
 <PdfViewer
 documentId={documentId}
 url={url}
 initialFields={initialFields}
 signers={signers}
 onAddSigner={handleAddSigner}
 onRemoveSigner={handleRemoveSigner}
 selfSignMode={selfSignMode}
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
