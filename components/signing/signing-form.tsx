"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { submitSignature, declineSignature } from "@/lib/actions/submission"
import { saveSignature } from "@/lib/actions/saved-signature"
import FieldInput from "./field-input"
import SigningPdfView from "./signing-pdf-view"
import type { SigningField } from "./signing-pdf-view"

interface SigningFormProps {
 signerId: string
 tokenId: string
 signerName: string
 signerEmail: string
 documentName: string
 pdfUrl: string
 fields: SigningField[]
 savedSignature: string | null
 isApprover?: boolean
 ip?: string
 userAgent?: string
}

export default function SigningForm({
 signerId,
 tokenId,
 signerName,
 signerEmail,
 documentName,
 pdfUrl,
 fields,
 savedSignature,
 isApprover = false,
 ip,
 userAgent,
}: SigningFormProps) {
 const router = useRouter()
 const [values, setValues] = useState<Record<string, string | null>>({})
 const [errors, setErrors] = useState<Set<string>>(new Set())
 const [submitError, setSubmitError] = useState<string | null>(null)
 const [activeFieldId, setActiveFieldId] = useState<string | null>(fields[0]?.id ?? null)
 const [shouldSaveSignature, setShouldSaveSignature] = useState(!savedSignature)
 const [isPending, startTransition] = useTransition()
 const [showDeclineDialog, setShowDeclineDialog] = useState(false)
 const [declineReason, setDeclineReason] = useState("")
 const [isDeclinePending, startDeclineTransition] = useTransition()

 // Mobile: bottom sheet for active field
 const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
 // Desktop: sidebar ref for scroll-to-field
 const sidebarRef = useRef<HTMLDivElement>(null)

 function handleChange(fieldId: string, value: string | null) {
 setValues((prev) => ({ ...prev, [fieldId]: value }))
 if (value) {
 setErrors((prev) => { const next = new Set(prev); next.delete(fieldId); return next })
 }
 }

 function handleFieldClick(fieldId: string) {
 setActiveFieldId(fieldId)
 // Mobile: open bottom sheet
 setMobileSheetOpen(true)
 // Desktop: scroll sidebar to the field input
 const el = sidebarRef.current?.querySelector(`[data-field-id="${fieldId}"]`)
 el?.scrollIntoView({ behavior: "smooth", block: "center" })
 }

 function validate() {
 const missing = new Set<string>()
 for (const field of fields) {
 if (field.required && !values[field.id]) missing.add(field.id)
 }
 setErrors(missing)
 return missing.size === 0
 }

 function handleSubmit(e: React.FormEvent) {
 e.preventDefault()
 if (!validate()) {
 setSubmitError("กรุณากรอกฟิลด์ที่จำเป็นให้ครบ Please complete all required fields.")
 return
 }
 setSubmitError(null)

 const payload = Object.entries(values)
 .filter(([, v]) => v !== null && v !== "")
 .map(([fieldId, value]) => ({ fieldId, value: value! }))

 startTransition(async () => {
 if (shouldSaveSignature) {
 const sigField = fields.find((f) => f.type === "SIGNATURE")
 const sigValue = sigField ? values[sigField.id] : null
 if (sigValue?.startsWith("data:image/png;base64,")) {
 await saveSignature({ email: signerEmail, dataUrl: sigValue }).catch((err) =>
 console.error("[signing-form] save signature failed", err)
 )
 }
 }

 const result = await submitSignature({
 signerId,
 tokenId,
 values: payload,
 ip,
 userAgent,
 timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
 })
 if (!result.ok) {
 setSubmitError(result.error)
 return
 }
 router.push("/sign/done")
 })
 }

 function handleDecline() {
 if (!declineReason.trim()) return
 startDeclineTransition(async () => {
 const result = await declineSignature({ signerId, reason: declineReason.trim() })
 if (result.ok) {
 router.push("/sign/done?declined=1")
 } else {
 setSubmitError(result.error)
 setShowDeclineDialog(false)
 }
 })
 }

 const completedCount = fields.filter((f) => !!values[f.id]).length
 const progress = fields.length > 0 ? Math.round((completedCount / fields.length) * 100) : 100
 const activeField = fields.find((f) => f.id === activeFieldId) ?? null

 return (
 <>
 <form onSubmit={handleSubmit} className="flex h-full flex-col lg:flex-row lg:items-start lg:gap-0">

 {/* ── PDF — full screen on mobile, flex-1 on desktop ── */}
 <div className="flex-1 min-w-0 overflow-y-auto lg:h-full">
 <SigningPdfView
 url={pdfUrl}
 fields={fields}
 values={values}
 activeFieldId={activeFieldId}
 onFieldClick={handleFieldClick}
 />
 </div>

 {/* ── Desktop sidebar ── */}
 <div
 className="hidden lg:flex w-80 shrink-0 flex-col gap-3 border-l p-6"
 style={{ borderColor: "var(--border, #E5E7EB)" }}
 >
 {/* Signer info */}
 <div className="rounded-xl bg-white p-4" style={{ border: "1px solid var(--border, #E5E7EB)" }}>
 <p className="text-xs" style={{ color: "var(--accent, #ADB5BD)" }}>
  {isApprover ? "อนุมัติในฐานะ Approving as" : "ลงนามในฐานะ Signing as"}
 </p>
 <p className="font-semibold" style={{ color: "var(--foreground, #212529)" }}>{signerName}</p>
 <p className="mt-0.5 text-xs" style={{ color: "var(--accent, #ADB5BD)" }}>{documentName}</p>
 </div>

 {/* Approver instruction */}
 {isApprover && (
 <div className="rounded-xl bg-blue-50 p-4" style={{ border: "1px solid #BFDBFE" }}>
  <p className="text-sm font-medium text-blue-800">กรุณาตรวจสอบเอกสารก่อนอนุมัติ</p>
  <p className="mt-0.5 text-xs text-blue-600">Please review the document before approving.</p>
 </div>
 )}

 {/* Progress */}
 {fields.length > 0 && (
 <div className="rounded-xl bg-white p-4" style={{ border: "1px solid var(--border, #E5E7EB)" }}>
 <div className="mb-1.5 flex items-center justify-between text-xs" style={{ color: "var(--accent, #ADB5BD)" }}>
 <span>ความคืบหน้า Progress</span>
 <span>{completedCount} / {fields.length}</span>
 </div>
 <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--secondary, #F1F3F5)" }}>
 <div
 className="h-2 rounded-full transition-all"
 style={{ width: `${progress}%`, background: "var(--primary, #0F1059)" }}
 />
 </div>
 </div>
 )}

 {/* Field inputs */}
 <div ref={sidebarRef} className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
 {fields.length > 0 && fields.map((field) => (
 <div key={field.id} data-field-id={field.id} onClick={() => setActiveFieldId(field.id)}>
 <FieldInput
 fieldId={field.id}
 type={field.type}
 label={field.label}
 required={field.required}
 value={values[field.id] ?? null}
 options={field.options}
 onChange={handleChange}
 error={errors.has(field.id)}
 savedSignature={field.type === "SIGNATURE" ? savedSignature : undefined}
 saveChecked={field.type === "SIGNATURE" ? shouldSaveSignature : undefined}
 onSaveChange={field.type === "SIGNATURE" ? setShouldSaveSignature : undefined}
 />
 </div>
 ))}
 </div>

 {submitError && (
 <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
 {submitError}
 </p>
 )}

 <button
 type="submit"
 disabled={isPending || isDeclinePending}
 className="rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
 style={{ background: "var(--primary, #0F1059)" }}
 >
 {isPending ? "กำลังส่ง…" : isApprover ? "อนุมัติ Approve" : "ส่งและลงนาม Submit & Sign"}
 </button>

 <button
 type="button"
 onClick={() => setShowDeclineDialog(true)}
 disabled={isPending || isDeclinePending}
 className="rounded-xl py-2.5 text-sm font-medium transition-colors hover:bg-red-50 disabled:opacity-40"
 style={{ border: "1px solid var(--border, #E5E7EB)", color: "var(--accent, #ADB5BD)" }}
 >
 {isApprover ? "ปฏิเสธ Reject" : "ปฏิเสธลงนาม Decline to sign"}
 </button>
 </div>

 {/* ── Mobile bottom bar (always visible) ── */}
 <div
 className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t bg-white px-4 py-3 flex items-center gap-3"
 style={{ borderColor: "var(--border, #E5E7EB)" }}
 >
 {/* Progress pill */}
 <div className="flex items-center gap-2 min-w-0">
 <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "var(--primary, #0F1059)" }}>
 {completedCount}
 </div>
 <div className="hidden xs:flex flex-col min-w-0">
 <span className="text-xs text-zinc-400 leading-none">จาก {fields.length} ฟิลด์</span>
 </div>
 </div>

 {/* Progress bar */}
 <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--secondary, #F1F3F5)" }}>
 <div
 className="h-1.5 rounded-full transition-all"
 style={{ width: `${progress}%`, background: "var(--primary, #0F1059)" }}
 />
 </div>

 {/* Decline */}
 <button
 type="button"
 onClick={() => setShowDeclineDialog(true)}
 disabled={isPending || isDeclinePending}
 className="shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-zinc-500 disabled:opacity-40 border"
 style={{ borderColor: "var(--border, #E5E7EB)" }}
 >
 ปฏิเสธ Decline
 </button>

 {/* Submit */}
 <button
 type="submit"
 disabled={isPending || isDeclinePending}
 className="shrink-0 rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
 style={{ background: "var(--primary, #0F1059)" }}
 >
 {isPending ? "…" : isApprover ? "อนุมัติ" : "ส่ง Submit"}
 </button>
 </div>

 {/* Spacer so PDF content isn't hidden behind the mobile bottom bar */}
 <div className="lg:hidden h-16 shrink-0" />
 </form>

 {/* ── Mobile field bottom sheet ── */}
 {mobileSheetOpen && activeField && (
 <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white shadow-2xl"
 style={{ maxHeight: "75vh", overflowY: "auto" }}
 >
 {/* Handle */}
 <div className="flex justify-center pt-3 pb-1">
 <div className="h-1 w-10 rounded-full bg-zinc-200" />
 </div>

 {/* Header */}
 <div className="flex items-center justify-between px-4 pb-3 pt-1">
 <div className="flex items-center gap-2">
 {/* Field nav prev */}
 <button
 type="button"
 onClick={() => {
 const idx = fields.findIndex((f) => f.id === activeFieldId)
 if (idx > 0) setActiveFieldId(fields[idx - 1]!.id)
 }}
 disabled={fields.findIndex((f) => f.id === activeFieldId) === 0}
 className="rounded p-1 text-zinc-400 disabled:opacity-30 hover:bg-zinc-100"
 >
 <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
 </svg>
 </button>
 <span className="text-sm font-semibold text-zinc-900">
 {activeField.label ?? activeField.type}
 </span>
 {activeField.required && <span className="text-xs text-red-500">*</span>}
 {/* Field nav next */}
 <button
 type="button"
 onClick={() => {
 const idx = fields.findIndex((f) => f.id === activeFieldId)
 if (idx < fields.length - 1) setActiveFieldId(fields[idx + 1]!.id)
 }}
 disabled={fields.findIndex((f) => f.id === activeFieldId) === fields.length - 1}
 className="rounded p-1 text-zinc-400 disabled:opacity-30 hover:bg-zinc-100"
 >
 <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
 </svg>
 </button>
 </div>
 <button
 type="button"
 onClick={() => setMobileSheetOpen(false)}
 className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100"
 >
 <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>

 {/* Field input */}
 <div className="px-4 pb-4">
 <FieldInput
 key={activeField.id}
 fieldId={activeField.id}
 type={activeField.type}
 label={activeField.label}
 required={activeField.required}
 value={values[activeField.id] ?? null}
 options={activeField.options}
 onChange={(fieldId, value) => {
 handleChange(fieldId, value)
 }}
 error={errors.has(activeField.id)}
 savedSignature={activeField.type === "SIGNATURE" ? savedSignature : undefined}
 saveChecked={activeField.type === "SIGNATURE" ? shouldSaveSignature : undefined}
 onSaveChange={activeField.type === "SIGNATURE" ? setShouldSaveSignature : undefined}
 />

 {submitError && (
 <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
 {submitError}
 </p>
 )}
 </div>

 {/* Next / Done footer */}
 <div className="border-t px-4 py-3 flex items-center justify-between gap-3" style={{ borderColor: "var(--border, #E5E7EB)" }}>
 <span className="text-xs text-zinc-400">
 {fields.findIndex((f) => f.id === activeFieldId) + 1} จาก {fields.length}
 </span>
 {(() => {
 const idx = fields.findIndex((f) => f.id === activeFieldId)
 const isLast = idx === fields.length - 1
 if (isLast) {
 return (
 <button
 type="button"
 onClick={() => setMobileSheetOpen(false)}
 className="rounded-lg px-5 py-2 text-sm font-semibold text-white"
 style={{ background: "var(--success, #198754)" }}
 >
 เสร็จ Done ✓
 </button>
 )
 }
 return (
 <button
 type="button"
 onClick={() => {
 const next = fields[idx + 1]
 if (next) setActiveFieldId(next.id)
 }}
 className="flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-semibold text-white"
 style={{ background: "var(--primary, #0F1059)" }}
 >
 ถัดไป Next
 <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
 </svg>
 </button>
 )
 })()}
 </div>
 </div>
 )}

 {/* ── Decline dialog ── */}
 {showDeclineDialog && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
 <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
 <h2 className="mb-1 text-base font-semibold text-zinc-900">
 ปฏิเสธลงนาม Decline to sign
 </h2>
 <p className="mb-4 text-sm text-zinc-500">
 กรุณาระบุเหตุผล เจ้าของเอกสารจะได้รับแจ้ง Please provide a reason.
 </p>
 <textarea
 value={declineReason}
 onChange={(e) => setDeclineReason(e.target.value)}
 rows={3}
 className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none"
 placeholder="เช่น ไม่ใช่ผู้ลงนามที่ถูกต้อง e.g. Not the correct signatory"
 />
 <div className="mt-4 flex justify-end gap-2">
 <button
 type="button"
 onClick={() => setShowDeclineDialog(false)}
 disabled={isDeclinePending}
 className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
 >
 ยกเลิก Cancel
 </button>
 <button
 type="button"
 onClick={handleDecline}
 disabled={isDeclinePending || !declineReason.trim()}
 className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
 >
 {isDeclinePending ? "กำลังปฏิเสธ…" : "ยืนยันปฏิเสธ Confirm decline"}
 </button>
 </div>
 </div>
 </div>
 )}
 </>
 )
}
