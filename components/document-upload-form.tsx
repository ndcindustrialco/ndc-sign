"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { uploadDocument } from "@/lib/actions/document"

const MAX_MB = 10
const ALLOWED_TYPE = "application/pdf"

export default function DocumentUploadForm() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null
    setError(null)

    if (!selected) return

    if (selected.type !== ALLOWED_TYPE) {
      setError("Only PDF files are allowed")
      return
    }

    if (selected.size > MAX_MB * 1024 * 1024) {
      setError(`File must be smaller than ${MAX_MB} MB`)
      return
    }

    setFile(selected)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (dropped) {
      const synth = { target: { files: e.dataTransfer.files } } as unknown as React.ChangeEvent<HTMLInputElement>
      handleFileChange(synth)
    }
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)

    startTransition(async () => {
      const result = await uploadDocument(formData)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setFile(null)
      if (inputRef.current) inputRef.current.value = ""
      router.push(`/dashboard/documents/${result.data.id}/edit`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors"
        style={{
          borderColor: file ? "var(--primary, #0F1059)" : "var(--border, #E5E7EB)",
          background: file ? "rgba(15,16,89,0.03)" : "var(--secondary, #F1F3F5)",
        }}
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: file ? "rgba(15,16,89,0.08)" : "var(--border, #E5E7EB)" }}
        >
          <svg
            className="h-6 w-6"
            style={{ color: file ? "var(--primary, #0F1059)" : "var(--accent, #ADB5BD)" }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>

        {file ? (
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--primary, #0F1059)" }}>
              {file.name}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--accent, #ADB5BD)" }}>
              {(file.size / 1024 / 1024).toFixed(2)} MB · Click to change
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--foreground, #212529)" }}>
              Drag & drop PDF here
            </p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--accent, #ADB5BD)" }}>
              or click to browse · max {MAX_MB} MB
            </p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm"
          style={{
            border: "1px solid #FECACA",
            background: "#FEF2F2",
            color: "var(--danger, #DC3545)",
          }}
        >
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!file || isPending}
        className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        style={{ background: "var(--primary, #0F1059)" }}
      >
        {isPending ? (
          <>
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Uploading…
          </>
        ) : (
          "Upload Document"
        )}
      </button>
    </form>
  )
}
