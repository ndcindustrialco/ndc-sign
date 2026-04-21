"use client"

import { useRef, useCallback } from "react"
import type { FieldItem, FieldType } from "@/lib/actions/field"

// ---------------------------------------------------------------------------
// Type styles & labels
// ---------------------------------------------------------------------------

const TYPE_STYLE: Record<FieldType, { border: string; bg: string; header: string; text: string; dot: string }> = {
 SIGNATURE: { border: "border-blue-500", bg: "bg-blue-100/60", header: "bg-blue-600", text: "text-blue-700", dot: "bg-blue-500" },
 INITIALS: { border: "border-cyan-500", bg: "bg-cyan-100/60", header: "bg-cyan-600", text: "text-cyan-700", dot: "bg-cyan-500" },
 TEXT: { border: "border-red-500", bg: "bg-red-200/50", header: "bg-[#1e1b4b]", text: "text-red-700", dot: "bg-red-500" },
 DATE: { border: "border-violet-500", bg: "bg-violet-100/60", header: "bg-violet-600", text: "text-violet-700", dot: "bg-violet-500" },
 NUMBER: { border: "border-amber-500", bg: "bg-amber-100/60", header: "bg-amber-600", text: "text-amber-700", dot: "bg-amber-500" },
 IMAGE: { border: "border-pink-500", bg: "bg-pink-100/60", header: "bg-pink-600", text: "text-pink-700", dot: "bg-pink-500" },
 CHECKBOX: { border: "border-teal-500", bg: "bg-teal-100/60", header: "bg-teal-600", text: "text-teal-700", dot: "bg-teal-500" },
 RADIO: { border: "border-indigo-500", bg: "bg-indigo-100/60", header: "bg-indigo-600", text: "text-indigo-700", dot: "bg-indigo-500" },
 SELECT: { border: "border-orange-500", bg: "bg-orange-100/60", header: "bg-orange-600", text: "text-orange-700", dot: "bg-orange-500" },
 FILE: { border: "border-rose-500", bg: "bg-rose-100/60", header: "bg-rose-600", text: "text-rose-700", dot: "bg-rose-500" },
 STAMP: { border: "border-lime-600", bg: "bg-lime-100/60", header: "bg-lime-600", text: "text-lime-700", dot: "bg-lime-500" },
 PHONE: { border: "border-sky-500", bg: "bg-sky-100/60", header: "bg-sky-600", text: "text-sky-700", dot: "bg-sky-500" },
 CELLS: { border: "border-fuchsia-500", bg: "bg-fuchsia-100/60", header: "bg-fuchsia-600", text: "text-fuchsia-700", dot: "bg-fuchsia-500" },
}

const TYPE_LABEL: Record<FieldType, string> = {
 SIGNATURE: "Signature",
 INITIALS: "Initials",
 TEXT: "Text Field",
 DATE: "Date",
 NUMBER: "Number",
 IMAGE: "Image",
 CHECKBOX: "Checkbox",
 RADIO: "Multiple",
 SELECT: "Select",
 FILE: "File",
 STAMP: "Stamp",
 PHONE: "Phone",
 CELLS: "Cells",
}

// ---------------------------------------------------------------------------
// Icons (compact inline SVGs, match field-panel)
// ---------------------------------------------------------------------------

function TypeIcon({ type, className = "h-4 w-4" }: { type: FieldType; className?: string }) {
 const c = className
 switch (type) {
 case "TEXT":
 return (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={c}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M4 7V5h16v2M9 5v14m-2 0h4m2-14v14m-2 0h4" />
 </svg>
 )
 case "SIGNATURE":
 return (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={c}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
 </svg>
 )
 case "INITIALS":
 return <span className="text-[11px] font-bold tracking-tighter leading-none">AA</span>
 case "DATE":
 return (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={c}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 9h18M5.25 5.25h13.5A2.25 2.25 0 0121 7.5v11.25A2.25 2.25 0 0118.75 21H5.25A2.25 2.25 0 013 18.75V7.5a2.25 2.25 0 012.25-2.25z" />
 </svg>
 )
 case "NUMBER":
 return (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={c}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" />
 </svg>
 )
 case "IMAGE":
 return (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={c}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159M3.75 19.5h16.5A1.5 1.5 0 0021.75 18V6A1.5 1.5 0 0020.25 4.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
 </svg>
 )
 case "CHECKBOX":
 return (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={c}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M4.5 4.5h15v15h-15z" />
 </svg>
 )
 case "RADIO":
 return (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={c}>
 <circle cx="12" cy="12" r="8" />
 <circle cx="12" cy="12" r="3" fill="currentColor" />
 </svg>
 )
 case "SELECT":
 return (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={c}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
 </svg>
 )
 case "FILE":
 return (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={c}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32" />
 </svg>
 )
 case "STAMP":
 return (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={c}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
 </svg>
 )
 case "PHONE":
 return (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={c}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
 </svg>
 )
 case "CELLS":
 return (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={c}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5v13.5H3.75zM3.75 12h16.5M12 5.25v13.5" />
 </svg>
 )
 }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FieldItemProps {
 field: FieldItem
 containerRef: React.RefObject<HTMLDivElement | null>
 onUpdate: (id: string, patch: Partial<Pick<FieldItem, "x" | "y" | "width" | "height">>) => void
 onUpdateCommit: (id: string) => void
 onDelete: (id: string) => void
 isSelected: boolean
 onSelect: (id: string) => void
 /** Called only on tap (no drag movement) — used to open properties sheet on mobile */
 onTap?: (id: string) => void
 /** Optional signer dot color for multi-signer indicator */
 signerColor?: string
 /** Sequential number within the same field type (1-based) */
 fieldIndex?: number
}

export default function FieldItemComponent({
 field,
 containerRef,
 onUpdate,
 onUpdateCommit,
 onDelete,
 isSelected,
 onSelect,
 onTap,
 signerColor,
 fieldIndex,
}: FieldItemProps) {
 const startRef = useRef<{ x: number; y: number; field: typeof field; moved: boolean } | null>(null)

 // -------------------------------------------------------------------------
 // Drag (move) — attached to the whole wrapper so header + body drag together
 // -------------------------------------------------------------------------
 const handleDragPointerDown = useCallback(
 (e: React.PointerEvent) => {
 e.stopPropagation()
 e.currentTarget.setPointerCapture(e.pointerId)
 onSelect(field.id)
 startRef.current = { x: e.clientX, y: e.clientY, field: { ...field }, moved: false }
 },
 [field, onSelect]
 )

 const handleDragPointerMove = useCallback(
 (e: React.PointerEvent) => {
 if (!startRef.current || !containerRef.current) return
 const container = containerRef.current.getBoundingClientRect()
 const dx = ((e.clientX - startRef.current.x) / container.width) * 100
 const dy = ((e.clientY - startRef.current.y) / container.height) * 100
 const dPx = Math.hypot(e.clientX - startRef.current.x, e.clientY - startRef.current.y)
 if (dPx < 4) return
 startRef.current.moved = true
 const newX = Math.max(0, Math.min(100 - startRef.current.field.width, startRef.current.field.x + dx))
 const newY = Math.max(0, Math.min(100 - startRef.current.field.height, startRef.current.field.y + dy))
 onUpdate(field.id, { x: newX, y: newY })
 },
 [field.id, containerRef, onUpdate]
 )

 const handleDragPointerUp = useCallback(() => {
 const wasTap = startRef.current && !startRef.current.moved
 startRef.current = null
 onUpdateCommit(field.id)
 if (wasTap) onTap?.(field.id)
 }, [field.id, onUpdateCommit, onTap])

 // -------------------------------------------------------------------------
 // Resize — single bottom-right handle
 // -------------------------------------------------------------------------
 const handleResizePointerDown = useCallback(
 (e: React.PointerEvent) => {
 e.stopPropagation()
 e.currentTarget.setPointerCapture(e.pointerId)
 onSelect(field.id)
 startRef.current = { x: e.clientX, y: e.clientY, field: { ...field }, moved: true }

 const onMove = (ev: PointerEvent) => {
 if (!startRef.current || !containerRef.current) return
 const container = containerRef.current.getBoundingClientRect()
 const dx = ((ev.clientX - startRef.current.x) / container.width) * 100
 const dy = ((ev.clientY - startRef.current.y) / container.height) * 100
 const f = startRef.current.field

 let width = Math.max(5, f.width + dx)
 let height = Math.max(3, f.height + dy)
 width = Math.min(width, 100 - f.x)
 height = Math.min(height, 100 - f.y)

 onUpdate(field.id, { width, height })
 }

 const onUp = () => {
 startRef.current = null
 onUpdateCommit(field.id)
 window.removeEventListener("pointermove", onMove)
 window.removeEventListener("pointerup", onUp)
 }

 window.addEventListener("pointermove", onMove)
 window.addEventListener("pointerup", onUp)
 },
 [field, containerRef, onUpdate, onUpdateCommit, onSelect]
 )

 const style = TYPE_STYLE[field.type]
 const displayLabel = field.label ?? `${TYPE_LABEL[field.type]}${fieldIndex ? ` ${fieldIndex}` : ""}`

 return (
 <div
 style={{
 left: `${field.x}%`,
 top: `${field.y}%`,
 width: `${field.width}%`,
 height: `${field.height}%`,
 }}
 className="absolute pointer-events-auto"
 onClick={(e) => { e.stopPropagation(); onSelect(field.id) }}
 >
 {/* Header tab — sits above the body */}
 <div
 className={`absolute left-0 -top-5 flex h-5 max-w-full items-center gap-1 rounded-t-md px-1.5 text-[11px] font-medium text-white shadow-sm cursor-move ${style.header}`}
 onPointerDown={handleDragPointerDown}
 onPointerMove={handleDragPointerMove}
 onPointerUp={handleDragPointerUp}
 >
 {/* Signer / status dot */}
 <span
 className="h-2 w-2 shrink-0 rounded-full bg-red-400"
 style={signerColor ? { background: signerColor } : undefined}
 />
 {/* Type icon */}
 <span className="shrink-0 flex items-center justify-center">
 <TypeIcon type={field.type} className="h-3 w-3" />
 </span>
 {/* Label */}
 <span className="truncate select-none leading-none">{displayLabel}</span>
 {/* Close button */}
 <button
 type="button"
 onPointerDown={(e) => e.stopPropagation()}
 onClick={(e) => { e.stopPropagation(); onDelete(field.id) }}
 className="ml-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm hover:bg-white/20"
 aria-label="Delete field"
 >
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3 w-3">
 <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
 </svg>
 </button>
 </div>

 {/* Body — the draggable field area */}
 <div
 className={`absolute inset-0 cursor-move border-2 rounded-sm flex items-center justify-center select-none ${style.border} ${style.bg} ${style.text} ${
 isSelected ? "shadow-md" : ""
 }`}
 onPointerDown={handleDragPointerDown}
 onPointerMove={handleDragPointerMove}
 onPointerUp={handleDragPointerUp}
 >
 <TypeIcon type={field.type} className="h-6 w-6 opacity-80" />
 </div>

 {/* Resize handle — single bottom-right, always visible on hover, stronger when selected */}
 <div
 onPointerDown={handleResizePointerDown}
 onClick={(e) => e.stopPropagation()}
 className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-white shadow cursor-se-resize z-10 ${
 isSelected ? "ring-2 ring-zinc-900/70" : "ring-1 ring-zinc-400"
 }`}
 />
 </div>
 )
}
