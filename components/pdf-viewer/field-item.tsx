"use client"

import { useRef, useCallback } from "react"
import type { FieldItem, FieldType } from "@/lib/actions/field"

// Resize handle positions
type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw"

const HANDLES: Handle[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"]

const HANDLE_CLASS: Record<Handle, string> = {
 n: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-n-resize",
 s: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-s-resize",
 e: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-e-resize",
 w: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-w-resize",
 ne: "top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-ne-resize",
 nw: "top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nw-resize",
 se: "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-se-resize",
 sw: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-sw-resize",
}

// Per-type visual style (border + background tint)
const TYPE_STYLE: Record<FieldType, string> = {
 SIGNATURE: "border-blue-500 bg-blue-50/80 text-blue-700",
 INITIALS: "border-cyan-500 bg-cyan-50/80 text-cyan-700",
 TEXT: "border-emerald-500 bg-emerald-50/80 text-emerald-700",
 DATE: "border-violet-500 bg-violet-50/80 text-violet-700",
 NUMBER: "border-amber-500 bg-amber-50/80 text-amber-700",
 IMAGE: "border-pink-500 bg-pink-50/80 text-pink-700",
 CHECKBOX: "border-teal-500 bg-teal-50/80 text-teal-700",
 RADIO: "border-indigo-500 bg-indigo-50/80 text-indigo-700",
 SELECT: "border-orange-500 bg-orange-50/80 text-orange-700",
 FILE: "border-rose-500 bg-rose-50/80 text-rose-700",
 STAMP: "border-lime-600 bg-lime-50/80 text-lime-700",
 PHONE: "border-sky-500 bg-sky-50/80 text-sky-700",
 CELLS: "border-fuchsia-500 bg-fuchsia-50/80 text-fuchsia-700",
}

const TYPE_LABEL: Record<FieldType, string> = {
 SIGNATURE: "Signature",
 INITIALS: "Initials",
 TEXT: "Text",
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
}: FieldItemProps) {
 const startRef = useRef<{ x: number; y: number; field: typeof field; moved: boolean } | null>(null)

 // ---------------------------------------------------------------------------
 // Drag (move)
 // ---------------------------------------------------------------------------
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
 // Only start moving after a small threshold (4px) to avoid accidental drags on tap
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
 // Fire onTap if no drag movement occurred (pure tap/click)
 if (wasTap) onTap?.(field.id)
 }, [field.id, onUpdateCommit, onTap])

 // ---------------------------------------------------------------------------
 // Resize
 // ---------------------------------------------------------------------------
 const handleResizePointerDown = useCallback(
 (handle: Handle) => (e: React.PointerEvent) => {
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

 let { x, y, width, height } = f

 if (handle.includes("e")) width = Math.max(3, f.width + dx)
 if (handle.includes("s")) height = Math.max(2, f.height + dy)
 if (handle.includes("w")) {
 width = Math.max(3, f.width - dx)
 x = Math.min(f.x + f.width - 3, f.x + dx)
 }
 if (handle.includes("n")) {
 height = Math.max(2, f.height - dy)
 y = Math.min(f.y + f.height - 2, f.y + dy)
 }

 x = Math.max(0, x)
 y = Math.max(0, y)
 width = Math.min(width, 100 - x)
 height = Math.min(height, 100 - y)

 onUpdate(field.id, { x, y, width, height })
 }

 const onUp = () => {
 startRef.current = null
 window.removeEventListener("pointermove", onMove)
 window.removeEventListener("pointerup", onUp)
 }

 window.addEventListener("pointermove", onMove)
 window.addEventListener("pointerup", onUp)
 },
 [field, containerRef, onUpdate, onSelect]
 )

 const typeStyle = TYPE_STYLE[field.type]

 return (
 <div
 style={{
 left: `${field.x}%`,
 top: `${field.y}%`,
 width: `${field.width}%`,
 height: `${field.height}%`,
 }}
 className={`absolute cursor-move border-2 rounded-sm pointer-events-auto ${typeStyle} ${
 isSelected ? "ring-2 ring-offset-1 ring-zinc-900" : ""
 }`}
 onPointerDown={handleDragPointerDown}
 onPointerMove={handleDragPointerMove}
 onPointerUp={handleDragPointerUp}
 onClick={(e) => { e.stopPropagation(); onSelect(field.id) }}
 >
 {/* Signer color dot */}
 {signerColor && (
 <span
 className="absolute left-0.5 top-0.5 h-2 w-2 rounded-full"
 style={{ background: signerColor }}
 />
 )}

 {/* Label */}
 <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-semibold select-none px-1 text-center leading-tight">
 {field.label ?? TYPE_LABEL[field.type]}
 </span>

 {/* Delete button — only when selected */}
 {isSelected && (
 <button
 onPointerDown={(e) => e.stopPropagation()}
 onClick={(e) => { e.stopPropagation(); onDelete(field.id) }}
 className="absolute -right-3 -top-3 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white shadow hover:bg-red-600 z-10"
 >
 ✕
 </button>
 )}

 {/* Resize handles — only when selected */}
 {isSelected &&
 HANDLES.map((h) => (
 <div
 key={h}
 onPointerDown={handleResizePointerDown(h)}
 onClick={(e) => e.stopPropagation()}
 className={`absolute h-2.5 w-2.5 rounded-sm border border-white bg-zinc-900 z-10 ${HANDLE_CLASS[h]}`}
 />
 ))}
 </div>
 )
}
