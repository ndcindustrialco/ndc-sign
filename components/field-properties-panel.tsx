"use client"

import { useState, useTransition } from "react"
import type { FieldItem } from "@/lib/actions/field"
import { updateField } from "@/lib/actions/field"
import type { PanelSigner } from "@/components/pdf-viewer/field-panel"
import { SIGNER_COLORS } from "@/components/pdf-viewer/field-panel"

const PARTY_LABEL = [
 "First Party",
 "Second Party",
 "Third Party",
 "Fourth Party",
 "Fifth Party",
 "Sixth Party",
]

const TYPE_LABEL: Record<string, string> = {
 SIGNATURE: "Signature",
 INITIALS: "Initials",
 TEXT: "Text",
 DATE: "Date",
 NUMBER: "Number",
 IMAGE: "Image",
 CHECKBOX: "Checkbox",
 RADIO: "Multiple Choice",
 SELECT: "Select",
 FILE: "File Upload",
 STAMP: "Stamp",
 PHONE: "Phone",
 CELLS: "Cells",
}

interface Props {
 field: FieldItem
 signers: PanelSigner[]
 onLabelChange: (id: string, label: string | null) => void
 onRequiredChange: (id: string, required: boolean) => void
 onSignerChange: (id: string, signerId: string | null) => void
 onDelete: (id: string) => void
 onClose: () => void
}

export default function FieldPropertiesPanel({
 field,
 signers,
 onLabelChange,
 onRequiredChange,
 onSignerChange,
 onDelete,
 onClose,
}: Props) {
 const [label, setLabel] = useState(field.label ?? "")
 const [, startTransition] = useTransition()

 // Keep local label in sync when field selection changes
 // (parent re-mounts this component when selectedId changes)

 function commitLabel() {
 const trimmed = label.trim() || null
 onLabelChange(field.id, trimmed)
 startTransition(async () => {
 await updateField({ id: field.id, label: trimmed })
 })
 }

 function handleRequiredToggle() {
 const next = !field.required
 onRequiredChange(field.id, next)
 startTransition(async () => {
 await updateField({ id: field.id, required: next })
 })
 }

 function handleSignerChange(e: React.ChangeEvent<HTMLSelectElement>) {
 const val = e.target.value
 const signerId = val === "__none__" ? null : val
 const isPlaceholder = signerId?.startsWith("placeholder-") ?? false
 onSignerChange(field.id, signerId)
 startTransition(async () => {
 await updateField({ id: field.id, signerId: isPlaceholder ? null : signerId })
 })
 }

 const activeSignerIdx = signers.findIndex((s) => s.id === field.signerId)
 const activeColor = activeSignerIdx >= 0
 ? SIGNER_COLORS[activeSignerIdx]?.dot
 : undefined

 return (
 <div className="flex w-full shrink-0 flex-col border-zinc-200 bg-white lg:w-60 lg:border-l">
 {/* Header */}
 <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-3">
 <div className="flex items-center gap-2">
 {activeColor && (
 <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: activeColor }} />
 )}
 <span className="text-sm font-semibold text-zinc-900">
 {TYPE_LABEL[field.type] ?? field.type}
 </span>
 </div>
 <button
 onClick={onClose}
 className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
 aria-label="Close properties"
 >
 <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>

 {/* Properties */}
 <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-4">

 {/* Label */}
 <div>
 <label className="mb-1 block text-xs font-medium text-zinc-500">
 Label
 </label>
 <input
 type="text"
 value={label}
 onChange={(e) => setLabel(e.target.value)}
 onBlur={commitLabel}
 onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur() } }}
 placeholder={TYPE_LABEL[field.type] ?? "Label"}
 className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none"
 />
 </div>

 {/* Required */}
 <div className="flex items-center justify-between">
 <label className="text-xs font-medium text-zinc-500">
 Required
 </label>
 <button
 type="button"
 role="switch"
 aria-checked={field.required}
 onClick={handleRequiredToggle}
 className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
 field.required
 ? "bg-zinc-900"
 : "bg-zinc-200"
 }`}
 >
 <span
 className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
 field.required ? "translate-x-4" : "translate-x-0.5"
 }`}
 />
 </button>
 </div>

 {/* Assigned signer */}
 {signers.length > 0 && (
 <div>
 <label className="mb-1 block text-xs font-medium text-zinc-500">
 Assigned to
 </label>
 <select
 value={field.signerId ?? "__none__"}
 onChange={handleSignerChange}
 className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
 >
 <option value="__none__">Unassigned</option>
 {signers.map((s, idx) => (
 <option key={s.id} value={s.id}>
 {PARTY_LABEL[idx] ?? `Party ${idx + 1}`}
 </option>
 ))}
 </select>
 </div>
 )}

 {/* Field position info (read-only) */}
 <div className="rounded-lg bg-zinc-50 px-3 py-2.5">
 <p className="mb-1.5 text-xs font-medium text-zinc-400">Position</p>
 <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-zinc-500">
 <span>Page {field.page}</span>
 <span className="text-right">{field.width.toFixed(0)}×{field.height.toFixed(0)}%</span>
 <span>X: {field.x.toFixed(1)}%</span>
 <span>Y: {field.y.toFixed(1)}%</span>
 </div>
 </div>
 </div>

 {/* Delete */}
 <div className="border-t border-zinc-100 px-3 py-3">
 <button
 onClick={() => onDelete(field.id)}
 className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
 >
 <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
 d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
 </svg>
 Remove field
 </button>
 </div>
 </div>
 )
}
