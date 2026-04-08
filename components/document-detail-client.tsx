"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { DocumentDetail } from "@/lib/actions/document"
import type { AuditMeta } from "@/lib/actions/audit"
import { voidDocument } from "@/lib/actions/document"

type AuditEvent = {
 id: string
 type: string
 actorEmail: string | null
 actorName: string | null
 meta: unknown
 createdAt: Date
}

interface Props {
 doc: DocumentDetail
 auditEvents: AuditEvent[]
 pdfUrl: string | null
 signedPdfUrl: string | null
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
 DRAFT: "bg-slate-100 text-slate-600",
 PENDING: "bg-amber-100 text-amber-700",
 COMPLETED: "bg-emerald-100 text-emerald-700",
 VOIDED: "bg-red-100 text-red-600",
}

const STATUS_LABELS: Record<string, string> = {
 DRAFT: "Draft",
 PENDING: "Pending",
 COMPLETED: "Completed",
 VOIDED: "Voided",
}

function StatusBadge({ status }: { status: string }) {
 return (
 <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT}`}>
 {STATUS_LABELS[status] ?? status}
 </span>
 )
}

// ---------------------------------------------------------------------------
// Signer status badge
// ---------------------------------------------------------------------------

const SIGNER_STATUS_STYLES: Record<string, string> = {
 PENDING: "bg-slate-100 text-slate-500",
 WAITING: "bg-slate-100 text-slate-400",
 OPENED: "bg-blue-100 text-blue-700",
 SIGNED: "bg-emerald-100 text-emerald-700",
 DECLINED: "bg-red-100 text-red-600",
}

function SignerStatusBadge({ status }: { status: string }) {
 return (
 <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SIGNER_STATUS_STYLES[status] ?? SIGNER_STATUS_STYLES.PENDING}`}>
 {status.charAt(0) + status.slice(1).toLowerCase()}
 </span>
 )
}

// ---------------------------------------------------------------------------
// Audit event label
// ---------------------------------------------------------------------------

const AUDIT_LABELS: Record<string, string> = {
 DOCUMENT_CREATED: "Document created",
 DOCUMENT_SENT: "Sent for signing",
 DOCUMENT_COMPLETED: "All signatures collected",
 DOCUMENT_VOIDED: "Document voided",
 SIGNER_INVITED: "Signer invited",
 SIGNER_OPENED: "Signer opened",
 SIGNER_SIGNED: "Signer signed",
 SIGNER_DECLINED: "Signer declined",
 SIGNER_REINVITED: "Signer re-invited",
}

const AUDIT_DOT_COLOR: Record<string, string> = {
 DOCUMENT_CREATED: "#ADB5BD",
 DOCUMENT_SENT: "#4C6EF5",
 DOCUMENT_COMPLETED: "#198754",
 DOCUMENT_VOIDED: "#DC3545",
 SIGNER_INVITED: "#74C0FC",
 SIGNER_OPENED: "#FFC107",
 SIGNER_SIGNED: "#2FBF71",
 SIGNER_DECLINED: "#FF6B6B",
 SIGNER_REINVITED: "#74C0FC",
}

function formatDate(date: Date): string {
 // No timeZone specified — uses the browser's local timezone on the client.
 // This component is "use client" so it always runs in the browser.
 return new Intl.DateTimeFormat("en-GB", {
 day: "2-digit",
 month: "short",
 year: "numeric",
 hour: "2-digit",
 minute: "2-digit",
 hour12: false,
 }).format(new Date(date))
}

// ---------------------------------------------------------------------------
// Void modal (≤2 fields → Modal)
// ---------------------------------------------------------------------------

function VoidModal({
 documentName,
 onCancel,
 onConfirm,
 pending,
}: {
 documentName: string
 onCancel: () => void
 onConfirm: (reason: string) => void
 pending: boolean
}) {
 const [reason, setReason] = useState("")
 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
 <div
 className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
 style={{ border: "1px solid var(--border, #E5E7EB)" }}
 >
 <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-100">
 <svg className="h-5 w-5" style={{ color: "var(--danger, #DC3545)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
 </svg>
 </div>
 <h2 className="mb-1 text-base font-semibold" style={{ color: "var(--foreground, #212529)" }}>
 Void document
 </h2>
 <p className="mb-4 text-sm" style={{ color: "var(--accent, #ADB5BD)" }}>
 This will cancel all pending signatures for <strong style={{ color: "var(--foreground, #212529)" }}>{documentName}</strong> and notify signers.
 </p>
 <label className="mb-1 block text-xs font-medium" style={{ color: "var(--foreground, #212529)" }}>
 Reason (required)
 </label>
 <textarea
 value={reason}
 onChange={(e) => setReason(e.target.value)}
 rows={3}
 className="w-full rounded-lg px-3 py-2 text-sm outline-none"
 style={{
 border: "1px solid var(--border, #E5E7EB)",
 color: "var(--foreground, #212529)",
 }}
 placeholder="e.g. Incorrect version uploaded"
 />
 <div className="mt-4 flex justify-end gap-2">
 <button
 onClick={onCancel}
 disabled={pending}
 className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-50"
 style={{
 border: "1px solid var(--border, #E5E7EB)",
 color: "var(--foreground, #212529)",
 }}
 >
 Cancel
 </button>
 <button
 onClick={() => reason.trim() && onConfirm(reason.trim())}
 disabled={pending || !reason.trim()}
 className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
 style={{ background: "var(--danger, #DC3545)" }}
 >
 {pending ? "Voiding…" : "Void document"}
 </button>
 </div>
 </div>
 </div>
 )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DocumentDetailClient({ doc, auditEvents, pdfUrl, signedPdfUrl }: Props) {
 const router = useRouter()
 const [showVoidModal, setShowVoidModal] = useState(false)
 const [isPending, startTransition] = useTransition()
 const [error, setError] = useState<string | null>(null)

 const canVoid = doc.status === "PENDING" || doc.status === "DRAFT"

 function handleVoidConfirm(reason: string) {
 startTransition(async () => {
 const result = await voidDocument(doc.id, reason)
 if (result.ok) {
 setShowVoidModal(false)
 router.refresh()
 } else {
 setError(result.error)
 setShowVoidModal(false)
 }
 })
 }

 const signedCount = doc.signers.filter((s) => s.status === "SIGNED").length
 const totalSigners = doc.signers.length

 return (
 <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
 {/* Error banner */}
 {error && (
 <div
 className="mb-4 flex items-center justify-between rounded-lg px-4 py-3 text-sm"
 style={{ border: "1px solid #FECACA", background: "#FEF2F2", color: "var(--danger, #DC3545)" }}
 >
 <span>{error}</span>
 <button onClick={() => setError(null)} className="ml-4 underline opacity-70 hover:opacity-100">
 Dismiss
 </button>
 </div>
 )}

 {/* Page header */}
 <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
 <div className="min-w-0">
 <div className="flex flex-wrap items-center gap-2">
 <h1 className="text-xl font-bold" style={{ color: "var(--foreground, #212529)" }}>
 {doc.name}
 </h1>
 <StatusBadge status={doc.status} />
 </div>
 <p className="mt-0.5 text-sm" style={{ color: "var(--accent, #ADB5BD)" }} suppressHydrationWarning>
 Created {formatDate(doc.createdAt)} · {totalSigners} signer{totalSigners !== 1 ? "s" : ""}
 </p>
 {doc.status === "VOIDED" && doc.voidReason && (
 <p className="mt-1 text-sm" style={{ color: "var(--danger, #DC3545)" }}>
 Voided: {doc.voidReason}
 </p>
 )}
 </div>
 <div className="flex flex-wrap items-center gap-2">
 {(signedPdfUrl ?? pdfUrl) && (
 <a
 href={(doc.status === "COMPLETED" && signedPdfUrl) ? signedPdfUrl : pdfUrl ?? ""}
 target="_blank"
 rel="noopener noreferrer"
 className="rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100"
 style={{ border: "1px solid var(--border, #E5E7EB)", color: "var(--foreground, #212529)" }}
 >
 View PDF
 </a>
 )}
 {signedPdfUrl && doc.status === "COMPLETED" && (
 <a
 href={signedPdfUrl}
 download
 className="rounded-lg px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
 style={{ background: "var(--success, #198754)" }}
 >
 Download Signed PDF
 </a>
 )}
 {doc.status === "DRAFT" && (
 <Link
 href={`/dashboard/documents/${doc.id}/edit`}
 className="rounded-lg px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
 style={{ background: "var(--primary, #0F1059)" }}
 >
 Edit Fields
 </Link>
 )}
 {canVoid && (
 <button
 onClick={() => setShowVoidModal(true)}
 className="rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-red-50"
 style={{ border: "1px solid #FECACA", color: "var(--danger, #DC3545)" }}
 >
 Void
 </button>
 )}
 </div>
 </div>

 <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
 {/* Left: Signers + Audit — 2/3 */}
 <div className="space-y-4 lg:col-span-2">
 {/* Recipients table */}
 <div
 className="overflow-hidden rounded-xl bg-white"
 style={{ border: "1px solid var(--border, #E5E7EB)" }}
 >
 <div
 className="flex items-center justify-between px-4 py-3"
 style={{ borderBottom: "1px solid var(--border, #E5E7EB)" }}
 >
 <h2 className="text-sm font-semibold" style={{ color: "var(--foreground, #212529)" }}>
 Recipients
 </h2>
 {totalSigners > 0 && (
 <span className="text-xs" style={{ color: "var(--accent, #ADB5BD)" }}>
 {signedCount}/{totalSigners} signed
 </span>
 )}
 </div>
 {doc.signers.length === 0 ? (
 <div className="px-4 py-10 text-center text-sm" style={{ color: "var(--accent, #ADB5BD)" }}>
 No recipients yet
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full min-w-120">
 <thead>
 <tr style={{ borderBottom: "1px solid var(--border, #E5E7EB)", background: "var(--secondary, #F1F3F5)" }}>
 <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent, #ADB5BD)" }}>Name</th>
 <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent, #ADB5BD)" }}>Email</th>
 <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent, #ADB5BD)" }}>Order</th>
 <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent, #ADB5BD)" }}>Status</th>
 </tr>
 </thead>
 <tbody>
 {doc.signers.map((signer) => (
 <tr key={signer.id} style={{ borderBottom: "1px solid var(--border, #E5E7EB)" }}>
 <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--foreground, #212529)" }}>{signer.name}</td>
 <td className="px-4 py-3 text-sm" style={{ color: "var(--accent, #ADB5BD)" }}>{signer.email}</td>
 <td className="px-4 py-3 text-sm" style={{ color: "var(--accent, #ADB5BD)" }}>{signer.signingOrder}</td>
 <td className="px-4 py-3">
 <div>
 <SignerStatusBadge status={signer.status} />
 {signer.status === "DECLINED" && signer.declineReason && (
 <p className="mt-0.5 text-xs" style={{ color: "var(--danger, #DC3545)" }}>{signer.declineReason}</p>
 )}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {/* Audit trail */}
 <div
 className="overflow-hidden rounded-xl bg-white"
 style={{ border: "1px solid var(--border, #E5E7EB)" }}
 >
 <div
 className="px-4 py-3"
 style={{ borderBottom: "1px solid var(--border, #E5E7EB)" }}
 >
 <h2 className="text-sm font-semibold" style={{ color: "var(--foreground, #212529)" }}>
 Audit trail
 </h2>
 </div>
 {auditEvents.length === 0 ? (
 <div className="px-4 py-10 text-center text-sm" style={{ color: "var(--accent, #ADB5BD)" }}>
 No events yet
 </div>
 ) : (
 <div className="px-4 py-4">
 <ol className="relative ml-2 border-l" style={{ borderColor: "var(--border, #E5E7EB)" }}>
 {auditEvents.map((event) => {
 const meta = event.meta as AuditMeta | null
 const signerEmail = meta?.signerEmail as string | undefined
 const reason = meta?.reason as string | undefined
 const dotColor = AUDIT_DOT_COLOR[event.type] ?? "#ADB5BD"

 return (
 <li key={event.id} className="mb-5 ml-4 last:mb-0">
 <span
 className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-white"
 style={{ background: dotColor }}
 />
 <p className="text-sm font-medium" style={{ color: "var(--foreground, #212529)" }}>
 {AUDIT_LABELS[event.type] ?? event.type}
 </p>
 <p className="mt-0.5 text-xs" style={{ color: "var(--accent, #ADB5BD)" }} suppressHydrationWarning>
 {formatDate(event.createdAt)}
 {(event.actorEmail ?? signerEmail) && (
 <> · {event.actorEmail ?? signerEmail}</>
 )}
 </p>
 {reason && (
 <p className="mt-0.5 text-xs italic" style={{ color: "var(--accent, #ADB5BD)" }}>{reason}</p>
 )}
 </li>
 )
 })}
 </ol>
 </div>
 )}
 </div>
 </div>

 {/* Right: Details + Progress */}
 <div className="space-y-4">
 <div
 className="rounded-xl bg-white p-4"
 style={{ border: "1px solid var(--border, #E5E7EB)" }}
 >
 <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--foreground, #212529)" }}>
 Details
 </h3>
 <dl className="space-y-3 text-sm">
 <div>
 <dt className="text-xs" style={{ color: "var(--accent, #ADB5BD)" }}>Status</dt>
 <dd className="mt-0.5"><StatusBadge status={doc.status} /></dd>
 </div>
 <div>
 <dt className="text-xs" style={{ color: "var(--accent, #ADB5BD)" }}>Created</dt>
 <dd className="mt-0.5" style={{ color: "var(--foreground, #212529)" }} suppressHydrationWarning>{formatDate(doc.createdAt)}</dd>
 </div>
 <div>
 <dt className="text-xs" style={{ color: "var(--accent, #ADB5BD)" }}>Last updated</dt>
 <dd className="mt-0.5" style={{ color: "var(--foreground, #212529)" }} suppressHydrationWarning>{formatDate(doc.updatedAt)}</dd>
 </div>
 <div>
 <dt className="text-xs" style={{ color: "var(--accent, #ADB5BD)" }}>Owner</dt>
 <dd className="mt-0.5" style={{ color: "var(--foreground, #212529)" }}>{doc.user.name ?? doc.user.email}</dd>
 </div>
 {doc.status === "VOIDED" && doc.voidedAt && (
 <div>
 <dt className="text-xs" style={{ color: "var(--accent, #ADB5BD)" }}>Voided at</dt>
 <dd className="mt-0.5" style={{ color: "var(--danger, #DC3545)" }} suppressHydrationWarning>{formatDate(doc.voidedAt)}</dd>
 </div>
 )}
 </dl>
 </div>

 {totalSigners > 0 && doc.status !== "DRAFT" && (
 <div
 className="rounded-xl bg-white p-4"
 style={{ border: "1px solid var(--border, #E5E7EB)" }}
 >
 <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--foreground, #212529)" }}>
 Progress
 </h3>
 <div className="mb-1.5 flex items-center justify-between text-xs" style={{ color: "var(--accent, #ADB5BD)" }}>
 <span>{signedCount} of {totalSigners} signed</span>
 <span>{Math.round((signedCount / totalSigners) * 100)}%</span>
 </div>
 <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--secondary, #F1F3F5)" }}>
 <div
 className="h-2 rounded-full transition-all"
 style={{
 width: `${(signedCount / totalSigners) * 100}%`,
 background: "var(--success, #198754)",
 }}
 />
 </div>
 </div>
 )}
 </div>
 </div>

 {showVoidModal && (
 <VoidModal
 documentName={doc.name}
 onCancel={() => setShowVoidModal(false)}
 onConfirm={handleVoidConfirm}
 pending={isPending}
 />
 )}
 </div>
 )
}
