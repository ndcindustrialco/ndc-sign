"use client"

import { useState } from "react"
import type { FieldType } from "@/lib/actions/field"

export type PanelSigner = {
 id: string
 name: string
 color: string
}

interface FieldPanelProps {
 selectedType: FieldType | null
 onTypeChange: (type: FieldType, signerId: string | null) => void
 signers: PanelSigner[]
 selectedSignerId: string | null
 onSignerChange: (id: string | null) => void
 onAddSigner: () => void
 onRemoveSigner: (id: string) => void
}

// ── Icons ──────────────────────────────────────────────────────────────────

function IconSignature() {
 return (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
 <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
 </svg>
 )
}
function IconInitials() { return <span className="text-sm font-bold tracking-tighter leading-none">AA</span> }
function IconText() {
 return (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
 <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
 </svg>
 )
}
function IconDate() {
 return (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
 <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
 </svg>
 )
}
function IconNumber() {
 return (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
 <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" />
 </svg>
 )
}
function IconImage() {
 return (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
 <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
 </svg>
 )
}
function IconCheckbox() {
 return (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
 <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 )
}
function IconMultiple() {
 return (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
 <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
 </svg>
 )
}
function IconFile() {
 return (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
 <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
 </svg>
 )
}
function IconSelect() {
 return (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
 <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
 </svg>
 )
}
function IconCells() {
 return (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
 <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125" />
 </svg>
 )
}
function IconStamp() {
 return (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
 <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
 </svg>
 )
}
function IconPhone() {
 return (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
 <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
 </svg>
 )
}
function IconAddPerson() {
 return (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
 <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
 </svg>
 )
}

type FieldEntry = { type: FieldType; label: string; icon: React.ReactNode; disabled?: boolean }

const FIELDS: FieldEntry[] = [
 { type: "TEXT", label: "ข้อความ Text", icon: <IconText /> },
 { type: "SIGNATURE", label: "ลายเซ็น Sign", icon: <IconSignature /> },
 { type: "INITIALS", label: "ชื่อย่อ Init", icon: <IconInitials /> },
 { type: "DATE", label: "วันที่ Date", icon: <IconDate /> },
 { type: "NUMBER", label: "ตัวเลข Num", icon: <IconNumber /> },
 { type: "IMAGE", label: "รูป Image", icon: <IconImage /> },
 { type: "CHECKBOX", label: "เลือก Check", icon: <IconCheckbox /> },
 { type: "RADIO", label: "ตัวเลือก Multi", icon: <IconMultiple /> },
 { type: "FILE", label: "ไฟล์ File", icon: <IconFile /> },
 { type: "SELECT", label: "เลือก Select", icon: <IconSelect /> },
 { type: "CELLS", label: "ช่อง Cells", icon: <IconCells /> },
 { type: "STAMP", label: "ตรา Stamp", icon: <IconStamp /> },
 { type: "PHONE", label: "โทร Phone", icon: <IconPhone />, disabled: true },
]

// Signer color palette
export const SIGNER_COLORS = [
 { dot: "#ef4444" }, // red
 { dot: "#3b82f6" }, // blue
 { dot: "#22c55e" }, // green
 { dot: "#a855f7" }, // purple
 { dot: "#f97316" }, // orange
 { dot: "#ec4899" }, // pink
]

const PARTY_LABEL = ["ฝ่ายที่ 1 First Party", "ฝ่ายที่ 2 Second Party", "ฝ่ายที่ 3 Third Party", "ฝ่ายที่ 4 Fourth Party", "ฝ่ายที่ 5 Fifth Party", "ฝ่ายที่ 6 Sixth Party"]

export default function FieldPanel({
 selectedType,
 onTypeChange,
 signers,
 selectedSignerId,
 onSignerChange,
 onAddSigner,
 onRemoveSigner,
}: FieldPanelProps) {
 const [partyOpen, setPartyOpen] = useState(false)

 // Resolve active signer (fall back to first signer)
 const activeSigner = signers.find((s) => s.id === selectedSignerId) ?? signers[0] ?? null
 const activeIdx = activeSigner ? signers.indexOf(activeSigner) : -1

 function selectSigner(id: string) {
 onSignerChange(id)
 setPartyOpen(false)
 }

 return (
 <div className="flex w-full shrink-0 flex-col border-zinc-200 bg-white lg:w-60 lg:border-l">
 <div className="flex flex-1 flex-col overflow-y-auto">

 {/* ── Party switcher + field grid ── */}
 {signers.length > 0 && (
 <>
 {/* Active party header — click to open party picker */}
 <div className="relative border-b border-zinc-100">
 <button
 onClick={() => setPartyOpen((v) => !v)}
 className="flex w-full items-center gap-2.5 px-3 py-3 text-left transition hover:bg-zinc-50"
 >
 {activeSigner ? (
 <>
 <span
 className="h-2.5 w-2.5 shrink-0 rounded-full"
 style={{ background: activeSigner.color }}
 />
 <span className="flex-1 truncate text-sm font-semibold text-zinc-900">
 {PARTY_LABEL[activeIdx] ?? activeSigner.name}
 </span>
 </>
 ) : (
 <span className="flex-1 text-sm text-zinc-400">เลือกฝ่าย Select party</span>
 )}
 {/* Plus / chevron icon */}
 <span className="flex h-5 w-5 items-center justify-center rounded text-zinc-400">
 <svg
 className={`h-3.5 w-3.5 transition-transform ${partyOpen ? "rotate-180" : ""}`}
 fill="none" stroke="currentColor" viewBox="0 0 24 24"
 >
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
 </svg>
 </span>
 </button>

 {/* Party dropdown */}
 {partyOpen && (
 <div className="absolute left-0 right-0 top-full z-20 border-b border-zinc-200 bg-white shadow-md">
 {signers.map((s, idx) => {
 const isActive = s.id === activeSigner?.id
 const label = PARTY_LABEL[idx] ?? `Party ${idx + 1}`
 const canRemove = signers.length > 1
 return (
 <div
 key={s.id}
 className={`flex items-center text-sm transition ${
 isActive
 ? "bg-zinc-900 text-white"
 : "text-zinc-700 hover:bg-zinc-50"
 }`}
 >
 <button
 onClick={() => selectSigner(s.id)}
 className="flex flex-1 items-center gap-2.5 px-3 py-2.5 text-left"
 >
 <span
 className="h-2.5 w-2.5 shrink-0 rounded-full"
 style={{ background: s.color }}
 />
 <span className="flex-1 truncate font-medium">{label}</span>
 {isActive && (
 <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
 </svg>
 )}
 </button>
 {canRemove && (
 <button
 onClick={(e) => { e.stopPropagation(); setPartyOpen(false); onRemoveSigner(s.id) }}
 className={`mr-2 rounded p-1 transition ${
 isActive
 ? "text-zinc-400 hover:text-white"
 : "text-zinc-300 hover:text-red-500"
 }`}
 aria-label={`Remove ${label}`}
 >
 <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 )}
 </div>
 )
 })}

 {/* Add new party */}
 <button
 onClick={() => { setPartyOpen(false); onAddSigner() }}
 className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-zinc-400 transition hover:bg-zinc-50"
 >
 <IconAddPerson />
 <span>เพิ่ม {PARTY_LABEL[signers.length] ?? `ฝ่ายที่ ${signers.length + 1}`}</span>
 </button>
 </div>
 )}
 </div>

 {/* Field grid */}
 <div className="px-2 py-3">
 <div className="grid grid-cols-3 gap-1">
 {FIELDS.map((f) => {
 const isSelected = selectedType === f.type && selectedSignerId === (activeSigner?.id ?? null)
 const isDisabled = f.disabled === true
 return (
 <button
 key={f.type}
 onClick={() => !isDisabled && activeSigner && onTypeChange(f.type, activeSigner.id)}
 disabled={isDisabled}
 title={f.label}
 className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition ${
 isDisabled
 ? "border-zinc-100 bg-zinc-50 text-zinc-300 cursor-not-allowed"
 : isSelected
 ? "border-zinc-900 bg-zinc-900 text-white"
 : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100"
 }`}
 >
 {f.icon}
 <span className="text-[10px] font-medium leading-none">{f.label}</span>
 </button>
 )
 })}
 </div>
 </div>

 {/* Hint bullets */}
 <div className="mt-auto border-t border-zinc-100 px-4 py-3">
 <ul className="space-y-1 text-[11px] text-zinc-400">
 <li className="flex items-start gap-1.5">
 <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300" />
 วาดฟิลด์ข้อความบนหน้าด้วยเมาส์ Draw text field with mouse
 </li>
 <li className="flex items-start gap-1.5">
 <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300" />
 ลากวางฟิลด์อื่นบนหน้า Drag &amp; drop other fields
 </li>
 <li className="flex items-start gap-1.5">
 <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300" />
 คลิกประเภทฟิลด์ด้านบนเพื่อเริ่มวาด Click type above to draw
 </li>
 </ul>
 </div>
 </>
 )}
 </div>
 </div>
 )
}
