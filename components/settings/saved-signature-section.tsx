"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { deleteSavedSignatureData } from "@/lib/actions/gdpr"
import { saveSignature } from "@/lib/actions/saved-signature"
import SignaturePad from "@/components/signing/signature-pad"

interface SavedSignatureSectionProps {
  savedSignature: string | null
  userEmail: string
}

/** Convert any image data URL to a PNG data URL via canvas (required by saveSignature). */
function normaliseTopng(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.naturalWidth || img.width
      canvas.height = img.naturalHeight || img.height
      canvas.getContext("2d")!.drawImage(img, 0, 0)
      resolve(canvas.toDataURL("image/png"))
    }
    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = dataUrl
  })
}

export default function SavedSignatureSection({
  savedSignature,
  userEmail,
}: SavedSignatureSectionProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // current displayed signature (optimistic)
  const [currentSig, setCurrentSig] = useState<string | null>(savedSignature)

  // editor state
  const [editing, setEditing] = useState(false)
  const [padValue, setPadValue] = useState<string | null>(null)

  // confirm-delete modal
  const [showConfirm, setShowConfirm] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // SignaturePad save-checkbox wiring (not needed here but required by prop types)
  const saveCheckedRef = useRef(false)

  function openEditor() {
    setPadValue(null)
    setError(null)
    setSuccessMsg(null)
    setEditing(true)
  }

  function cancelEditor() {
    setEditing(false)
    setPadValue(null)
  }

  function handleSave() {
    if (!padValue) {
      setError("กรุณาวาดหรือพิมพ์ลายเซ็นก่อน Please draw, type, or upload a signature first.")
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        // Normalise to PNG — handles JPG/WebP from the upload tab
        const pngDataUrl = padValue.startsWith("data:image/png;base64,")
          ? padValue
          : await normaliseTopng(padValue)

        const result = await saveSignature({ email: userEmail, dataUrl: pngDataUrl })
        if (result.ok) {
          setCurrentSig(pngDataUrl)
          setEditing(false)
          setPadValue(null)
          setSuccessMsg("บันทึกลายเซ็นเรียบร้อยแล้ว Signature saved.")
          setTimeout(() => setSuccessMsg(null), 3000)
          router.refresh()
        } else {
          setError(result.error ?? "เกิดข้อผิดพลาด Failed to save")
        }
      } catch {
        setError("เกิดข้อผิดพลาดในการแปลงไฟล์ Failed to process image.")
      }
    })
  }

  function handleConfirmDelete() {
    startTransition(async () => {
      const result = await deleteSavedSignatureData()
      if (result.ok) {
        setCurrentSig(null)
        setShowConfirm(false)
        setEditing(false)
        router.refresh()
      } else {
        setError(result.error ?? "เกิดข้อผิดพลาด Failed to delete")
        setShowConfirm(false)
      }
    })
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-800">
          ลายเซ็นที่บันทึกไว้ Saved Signature
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          ลายเซ็นนี้จะถูกโหลดอัตโนมัติเมื่อคุณลงนามเอกสารครั้งถัดไป
          <span className="ml-1 text-slate-400">Pre-loaded on your next signing page.</span>
        </p>
      </div>

      <div className="px-6 py-5 flex flex-col gap-4">

        {/* ── Editor mode ── */}
        {editing ? (
          <>
            <SignaturePad
              value={padValue}
              onChange={setPadValue}
              disabled={isPending}
              savedSignature={null}
              onSaveChange={(v) => { saveCheckedRef.current = v }}
              saveChecked={false}
            />
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={cancelEditor}
                disabled={isPending}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                ยกเลิก Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending || !padValue}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? "กำลังบันทึก..." : "บันทึกลายเซ็น Save Signature"}
              </button>
            </div>
          </>
        ) : currentSig ? (
          /* ── Preview mode ── */
          <>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentSig}
                alt="Saved signature preview"
                className="mx-auto h-32 w-full max-w-sm object-contain p-3"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                disabled={isPending}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50"
              >
                ลบลายเซ็น Delete
              </button>
              <button
                type="button"
                onClick={openEditor}
                disabled={isPending}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                แก้ไข Edit Signature
              </button>
            </div>
          </>
        ) : (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-slate-400">
            <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a4 4 0 01-2.828 1.172H7v-2a4 4 0 011.172-2.828z" />
            </svg>
            <p className="text-sm">ยังไม่มีลายเซ็นที่บันทึก No saved signature yet.</p>
            <button
              type="button"
              onClick={openEditor}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              + เพิ่มลายเซ็น Add Signature
            </button>
          </div>
        )}

        {/* Feedback messages */}
        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
        )}
        {successMsg && (
          <p className="rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{successMsg}</p>
        )}
      </div>

      {/* Confirm delete modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-slate-800">
              ยืนยันการลบ Confirm Deletion
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              ลายเซ็นที่บันทึกไว้จะถูกลบออกจากระบบ คุณสามารถบันทึกใหม่ได้ทุกเมื่อ
              <br />
              <span className="text-slate-400">Your saved signature will be permanently removed. You can add a new one any time.</span>
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                ยกเลิก Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "กำลังลบ..." : "ลบ Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
