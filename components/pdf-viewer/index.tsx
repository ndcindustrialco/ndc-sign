"use client"

import { useRef, useState, useTransition, useEffect } from "react"
import dynamic from "next/dynamic"
import type { FieldItem, FieldType } from "@/lib/actions/field"
import { createField, updateField, deleteField } from "@/lib/actions/field"
import { FIELD_DEFAULTS, MAX_PAGE_WIDTH } from "@/lib/field-constants"
import FieldItemComponent from "./field-item"
import FieldPanel, { SIGNER_COLORS } from "./field-panel"
import FieldPropertiesPanel from "@/components/field-properties-panel"

const PdfDocument = dynamic(
 () => import("react-pdf").then((m) => ({ default: m.Document })),
 { ssr: false }
)
const PdfPage = dynamic(
 () => import("react-pdf").then((m) => ({ default: m.Page })),
 { ssr: false }
)

if (typeof window !== "undefined") {
 import("react-pdf").then(({ pdfjs }) => {
 pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
 })
}

export type PdfViewerSigner = {
 id: string
 name: string
}

interface PdfViewerProps {
 documentId: string
 url: string
 initialFields: FieldItem[]
 signers?: PdfViewerSigner[]
 onAddSigner: () => void
 onRemoveSigner: (id: string) => void
 selfSignMode?: boolean
}

// ---------------------------------------------------------------------------
// PageFieldLayer — must be defined at module level to keep stable identity
// ---------------------------------------------------------------------------

interface PageFieldLayerProps {
 pageNum: number
 pageWidth: number
 cursor: string
 fields: FieldItem[]
 selectedId: string | null
 signerColorMap: Map<string, string>
 /** Active field type (drives drag-to-draw mode). `null` = selection/deselect only */
 drawingType: FieldType | null
 /** Called on empty-space click (no drag) to clear selection */
 onEmptyClick: () => void
 /** Called when user completes a drag-to-draw on an empty area */
 onDrawComplete: (pageNum: number, rect: { x: number; y: number; width: number; height: number }) => void
 onSelect: (id: string) => void
 onTap: (id: string) => void
 onUpdate: (id: string, patch: Partial<Pick<FieldItem, "x" | "y" | "width" | "height">>) => void
 onUpdateCommit: (id: string) => void
 onDelete: (id: string) => void
 onRegisterRef: (pageNum: number, el: HTMLDivElement | null) => void
}

type DrawState = { startX: number; startY: number; curX: number; curY: number; pointerId: number }

function PageFieldLayer({
 pageNum,
 pageWidth,
 cursor,
 fields,
 selectedId,
 signerColorMap,
 drawingType,
 onEmptyClick,
 onDrawComplete,
 onSelect,
 onTap,
 onUpdate,
 onUpdateCommit,
 onDelete,
 onRegisterRef,
}: PageFieldLayerProps) {
 const containerRef = useRef<HTMLDivElement>(null)
 const [draw, setDraw] = useState<DrawState | null>(null)
 const pageFields = fields.filter((f) => f.page === pageNum)

 // Pointer-down on empty page area: begin drag-to-draw (if a type is active)
 // or remember starting point for click-to-deselect detection.
 // Field items call e.stopPropagation(), so this only fires on the empty page surface.
 const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
 // Mouse: left button only. Touch/pen: button is 0 too.
 if (e.pointerType === "mouse" && e.button !== 0) return
 if (!containerRef.current) return
 // If no type selected, don't capture — allow native scroll on mobile.
 // We still track the start point for tap-to-deselect on pointer up.
 const rect = containerRef.current.getBoundingClientRect()
 const xPct = ((e.clientX - rect.left) / rect.width) * 100
 const yPct = ((e.clientY - rect.top) / rect.height) * 100
 if (drawingType) {
 e.currentTarget.setPointerCapture(e.pointerId)
 e.preventDefault()
 }
 setDraw({ startX: xPct, startY: yPct, curX: xPct, curY: yPct, pointerId: e.pointerId })
 }

 const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
 if (!draw || !containerRef.current) return
 const rect = containerRef.current.getBoundingClientRect()
 const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
 const yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
 setDraw({ ...draw, curX: xPct, curY: yPct })
 }

 const handlePointerUp = (_e: React.PointerEvent<HTMLDivElement>) => {
 if (!draw) return
 const dx = Math.abs(draw.curX - draw.startX)
 const dy = Math.abs(draw.curY - draw.startY)
 const isTap = dx < 0.8 && dy < 0.8 // very small movement = tap

 if (drawingType) {
 if (isTap) {
 // Short click with a type selected → place default-sized field centered on click
 const def = FIELD_DEFAULTS[drawingType]
 const fx = Math.max(0, Math.min(100 - def.width, draw.startX - def.width / 2))
 const fy = Math.max(0, Math.min(100 - def.height, draw.startY - def.height / 2))
 onDrawComplete(pageNum, { x: fx, y: fy, width: def.width, height: def.height })
 } else {
 // Drag completed → use the drawn rectangle
 const x = Math.min(draw.startX, draw.curX)
 const y = Math.min(draw.startY, draw.curY)
 const width = Math.max(3, dx)
 const height = Math.max(2, dy)
 onDrawComplete(pageNum, { x, y, width, height })
 }
 } else if (isTap) {
 // No type selected + tap on empty area → clear selection
 onEmptyClick()
 }
 setDraw(null)
 }

 // Live preview rectangle during drag
 let previewStyle: React.CSSProperties | null = null
 if (draw && drawingType) {
 const left = Math.min(draw.startX, draw.curX)
 const top = Math.min(draw.startY, draw.curY)
 const width = Math.abs(draw.curX - draw.startX)
 const height = Math.abs(draw.curY - draw.startY)
 if (width > 0.2 || height > 0.2) {
 previewStyle = {
 left: `${left}%`,
 top: `${top}%`,
 width: `${width}%`,
 height: `${height}%`,
 }
 }
 }

 return (
 <div
 ref={(el) => {
 containerRef.current = el
 onRegisterRef(pageNum, el)
 }}
 className={`relative mb-4 shadow-md ${cursor} ${drawingType ? "touch-none" : ""}`}
 onPointerDown={handlePointerDown}
 onPointerMove={handlePointerMove}
 onPointerUp={handlePointerUp}
 onPointerCancel={handlePointerUp}
 >
 <PdfPage
 pageNumber={pageNum}
 width={pageWidth}
 renderAnnotationLayer={false}
 renderTextLayer={false}
 />
 <div className="absolute inset-0 pointer-events-none">
 {pageFields.map((field) => {
 // Sequential index within the same type across the whole document
 const fieldIndex =
 fields.filter((f) => f.type === field.type).findIndex((f) => f.id === field.id) + 1
 return (
 <FieldItemComponent
 key={field.id}
 field={field}
 containerRef={containerRef}
 isSelected={selectedId === field.id}
 onSelect={onSelect}
 onTap={onTap}
 onUpdate={onUpdate}
 onUpdateCommit={onUpdateCommit}
 onDelete={onDelete}
 signerColor={field.signerId ? signerColorMap.get(field.signerId) : undefined}
 fieldIndex={fieldIndex}
 />
 )
 })}

 {/* Live draw preview */}
 {previewStyle && (
 <div
 className="absolute rounded-sm border-2 border-dashed border-blue-500 bg-blue-400/20"
 style={previewStyle}
 />
 )}
 </div>
 </div>
 )
}

// ---------------------------------------------------------------------------
// PdfViewer
// ---------------------------------------------------------------------------

export default function PdfViewer({
 documentId,
 url,
 initialFields,
 signers = [],
 onAddSigner,
 onRemoveSigner,
 selfSignMode = false,
}: PdfViewerProps) {
 const containerRef = useRef<HTMLDivElement>(null)
 const [fields, setFields] = useState<FieldItem[]>(initialFields)
 const fieldsRef = useRef<FieldItem[]>(initialFields)

 const [selectedType, setSelectedType] = useState<FieldType | null>(null)
 const [selectedId, setSelectedId] = useState<string | null>(null)
 const [selectedSignerId, setSelectedSignerId] = useState<string | null>(null)
 const [mobileManualOpen, setMobileManualOpen] = useState(false)

 const [numPages, setNumPages] = useState(1)
 const [pageWidth, setPageWidth] = useState(MAX_PAGE_WIDTH)
 const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
 const [, startTransition] = useTransition()
 const clipboardRef = useRef<FieldItem | null>(null)
 const selectedIdRef = useRef<string | null>(null)

 const signerColorMap = new Map(
 signers.map((s, i) => [s.id, SIGNER_COLORS[i % SIGNER_COLORS.length]!.dot])
 )

 const panelSigners = signers.map((s, i) => ({
 id: s.id,
 name: s.name,
 color: SIGNER_COLORS[i % SIGNER_COLORS.length]!.dot,
 }))

 useEffect(() => {
 if (containerRef.current) {
 setPageWidth(Math.min(containerRef.current.clientWidth, MAX_PAGE_WIDTH))
 }
 }, [])

 const onDocumentLoad = ({ numPages: n }: { numPages: number }) => {
 setNumPages(n)
 if (containerRef.current) {
 setPageWidth(Math.min(containerRef.current.clientWidth, MAX_PAGE_WIDTH))
 }
 }

 const handleTypeChange = (type: FieldType, signerId: string | null) => {
 setSelectedType(type)
 setSelectedSignerId(signerId)
 setSelectedId(null)
 // On mobile: auto-close the sheet so the user can tap the PDF to place the field
 setMobileManualOpen(false)
 }

 const handleRegisterRef = (pageNum: number, el: HTMLDivElement | null) => {
 if (el) pageRefs.current.set(pageNum, el)
 else pageRefs.current.delete(pageNum)
 }

 const handleEmptyClick = () => {
 if (selectedId) setSelectedId(null)
 }

 const handleDrawComplete = (
 pageNum: number,
 rect: { x: number; y: number; width: number; height: number }
 ) => {
 if (!selectedType) return

 // Clamp to page bounds
 const width = Math.max(3, Math.min(rect.width, 100 - rect.x))
 const height = Math.max(2, Math.min(rect.height, 100 - rect.y))
 const fx = Math.max(0, Math.min(100 - width, rect.x))
 const fy = Math.max(0, Math.min(100 - height, rect.y))

 // A signer ID is virtual (not a real DB cuid) if it starts with "placeholder-" or equals "self"
 const isPlaceholder = !selectedSignerId || selectedSignerId.startsWith("placeholder-") || selectedSignerId === "self"
 const dbSignerId = isPlaceholder ? undefined : selectedSignerId
 const displaySignerId = selectedSignerId ?? null
 const partyIndex = isPlaceholder
  ? signers.findIndex((s) => s.id === selectedSignerId)
  : -1
 const partyGroupId = partyIndex >= 0 ? `party:${partyIndex}` : undefined

 const optimistic: FieldItem = {
 id: `optimistic-${Date.now()}`,
 signerId: displaySignerId,
 type: selectedType,
 page: pageNum,
 x: fx, y: fy, width, height,
 label: null, required: true,
 options: [], groupId: partyGroupId ?? null,
 }

 setFields((prev) => { const next = [...prev, optimistic]; fieldsRef.current = next; return next })

 startTransition(async () => {
 const result = await createField({
 documentId,
 signerId: dbSignerId,
 type: selectedType,
 page: pageNum,
 x: fx, y: fy, width, height,
 required: true,
 options: [],
 groupId: partyGroupId,
 })
 if (result.ok) {
 const fieldWithColor: FieldItem = { ...result.data, signerId: displaySignerId }
 setFields((prev) => { const next = prev.map((f) => f.id === optimistic.id ? fieldWithColor : f); fieldsRef.current = next; return next })
 setSelectedId(result.data.id)
 } else {
 setFields((prev) => { const next = prev.filter((f) => f.id !== optimistic.id); fieldsRef.current = next; return next })
 }
 })
 }

 const handleUpdate = (id: string, patch: Partial<Pick<FieldItem, "x" | "y" | "width" | "height">>) => {
 setFields((prev) => { const next = prev.map((f) => f.id === id ? { ...f, ...patch } : f); fieldsRef.current = next; return next })
 }

 const handleUpdateCommit = (id: string) => {
 const field = fieldsRef.current.find((f) => f.id === id)
 if (!field || field.id.startsWith("optimistic-")) return
 startTransition(async () => { await updateField({ id, x: field.x, y: field.y, width: field.width, height: field.height }) })
 }

 const handleDelete = (id: string) => {
 setFields((prev) => { const next = prev.filter((f) => f.id !== id); fieldsRef.current = next; return next })
 setSelectedId(null)
 if (!id.startsWith("optimistic-")) startTransition(async () => { await deleteField(id) })
 }

 const handleDuplicate = (source: FieldItem) => {
 // Offset new field slightly so it's visibly distinguishable
 const OFFSET = 2
 const width = source.width
 const height = source.height
 const nx = Math.max(0, Math.min(100 - width, source.x + OFFSET))
 const ny = Math.max(0, Math.min(100 - height, source.y + OFFSET))

 const isPlaceholder = !source.signerId || source.signerId.startsWith("placeholder-") || source.signerId === "self"
 const dbSignerId = isPlaceholder ? undefined : (source.signerId ?? undefined)
 const displaySignerId = source.signerId
 const srcPartyIndex = isPlaceholder
  ? signers.findIndex((s) => s.id === source.signerId)
  : -1
 const dupPartyGroupId = srcPartyIndex >= 0 ? `party:${srcPartyIndex}` : (source.groupId ?? undefined)

 const optimistic: FieldItem = {
 id: `optimistic-${Date.now()}`,
 signerId: displaySignerId,
 type: source.type,
 page: source.page,
 x: nx, y: ny, width, height,
 label: source.label,
 required: source.required,
 options: [...source.options],
 groupId: dupPartyGroupId ?? null,
 }

 setFields((prev) => { const next = [...prev, optimistic]; fieldsRef.current = next; return next })
 setSelectedId(optimistic.id)

 startTransition(async () => {
 const result = await createField({
 documentId,
 signerId: dbSignerId,
 type: source.type,
 page: source.page,
 x: nx, y: ny, width, height,
 label: source.label ?? undefined,
 required: source.required,
 options: [...source.options],
 groupId: dupPartyGroupId,
 })
 if (result.ok) {
 const fieldWithColor: FieldItem = { ...result.data, signerId: displaySignerId }
 setFields((prev) => { const next = prev.map((f) => f.id === optimistic.id ? fieldWithColor : f); fieldsRef.current = next; return next })
 setSelectedId(result.data.id)
 } else {
 setFields((prev) => { const next = prev.filter((f) => f.id !== optimistic.id); fieldsRef.current = next; return next })
 }
 })
 }

 useEffect(() => {
 selectedIdRef.current = selectedId
 }, [selectedId])

 useEffect(() => {
 const isEditableTarget = (target: EventTarget | null): boolean => {
 if (!(target instanceof HTMLElement)) return false
 const tag = target.tagName
 if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
 if (target.isContentEditable) return true
 return false
 }

 const handler = (e: KeyboardEvent) => {
 if (isEditableTarget(e.target)) return

 const currentId = selectedIdRef.current
 const selected = currentId ? fieldsRef.current.find((f) => f.id === currentId) ?? null : null
 const isMod = e.ctrlKey || e.metaKey

 // Delete / Backspace — remove selected field
 if ((e.key === "Delete" || e.key === "Backspace") && selected) {
 e.preventDefault()
 handleDelete(selected.id)
 return
 }

 // Ctrl/Cmd + C — copy selected field to clipboard
 if (isMod && (e.key === "c" || e.key === "C") && selected) {
 e.preventDefault()
 clipboardRef.current = { ...selected, options: [...selected.options] }
 return
 }

 // Ctrl/Cmd + D — duplicate selected field directly
 if (isMod && (e.key === "d" || e.key === "D") && selected) {
 e.preventDefault()
 handleDuplicate(selected)
 return
 }

 // Ctrl/Cmd + V — paste clipboard field
 if (isMod && (e.key === "v" || e.key === "V") && clipboardRef.current) {
 e.preventDefault()
 handleDuplicate(clipboardRef.current)
 return
 }

 // Escape — clear selection / placement mode
 if (e.key === "Escape") {
 setSelectedId(null)
 setSelectedType(null)
 setSelectedSignerId(null)
 }
 }

 document.addEventListener("keydown", handler)
 return () => document.removeEventListener("keydown", handler)
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [documentId])

 const handleLabelChange = (id: string, label: string | null) => {
 setFields((prev) => { const next = prev.map((f) => f.id === id ? { ...f, label } : f); fieldsRef.current = next; return next })
 }

 const handleRequiredChange = (id: string, required: boolean) => {
 setFields((prev) => { const next = prev.map((f) => f.id === id ? { ...f, required } : f); fieldsRef.current = next; return next })
 }

 const handleFieldSignerChange = (id: string, signerId: string | null) => {
 setFields((prev) => { const next = prev.map((f) => f.id === id ? { ...f, signerId } : f); fieldsRef.current = next; return next })
 }

 const handleOptionsChange = (id: string, options: string[]) => {
 setFields((prev) => { const next = prev.map((f) => f.id === id ? { ...f, options } : f); fieldsRef.current = next; return next })
 }

 const selectedField = selectedId ? (fields.find((f) => f.id === selectedId) ?? null) : null
 const cursor = selectedType ? "cursor-crosshair" : "cursor-default"

 // Show bottom sheet ONLY when the user explicitly opens it (tap "Fields" or "Properties").
 // Never auto-open on field selection — that would cover the field and block drag/resize on mobile.
 const showMobilePanel = mobileManualOpen

 const rightPanel = selectedField ? (
 <FieldPropertiesPanel
 key={selectedField.id}
 field={selectedField}
 signers={panelSigners}
 onLabelChange={handleLabelChange}
 onRequiredChange={handleRequiredChange}
 onSignerChange={handleFieldSignerChange}
 onOptionsChange={handleOptionsChange}
 onDelete={handleDelete}
 onClose={() => { setSelectedId(null); setMobileManualOpen(false) }}
 />
 ) : (
 <FieldPanel
 selectedType={selectedType}
 onTypeChange={handleTypeChange}
 signers={panelSigners}
 selectedSignerId={selectedSignerId}
 onSignerChange={(id) => { setSelectedSignerId(id) }}
 onAddSigner={onAddSigner}
 onRemoveSigner={onRemoveSigner}
 selfSignMode={selfSignMode}
 />
 )

 return (
 <div className="flex h-full flex-col overflow-hidden bg-white lg:flex-row">
 {/* ── PDF area ──────────────────────────────────────────────────────── */}
 <div className="flex flex-1 flex-col overflow-hidden">
 {/* Mobile panel toggle FAB */}
 <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-3 py-1.5 lg:hidden">
 {numPages > 1 && (
 <div className="flex items-center gap-1">
 <span className="text-xs text-zinc-500">Page:</span>
 {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
 <button
 key={p}
 onClick={() => pageRefs.current.get(p)?.scrollIntoView({ behavior: "smooth", block: "start" })}
 className="rounded px-2 py-0.5 text-xs text-zinc-500 hover:bg-zinc-200"
 >
 {p}
 </button>
 ))}
 </div>
 )}
 <div className="ml-auto flex items-center gap-2">
 {/* Properties button — only when a field is selected */}
 {selectedField && (
 <button
 onClick={() => setMobileManualOpen(true)}
 className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700"
 >
 <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
 </svg>
 คุณสมบัติ Properties
 </button>
 )}
 {/* Add Fields button */}
 <button
 onClick={() => { setSelectedId(null); setMobileManualOpen((prev) => !prev) }}
 className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700"
 >
 <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
 </svg>
 {selectedType ? selectedType : "ฟิลด์ Fields"}
 </button>
 </div>
 </div>

 {/* Page nav bar — desktop only */}
 {numPages > 1 && (
 <div className="hidden items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2 lg:flex">
 <span className="text-xs text-zinc-500">Page:</span>
 {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
 <button
 key={p}
 onClick={() => pageRefs.current.get(p)?.scrollIntoView({ behavior: "smooth", block: "start" })}
 className="rounded px-2 py-0.5 text-xs text-zinc-500 hover:bg-zinc-200"
 >
 {p}
 </button>
 ))}
 </div>
 )}

 {/* Scroll area */}
 <div
 ref={containerRef}
 className="flex-1 overflow-y-auto bg-zinc-200"
 onClick={() => setSelectedId(null)}
 >
 <div className="flex flex-col items-center py-4">
 <PdfDocument
 file={url}
 onLoadSuccess={onDocumentLoad}
 loading={<div className="flex h-96 items-center justify-center text-sm text-zinc-400">กำลังโหลด PDF… Loading PDF…</div>}
 error={<div className="flex h-40 items-center justify-center text-sm text-red-500">โหลด PDF ไม่ได้ Failed to load PDF.</div>}
 >
 {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
 <PageFieldLayer
 key={pageNum}
 pageNum={pageNum}
 pageWidth={pageWidth}
 cursor={cursor}
 fields={fields}
 selectedId={selectedId}
 signerColorMap={signerColorMap}
 drawingType={selectedType}
 onEmptyClick={handleEmptyClick}
 onDrawComplete={handleDrawComplete}
 onSelect={(id) => { setSelectedId(id) }}
 onTap={(id) => { setSelectedId(id) }}
 onUpdate={handleUpdate}
 onUpdateCommit={handleUpdateCommit}
 onDelete={handleDelete}
 onRegisterRef={handleRegisterRef}
 />
 ))}
 </PdfDocument>
 </div>
 </div>

 {/* Status bar — shown when a field type is selected and the bottom sheet is closed */}
 {selectedType && !mobileManualOpen && (
 <div className="flex items-center gap-2 border-t border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700 sm:px-4">
 <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500 shrink-0" />
 <span>คลิกค้างแล้วลากบน PDF เพื่อวาด Click and drag on PDF to draw a </span>
 <strong>{selectedType}</strong>
 <span className="hidden sm:inline"> ฟิลด์ field</span>
 <button
 onClick={() => { setSelectedType(null); setSelectedSignerId(null) }}
 className="ml-auto font-medium text-blue-500 hover:text-blue-700"
 >
 ยกเลิก Cancel
 </button>
 </div>
 )}
 </div>

 {/* ── Desktop: Right panel ───────────────────────────────────────────── */}
 <div className="hidden lg:flex">
 {rightPanel}
 </div>

 {/* ── Mobile: Bottom sheet (no backdrop — never blocks PDF) ────────── */}
 {showMobilePanel && (
 <>
 <div className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl lg:hidden">
 {/* Drag handle */}
 <div className="flex justify-center pt-3 pb-1">
 <div className="h-1 w-10 rounded-full bg-zinc-200" />
 </div>
 <div className="flex items-center justify-between px-4 pb-2 pt-1">
 <span className="text-sm font-semibold text-zinc-900">
 {selectedField ? "คุณสมบัติฟิลด์ Field Properties" : "เพิ่มฟิลด์ Add Fields"}
 </span>
 <button
 onClick={() => { setMobileManualOpen(false); setSelectedId(null) }}
 className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100"
 >
 <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>
 {/* Render the panel without its fixed width */}
 <div className="w-full">
 {rightPanel}
 </div>
 </div>
 </>
 )}
 </div>
 )
}
