"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import dynamic from "next/dynamic"
import type { FieldType } from "@/lib/actions/field"
import { MAX_PAGE_WIDTH } from "@/lib/field-constants"

const PdfDocument = dynamic(
 () => import("react-pdf").then((m) => ({ default: m.Document })),
 { ssr: false }
)
const PdfPage = dynamic(
 () => import("react-pdf").then((m) => ({ default: m.Page })),
 { ssr: false }
)

// Worker setup — served from public/ to comply with CSP
if (typeof window !== "undefined") {
 import("react-pdf").then(({ pdfjs }) => {
 pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
 })
}

export type SigningField = {
 id: string
 type: FieldType
 page: number
 x: number
 y: number
 width: number
 height: number
 label: string | null
 required: boolean
 options: string[]
}

const TYPE_COLOR: Record<FieldType, string> = {
 SIGNATURE: "border-blue-400 bg-blue-100/60",
 INITIALS: "border-cyan-400 bg-cyan-100/60",
 TEXT: "border-emerald-400 bg-emerald-100/60",
 DATE: "border-violet-400 bg-violet-100/60",
 NUMBER: "border-amber-400 bg-amber-100/60",
 IMAGE: "border-pink-400 bg-pink-100/60",
 CHECKBOX: "border-teal-400 bg-teal-100/60",
 RADIO: "border-indigo-400 bg-indigo-100/60",
 SELECT: "border-orange-400 bg-orange-100/60",
 FILE: "border-rose-400 bg-rose-100/60",
 STAMP: "border-lime-500 bg-lime-100/60",
 PHONE: "border-sky-400 bg-sky-100/60",
 CELLS: "border-fuchsia-400 bg-fuchsia-100/60",
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

interface SigningPdfViewProps {
 url: string
 fields: SigningField[]
 values: Record<string, string | null>
 activeFieldId: string | null
 onFieldClick: (fieldId: string) => void
}

export default function SigningPdfView({
 url,
 fields,
 values,
 activeFieldId,
 onFieldClick,
}: SigningPdfViewProps) {
 const containerRef = useRef<HTMLDivElement>(null)
 const [numPages, setNumPages] = useState(0)
 const [pageWidth, setPageWidth] = useState(MAX_PAGE_WIDTH)

 const measure = useCallback(() => {
 if (!containerRef.current) return
 setPageWidth(Math.min(containerRef.current.clientWidth, MAX_PAGE_WIDTH))
 }, [])

 const onDocumentLoad = useCallback(
 ({ numPages: n }: { numPages: number }) => {
 setNumPages(n)
 measure()
 },
 [measure]
 )

 useEffect(() => {
 measure()
 const ro = new ResizeObserver(measure)
 if (containerRef.current) ro.observe(containerRef.current)
 return () => ro.disconnect()
 }, [measure])

 return (
 <div
 ref={containerRef}
 className="flex flex-col items-center overflow-hidden rounded-xl border border-zinc-200"
 >
 <PdfDocument
 file={url}
 onLoadSuccess={onDocumentLoad}
 loading={<div className="flex h-96 items-center justify-center text-sm text-zinc-400">Loading PDF…</div>}
 error={<div className="flex h-40 items-center justify-center text-sm text-red-500">Failed to load PDF.</div>}
 >
 {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
 const pageFields = fields.filter((f) => f.page === pageNum)

 return (
 <div
 key={pageNum}
 className="relative border-b border-zinc-200 last:border-0"
 style={{ width: pageWidth }}
 >
 <PdfPage
 pageNumber={pageNum}
 width={pageWidth}
 renderAnnotationLayer={false}
 renderTextLayer={false}
 />

 {pageFields.map((field) => {
 const val = values[field.id]
 const filled = !!val
 const isActive = activeFieldId === field.id
 const isImageType = field.type === "SIGNATURE" || field.type === "INITIALS" || field.type === "STAMP" || field.type === "IMAGE"

 return (
 <div
 key={field.id}
 onClick={() => onFieldClick(field.id)}
 style={{
 left: `${field.x}%`,
 top: `${field.y}%`,
 width: `${field.width}%`,
 height: `${field.height}%`,
 }}
 className={`absolute cursor-pointer rounded-sm border-2 transition ${TYPE_COLOR[field.type]} ${
 isActive ? "ring-2 ring-zinc-900 ring-offset-1" : ""
 }`}
 >
 {filled && isImageType ? (
 // eslint-disable-next-line @next/next/no-img-element
 <img src={val!} alt={field.type} className="h-full w-full object-contain" />
 ) : (
 <span className="pointer-events-none flex h-full items-center justify-center px-1 text-center text-[10px] font-medium text-zinc-600 select-none leading-tight">
 {filled ? (field.type === "CHECKBOX" ? "✓" : val) : (field.label ?? TYPE_LABEL[field.type])}
 </span>
 )}
 </div>
 )
 })}
 </div>
 )
 })}
 </PdfDocument>
 </div>
 )
}
