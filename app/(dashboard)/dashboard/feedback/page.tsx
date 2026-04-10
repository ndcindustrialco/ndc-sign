"use client"

import { useState } from "react"
import { submitFeedback } from "@/lib/actions/feedback"

const CATEGORIES = [
  { value: "GENERAL", label: "ทั่วไป General" },
  { value: "BUG", label: "แจ้งปัญหา Bug Report" },
  { value: "FEATURE_REQUEST", label: "แนะนำฟีเจอร์ Feature Request" },
] as const

const FeedbackPage = () => {
  const [category, setCategory] = useState("GENERAL")
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setStatus("loading")
    const formData = new FormData()
    formData.set("category", category)
    formData.set("message", message)

    const result = await submitFeedback(formData)
    if (result.success) {
      setStatus("success")
      setMessage("")
      setCategory("GENERAL")
      setTimeout(() => setStatus("idle"), 3000)
    } else {
      setStatus("error")
      setErrorMessage(result.error ?? "เกิดข้อผิดพลาด")
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <h1 className="mb-1 text-xl font-bold text-slate-800">
        ส่งความคิดเห็น Feedback
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        แจ้งปัญหาหรือแนะนำฟีเจอร์ที่ต้องการ Report issues or suggest features.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category */}
        <div>
          <label htmlFor="category" className="mb-1 block text-sm font-medium text-slate-700">
            หมวดหมู่ Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Message */}
        <div>
          <label htmlFor="message" className="mb-1 block text-sm font-medium text-slate-700">
            ข้อความ Message
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            maxLength={2000}
            required
            placeholder="กรุณาอธิบายรายละเอียด..."
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-right text-xs text-slate-400">{message.length}/2000</p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={status === "loading" || !message.trim()}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" ? "กำลังส่ง..." : "ส่งความคิดเห็น Submit"}
        </button>

        {/* Success message */}
        {status === "success" && (
          <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            ส่งความคิดเห็นเรียบร้อยแล้ว Feedback submitted successfully.
          </p>
        )}

        {/* Error message */}
        {status === "error" && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}
      </form>
    </div>
  )
}

export default FeedbackPage
