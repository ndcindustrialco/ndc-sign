"use client"

import { useState, useTransition, useEffect, useCallback } from "react"
import PeoplePicker from "@/components/people-picker"
import { sendDocument } from "@/lib/actions/send-document"
import type { SentSigner } from "@/lib/actions/send-document"
import { SIGNER_COLORS } from "@/components/pdf-viewer/field-panel"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Person {
 name: string
 email: string
}

interface PartyRow {
 _key: string
 person: Person | null
}

type SigningMode = "parallel" | "sequential"

type Step = 1 | 2 | 3

interface SignerPreview {
 id: string
 name: string
 email: string
}

interface SendDrawerProps {
 documentId: string
 documentName: string
 initialSigners?: SignerPreview[]
 open: boolean
 onClose: () => void
 onSent: (signers: SentSigner[]) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRow(): PartyRow {
 return { _key: `row-${Date.now()}-${Math.random()}`, person: null }
}

const PARTY_LABELS = [
 "ฝ่ายที่ 1 First Party",
 "ฝ่ายที่ 2 Second Party",
 "ฝ่ายที่ 3 Third Party",
 "ฝ่ายที่ 4 Fourth Party",
 "ฝ่ายที่ 5 Fifth Party",
 "ฝ่ายที่ 6 Sixth Party",
]

const STEP_LABELS: Record<Step, string> = {
 1: "ผู้ลงนาม Recipients",
 2: "ลำดับ Order",
 3: "อีเมล Email",
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function StepIndicator({ current }: { current: Step }) {
 const steps: Step[] = [1, 2, 3]
 return (
 <div className="flex items-center gap-0">
 {steps.map((s, i) => {
 const done = s < current
 const active = s === current
 return (
 <div key={s} className="flex items-center">
 <div
 className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
 done
 ? "bg-zinc-900 text-white"
 : active
 ? "border-2 border-zinc-900 text-zinc-900"
 : "border border-zinc-300 text-zinc-400"
 }`}
 >
 {done ? (
 <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
 </svg>
 ) : (
 s
 )}
 </div>
 <span
 className={`ml-1.5 hidden text-xs font-medium sm:inline ${
 active ? "text-zinc-900" : "text-zinc-400"
 }`}
 >
 {STEP_LABELS[s]}
 </span>
 {i < steps.length - 1 && (
 <div
 className={`mx-2 h-px w-6 transition-colors sm:mx-3 sm:w-8 ${
 done ? "bg-zinc-900" : "bg-zinc-200"
 }`}
 />
 )}
 </div>
 )
 })}
 </div>
 )
}

// ---------------------------------------------------------------------------
// Step 1 — Recipients
// ---------------------------------------------------------------------------

function Step1Recipients({
 rows,
 locked,
 onChange,
}: {
 rows: PartyRow[]
 locked: boolean // true = rows fixed from editor, only fill email
 onChange: (rows: PartyRow[]) => void
}) {
 function addRow() {
 onChange([...rows, makeRow()])
 }

 function removeRow(key: string) {
 if (rows.length <= 1) return
 onChange(rows.filter((r) => r._key !== key))
 }

 function updatePerson(key: string, person: Person | null) {
 onChange(rows.map((r) => (r._key === key ? { ...r, person } : r)))
 }

 return (
 <div className="flex flex-col gap-3">
 <p className="text-sm text-zinc-500">
 {locked
 ? "กรอกอีเมลให้แต่ละฝ่ายที่เพิ่มไว้ Fill in the email for each party."
 : "เพิ่มผู้ที่ต้องลงนาม Add the people who need to sign."}
 </p>

 {rows.map((row, idx) => {
 const color = SIGNER_COLORS[idx % SIGNER_COLORS.length]!
 const label = PARTY_LABELS[idx] ?? `Party ${idx + 1}`
 return (
 <div
 key={row._key}
 className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
 >
 <div className="mb-3 flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="h-2.5 w-2.5 rounded-full" style={{ background: color.dot }} />
 <span className="text-sm font-medium text-zinc-700">
 {label}
 </span>
 </div>
 {!locked && rows.length > 1 && (
 <button
 type="button"
 onClick={() => removeRow(row._key)}
 className="rounded p-0.5 text-zinc-400 transition hover:text-red-500"
 aria-label="Remove"
 >
 <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 )}
 </div>
 <PeoplePicker
 value={row.person}
 onChange={(p) => updatePerson(row._key, p)}
 />
 </div>
 )
 })}

 {!locked && rows.length < PARTY_LABELS.length && (
 <button
 type="button"
 onClick={addRow}
 className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 py-3 text-sm font-medium text-zinc-500 transition hover:border-zinc-400 hover:text-zinc-700"
 >
 <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
 </svg>
 + เพิ่ม {PARTY_LABELS[rows.length] ?? `ฝ่ายที่ ${rows.length + 1}`}
 </button>
 )}
 </div>
 )
}

// ---------------------------------------------------------------------------
// Step 2 — Signing Order
// ---------------------------------------------------------------------------

function Step2Order({
 rows,
 mode,
 onModeChange,
}: {
 rows: PartyRow[]
 mode: SigningMode
 onModeChange: (m: SigningMode) => void
}) {
 return (
 <div className="flex flex-col gap-4">
 <p className="text-sm text-zinc-500">
 เลือกวิธีให้ผู้ลงนามเซ็น Choose how recipients sign.
 </p>

 {/* Mode cards */}
 <div className="grid grid-cols-2 gap-3">
 {/* Parallel */}
 <button
 type="button"
 onClick={() => onModeChange("parallel")}
 className={`flex flex-col gap-2 rounded-xl border p-4 text-left transition ${
 mode === "parallel"
 ? "border-zinc-900 bg-zinc-900 text-white"
 : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
 }`}
 >
 {/* Icon: parallel arrows */}
 <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
 d="M17 8l4 4m0 0l-4 4m4-4H3" />
 </svg>
 <div>
 <p className="text-sm font-semibold">พร้อมกัน All at once</p>
 <p className={`mt-0.5 text-xs leading-snug ${mode === "parallel" ? "text-zinc-300" : "text-zinc-400"}`}>
 ทุกคนได้รับเชิญพร้อมกัน All receive invites at once.
 </p>
 </div>
 </button>

 {/* Sequential */}
 <button
 type="button"
 onClick={() => onModeChange("sequential")}
 className={`flex flex-col gap-2 rounded-xl border p-4 text-left transition ${
 mode === "sequential"
 ? "border-zinc-900 bg-zinc-900 text-white"
 : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
 }`}
 >
 {/* Icon: stacked steps */}
 <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
 d="M3 7h6m0 0l3 3m-3-3l3-3M9 7h12M3 17h6m0 0l3 3m-3-3l3-3M9 17h12" />
 </svg>
 <div>
 <p className="text-sm font-semibold">ตามลำดับ In order</p>
 <p className={`mt-0.5 text-xs leading-snug ${mode === "sequential" ? "text-zinc-300" : "text-zinc-400"}`}>
 แจ้งทีละคนหลังคนก่อนหน้าเซ็นแล้ว Notified after the previous signs.
 </p>
 </div>
 </button>
 </div>

 {/* Signer preview list */}
 <div className="rounded-xl border border-zinc-200 bg-zinc-50">
 <div className="border-b border-zinc-200 px-4 py-2.5">
 <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
 ลำดับการลงนาม Signing sequence
 </p>
 </div>
 <ul className="divide-y divide-zinc-100">
 {rows.map((row, idx) => {
 const color = SIGNER_COLORS[idx % SIGNER_COLORS.length]!
 const label = PARTY_LABELS[idx] ?? `Party ${idx + 1}`
 const order = mode === "sequential" ? idx + 1 : 1
 const hasPerson = !!row.person
 return (
 <li key={row._key} className="flex items-center gap-3 px-4 py-3">
 {/* Order badge */}
 <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-600">
 {order}
 </span>
 <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color.dot }} />
 <div className="min-w-0 flex-1">
 {hasPerson ? (
 <>
 <p className="truncate text-sm font-medium text-zinc-800">
 {row.person!.name}
 </p>
 <p className="truncate text-xs text-zinc-400">{row.person!.email}</p>
 </>
 ) : (
 <p className="truncate text-sm italic text-zinc-400">
 {label} — รอกรอกอีเมล email to be filled
 </p>
 )}
 </div>
 {mode === "parallel" && (
 <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
 simultaneous
 </span>
 )}
 </li>
 )
 })}
 </ul>
 </div>
 </div>
 )
}

// ---------------------------------------------------------------------------
// Step 3 — Email
// ---------------------------------------------------------------------------

function Step3Email({
 documentName,
 subject,
 message,
 onSubjectChange,
 onMessageChange,
}: {
 documentName: string
 subject: string
 message: string
 onSubjectChange: (v: string) => void
 onMessageChange: (v: string) => void
}) {
 return (
 <div className="flex flex-col gap-4">
 <p className="text-sm text-zinc-500">
 ปรับแต่งอีเมลเชิญที่จะส่งให้ผู้ลงนาม Customize the invite email.
 </p>

 <div className="flex flex-col gap-1.5">
 <label className="text-xs font-medium text-zinc-600">
 หัวข้ออีเมล Email Subject
 </label>
 <input
 type="text"
 value={subject}
 onChange={(e) => onSubjectChange(e.target.value)}
 maxLength={200}
 className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
 />
 </div>

 <div className="flex flex-col gap-1.5">
 <label className="text-xs font-medium text-zinc-600">
 ข้อความ Message <span className="font-normal text-zinc-400">(ไม่บังคับ optional)</span>
 </label>
 <textarea
 value={message}
 onChange={(e) => onMessageChange(e.target.value)}
 maxLength={2000}
 rows={5}
 placeholder={`สวัสดี\n\nกรุณาตรวจสอบและลงนามเอกสาร "${documentName}"\n\nขอบคุณ`}
 className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-zinc-900"
 />
 <p className="text-right text-[11px] text-zinc-400">{message.length}/2000</p>
 </div>

 {/* Preview hint */}
 <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
 <p className="text-xs text-zinc-500">
 <strong className="text-zinc-700">หัวข้อ Subject:</strong> {subject || `กรุณาลงนาม: ${documentName}`}
 </p>
 {message && (
 <p className="mt-1 text-xs text-zinc-500 line-clamp-2">
 <strong className="text-zinc-700">ข้อความ Message:</strong> {message}
 </p>
 )}
 </div>
 </div>
 )
}

// ---------------------------------------------------------------------------
// Main SendDrawer
// ---------------------------------------------------------------------------

export default function SendDrawer({
 documentId,
 documentName,
 initialSigners = [],
 open,
 onClose,
 onSent,
}: SendDrawerProps) {
 const [step, setStep] = useState<Step>(1)
 const [rows, setRows] = useState<PartyRow[]>([makeRow()])
 const [mode, setMode] = useState<SigningMode>("parallel")
 const [subject, setSubject] = useState(`กรุณาลงนาม Please sign: ${documentName}`)
 const [message, setMessage] = useState("")
 const [error, setError] = useState<string | null>(null)
 const [isPending, startTransition] = useTransition()

 // Build one row per initialSigner — pre-fill person only when email exists
 function buildInitialRows(): PartyRow[] {
 if (initialSigners.length === 0) return [makeRow()]
 return initialSigners.map((s) => ({
 _key: `row-${s.id}`,
 person: s.email ? { name: s.name, email: s.email } : null,
 }))
 }

 // Reset on open
 useEffect(() => {
 if (open) {
 setStep(1)
 setRows(buildInitialRows())
 setMode("parallel")
 setSubject(`กรุณาลงนาม Please sign: ${documentName}`)
 setMessage("")
 setError(null)
 }
 }, [open, documentName])

 // Keyboard: Escape closes
 useEffect(() => {
 if (!open) return
 const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
 document.addEventListener("keydown", handler)
 return () => document.removeEventListener("keydown", handler)
 }, [open, onClose])

 // Prevent body scroll
 useEffect(() => {
 document.body.style.overflow = open ? "hidden" : ""
 return () => { document.body.style.overflow = "" }
 }, [open])

 const filledRows = rows.filter((r) => r.person)

 // Step 1 validation
 function validateStep1(): string | null {
 if (filledRows.length === 0) return "กรุณาเพิ่มผู้ลงนามอย่างน้อย 1 คน Please add at least one recipient."
 const emails = filledRows.map((r) => r.person!.email.toLowerCase())
 const unique = new Set(emails)
 if (unique.size !== emails.length) return "อีเมลซ้ำ ใช้อีเมลเดียวกันไม่ได้ Duplicate emails not allowed."
 return null
 }

 // Step 3 validation
 function validateStep3(): string | null {
 if (!subject.trim()) return "ต้องระบุหัวข้ออีเมล Email subject is required."
 return null
 }

 const handleNext = useCallback(() => {
 setError(null)
 if (step === 1) {
 const err = validateStep1()
 if (err) { setError(err); return }
 setStep(2)
 } else if (step === 2) {
 setStep(3)
 }
 }, [step, filledRows]) // eslint-disable-line react-hooks/exhaustive-deps

 const handleBack = useCallback(() => {
 setError(null)
 if (step === 2) setStep(1)
 else if (step === 3) setStep(2)
 }, [step])

 const handleSend = useCallback(() => {
 const err = validateStep3()
 if (err) { setError(err); return }
 setError(null)

 const signers = filledRows.map((row, idx) => ({
 name: row.person!.name,
 email: row.person!.email,
 signingOrder: mode === "sequential" ? idx + 1 : 1,
 }))

 startTransition(async () => {
 const result = await sendDocument({
 documentId,
 signers,
 emailSubject: subject.trim(),
 emailMessage: message.trim(),
 })
 if (!result.ok) {
 setError(result.error)
 return
 }
 onSent(result.data)
 onClose()
 })
 }, [filledRows, mode, subject, message, documentId, onSent, onClose]) // eslint-disable-line react-hooks/exhaustive-deps

 return (
 <>
 {/* Backdrop */}
 {open && (
 <div
 className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
 onClick={onClose}
 />
 )}

 {/* Drawer panel */}
 <div
 aria-modal="true"
 role="dialog"
 aria-label="Send document"
 className={`fixed inset-0 z-50 flex flex-col bg-white shadow-2xl transition-transform duration-300 sm:inset-y-0 sm:left-auto sm:right-0 sm:w-full sm:max-w-lg ${
 open ? "translate-x-0" : "translate-x-full"
 }`}
 >
 {/* ── Header ─────────────────────────────────────────────────────── */}
 <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-4 sm:px-6">
 <div>
 <h2 className="text-base font-semibold text-zinc-900">
 ส่งลงนาม Send for Signing
 </h2>
 <p className="mt-0.5 truncate max-w-xs text-xs text-zinc-400">{documentName}</p>
 </div>
 <button
 onClick={onClose}
 className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
 aria-label="Close"
 >
 <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>

 {/* ── Step indicator ─────────────────────────────────────────────── */}
 <div className="border-b border-zinc-100 px-4 py-4 sm:px-6">
 <StepIndicator current={step} />
 </div>

 {/* ── Body ───────────────────────────────────────────────────────── */}
 <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
 {step === 1 && <Step1Recipients rows={rows} locked={initialSigners.length > 0} onChange={setRows} />}
 {step === 2 && <Step2Order rows={rows} mode={mode} onModeChange={setMode} />}
 {step === 3 && (
 <Step3Email
 documentName={documentName}
 subject={subject}
 message={message}
 onSubjectChange={setSubject}
 onMessageChange={setMessage}
 />
 )}

 {error && (
 <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
 {error}
 </p>
 )}
 </div>

 {/* ── Footer ─────────────────────────────────────────────────────── */}
 <div className="border-t border-zinc-200 px-4 py-4 sm:px-6">
 <div className="flex items-center justify-between gap-3">
 {/* Back */}
 {step > 1 ? (
 <button
 type="button"
 onClick={handleBack}
 disabled={isPending}
 className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40"
 >
 <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
 </svg>
 กลับ Back
 </button>
 ) : (
 <button
 type="button"
 onClick={onClose}
 className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
 >
 ยกเลิก Cancel
 </button>
 )}

 {/* Next / Send */}
 {step < 3 ? (
 <button
 type="button"
 onClick={handleNext}
 className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700"
 >
 ต่อไป Continue
 <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
 </svg>
 </button>
 ) : (
 <button
 type="button"
 onClick={handleSend}
 disabled={isPending}
 className="flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-40"
 >
 {isPending ? (
 <>
 <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
 </svg>
 กำลังส่ง…
 </>
 ) : (
 <>
 <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
 d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
 </svg>
 ส่งเชิญ Send Invites
 </>
 )}
 </button>
 )}
 </div>

 {/* Signer count summary */}
 {filledRows.length > 0 && (
 <p className="mt-3 text-center text-xs text-zinc-400">
 {filledRows.length} ผู้ลงนาม recipient{filledRows.length !== 1 ? "s" : ""} ·{" "}
 {mode === "parallel" ? "เซ็นพร้อมกัน simultaneously" : "เซ็นตามลำดับ in order"}
 </p>
 )}
 </div>
 </div>
 </>
 )
}
