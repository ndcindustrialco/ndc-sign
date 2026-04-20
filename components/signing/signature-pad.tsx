"use client"

import { useRef, useState, useEffect, useCallback } from "react"

type Tab = "draw" | "type"

interface SignaturePadProps {
 value: string | null
 onChange: (value: string | null) => void
 disabled?: boolean
 /** Saved signature data URL from DB — shown as "Use saved" option */
 savedSignature?: string | null
 onSaveChange?: (save: boolean) => void
 saveChecked?: boolean
}

const FONTS = [
 { label: "Script", value: "'Dancing Script', cursive" },
 { label: "Serif", value: "'Playfair Display', serif" },
 { label: "Sans", value: "'Helvetica Neue', sans-serif" },
]

export default function SignaturePad({
 value,
 onChange,
 disabled = false,
 savedSignature,
 onSaveChange,
 saveChecked = false,
}: SignaturePadProps) {
 const [tab, setTab] = useState<Tab>("draw")
 const [typedText, setTypedText] = useState("")
 const [selectedFont, setSelectedFont] = useState(FONTS[0]!.value)
 const [usingSaved, setUsingSaved] = useState(false)
 const [drawIsEmpty, setDrawIsEmpty] = useState(true)

 const canvasRef = useRef<HTMLCanvasElement>(null)
 const typeCanvasRef = useRef<HTMLCanvasElement>(null)
 const isDrawing = useRef(false)
 // Keep latest onChange in a ref so effects never need it as a dependency
 const onChangeRef = useRef(onChange)
 useEffect(() => { onChangeRef.current = onChange })

 // Load existing draw value onto canvas on mount only
 useEffect(() => {
 if (!value || !canvasRef.current) return
 const ctx = canvasRef.current.getContext("2d")
 if (!ctx) return
 const img = new Image()
 img.onload = () => {
 ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)
 ctx.drawImage(img, 0, 0)
 setDrawIsEmpty(false)
 }
 img.src = value
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [])

 // Render typed text to hidden canvas → emit data URL
 useEffect(() => {
 if (tab !== "type" || !typeCanvasRef.current) return
 const canvas = typeCanvasRef.current
 const ctx = canvas.getContext("2d")!
 ctx.clearRect(0, 0, canvas.width, canvas.height)
 if (!typedText.trim()) {
 onChangeRef.current(null)
 return
 }
 ctx.font = `48px ${selectedFont}`
 ctx.fillStyle = "#1a1a1a"
 ctx.textBaseline = "middle"
 ctx.fillText(typedText, 20, canvas.height / 2)
 onChangeRef.current(trimCanvasToDataUrl(canvas))
 }, [typedText, selectedFont, tab])

 // Trim transparent padding around ink — returns a PNG data URL
 // sized to the actual signature bounds (preserves aspect ratio downstream).
 function trimCanvasToDataUrl(source: HTMLCanvasElement): string | null {
 const ctx = source.getContext("2d")
 if (!ctx) return null
 const { width, height } = source
 const { data } = ctx.getImageData(0, 0, width, height)

 let top = height, left = width, right = 0, bottom = 0
 let hasPixel = false
 for (let y = 0; y < height; y++) {
 for (let x = 0; x < width; x++) {
 const alpha = data[(y * width + x) * 4 + 3]!
 if (alpha === 0) continue
 hasPixel = true
 if (x < left) left = x
 if (x > right) right = x
 if (y < top) top = y
 if (y > bottom) bottom = y
 }
 }
 if (!hasPixel) return null

 const pad = 4
 const cropX = Math.max(0, left - pad)
 const cropY = Math.max(0, top - pad)
 const cropW = Math.min(width - cropX, right - left + 1 + pad * 2)
 const cropH = Math.min(height - cropY, bottom - top + 1 + pad * 2)

 const out = window.document.createElement("canvas")
 out.width = cropW
 out.height = cropH
 out.getContext("2d")!.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
 return out.toDataURL("image/png")
 }

 // ---- Draw handlers ----
 function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
 const rect = canvasRef.current!.getBoundingClientRect()
 return {
 x: (e.clientX - rect.left) * (canvasRef.current!.width / rect.width),
 y: (e.clientY - rect.top) * (canvasRef.current!.height / rect.height),
 }
 }

 function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
 if (disabled) return
 e.currentTarget.setPointerCapture(e.pointerId)
 isDrawing.current = true
 const ctx = canvasRef.current!.getContext("2d")!
 const { x, y } = getPos(e)
 ctx.beginPath()
 ctx.moveTo(x, y)
 }

 function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
 if (!isDrawing.current || disabled) return
 const ctx = canvasRef.current!.getContext("2d")!
 ctx.strokeStyle = "#1a1a1a"
 ctx.lineWidth = 2.5
 ctx.lineCap = "round"
 ctx.lineJoin = "round"
 const { x, y } = getPos(e)
 ctx.lineTo(x, y)
 ctx.stroke()
 }

 function onPointerUp() {
 if (!isDrawing.current) return
 isDrawing.current = false
 const dataUrl = trimCanvasToDataUrl(canvasRef.current!)
 setDrawIsEmpty(!dataUrl)
 onChangeRef.current(dataUrl)
 }

 const clearDraw = useCallback(() => {
 const canvas = canvasRef.current
 if (!canvas) return
 canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height)
 setDrawIsEmpty(true)
 onChangeRef.current(null)
 }, [])

 function useSaved() {
 if (!savedSignature) return
 setUsingSaved(true)
 onChangeRef.current(savedSignature)
 }

 function clearSaved() {
 setUsingSaved(false)
 onChangeRef.current(null)
 }

 function switchTab(t: Tab) {
 setTab(t)
 setUsingSaved(false)
 onChange(null)
 if (t === "draw") {
 // clear canvas on next tick after render
 setTimeout(() => {
 const canvas = canvasRef.current
 if (canvas) canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height)
 setDrawIsEmpty(true)
 }, 0)
 } else {
 setTypedText("")
 }
 }

 // ---- Using saved ----
 if (usingSaved && savedSignature) {
 return (
 <div className="flex flex-col gap-2">
 <div className="relative overflow-hidden rounded-lg border-2 border-zinc-200 bg-white">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={savedSignature} alt="Saved signature" className="h-30 w-full object-contain p-2" />
 <span className="absolute right-2 top-2 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
 บันทึกแล้ว Saved
 </span>
 </div>
 <div className="flex items-center justify-between">
 <button type="button" onClick={clearSaved} className="text-xs text-zinc-500 hover:text-zinc-900">
 ใช้ลายเซ็นอื่น Use different signature
 </button>
 </div>
 {onSaveChange && (
 <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-500 select-none">
 <input type="checkbox" checked={saveChecked} onChange={(e) => onSaveChange(e.target.checked)} className="rounded" />
 อัปเดตลายเซ็นที่บันทึก Update saved signature
 </label>
 )}
 </div>
 )
 }

 return (
 <div className="flex flex-col gap-2">
 {/* Tab bar */}
 <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
 {(["draw", "type"] as Tab[]).map((t) => (
 <button
 key={t}
 type="button"
 onClick={() => switchTab(t)}
 className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${
 tab === t
 ? "bg-white shadow-sm text-zinc-900"
 : "text-zinc-500 hover:text-zinc-700"
 }`}
 >
 {t === "draw" ? "✍️ วาด Draw" : "T พิมพ์ Type"}
 </button>
 ))}
 </div>

 {/* ---- Draw ---- */}
 {tab === "draw" && (
 <>
 <div className={`relative rounded-lg border-2 bg-white ${drawIsEmpty && !disabled ? "border-dashed border-zinc-300" : "border-zinc-200"}`}>
 <canvas
 ref={canvasRef}
 width={560}
 height={180}
 onPointerDown={onPointerDown}
 onPointerMove={onPointerMove}
 onPointerUp={onPointerUp}
 className={`h-30 w-full rounded-lg ${disabled ? "cursor-default" : "cursor-crosshair"}`}
 style={{ touchAction: "none" }}
 />
 {drawIsEmpty && !disabled && (
 <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-zinc-400 select-none">
 วาดลายเซ็นที่นี่ Draw your signature here
 </p>
 )}
 </div>
 <div className="flex items-center justify-between">
 <button type="button" onClick={clearDraw} disabled={drawIsEmpty || disabled} className="text-xs text-zinc-500 hover:text-zinc-900 disabled:opacity-30">
 ล้าง Clear
 </button>
 {savedSignature && (
 <button type="button" onClick={useSaved} className="text-xs font-medium text-blue-600 hover:text-blue-700">
 ใช้ลายเซ็นที่บันทึกไว้ Use saved
 </button>
 )}
 </div>
 </>
 )}

 {/* ---- Type ---- */}
 {tab === "type" && (
 <>
 <div className="rounded-lg border-2 border-zinc-200 bg-white">
 <input
 type="text"
 value={typedText}
 onChange={(e) => setTypedText(e.target.value)}
 placeholder="พิมพ์ชื่อ Type your name…"
 disabled={disabled}
 className="w-full border-none bg-transparent px-3 pt-3 text-sm outline-none placeholder:text-zinc-400"
 />
 {/* Live font preview */}
 <div
 className="h-18 overflow-hidden px-3 pb-2"
 style={{ fontFamily: selectedFont, fontSize: "36px", color: "#1a1a1a", lineHeight: "70px" }}
 >
 {typedText || <span style={{ fontSize: "14px", color: "#a1a1aa", fontFamily: "inherit" }}>ตัวอย่าง Preview</span>}
 </div>
 </div>
 {/* Hidden canvas used to convert typed text to PNG */}
 <canvas ref={typeCanvasRef} width={560} height={100} className="hidden" />
 {/* Font selector */}
 <div className="flex gap-2">
 {FONTS.map((f) => (
 <button
 key={f.value}
 type="button"
 onClick={() => setSelectedFont(f.value)}
 className={`rounded-lg border px-3 py-1 text-xs transition ${
 selectedFont === f.value
 ? "border-zinc-900 bg-zinc-900 text-white"
 : "border-zinc-200 text-zinc-500 hover:border-zinc-400"
 }`}
 style={{ fontFamily: f.value }}
 >
 {f.label}
 </button>
 ))}
 </div>
 <div className="flex items-center justify-between">
 <button type="button" onClick={() => setTypedText("")} disabled={!typedText || disabled} className="text-xs text-zinc-500 hover:text-zinc-900 disabled:opacity-30">
 ล้าง Clear
 </button>
 {savedSignature && (
 <button type="button" onClick={useSaved} className="text-xs font-medium text-blue-600 hover:text-blue-700">
 ใช้ลายเซ็นที่บันทึกไว้ Use saved
 </button>
 )}
 </div>
 </>
 )}

 {/* Save checkbox */}
 {onSaveChange && (
 <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-500 select-none">
 <input type="checkbox" checked={saveChecked} onChange={(e) => onSaveChange(e.target.checked)} className="rounded" />
 บันทึกลายเซ็นไว้ใช้ต่อ Save for future documents
 </label>
 )}
 </div>
 )
}
