"use client"

import { useState } from "react"

interface FeedbackItem {
  id: string
  category: string
  message: string
  createdAt: Date
  user: {
    name: string | null
    email: string
  }
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  BUG: { label: "แจ้งปัญหา Bug", color: "bg-red-100 text-red-700" },
  FEATURE_REQUEST: { label: "แนะนำฟีเจอร์ Feature", color: "bg-purple-100 text-purple-700" },
  GENERAL: { label: "ทั่วไป General", color: "bg-slate-100 text-slate-700" },
}

interface FeedbackManageClientProps {
  feedbacks: FeedbackItem[]
}

const FeedbackManageClient = ({ feedbacks }: FeedbackManageClientProps) => {
  const [filter, setFilter] = useState("ALL")

  const filtered = filter === "ALL"
    ? feedbacks
    : feedbacks.filter((f) => f.category === filter)

  return (
    <div className="px-4 py-8 md:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            จัดการความคิดเห็น Feedback Management
          </h1>
          <p className="text-sm text-slate-500">
            ดูความคิดเห็นทั้งหมดจากผู้ใช้งาน View all user feedback.
          </p>
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm sm:w-48"
        >
          <option value="ALL">ทั้งหมด All</option>
          <option value="BUG">แจ้งปัญหา Bug</option>
          <option value="FEATURE_REQUEST">แนะนำฟีเจอร์ Feature</option>
          <option value="GENERAL">ทั่วไป General</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16">
          <svg className="mb-3 h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-sm text-slate-500">ยังไม่มีความคิดเห็น No feedback yet.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">ผู้ส่ง User</th>
                  <th className="px-4 py-3">หมวดหมู่ Category</th>
                  <th className="px-4 py-3">ข้อความ Message</th>
                  <th className="px-4 py-3">วันที่ Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((fb) => {
                  const cat = CATEGORY_LABELS[fb.category] ?? CATEGORY_LABELS.GENERAL
                  return (
                    <tr key={fb.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{fb.user.name ?? "-"}</p>
                        <p className="text-xs text-slate-400">{fb.user.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cat.color}`}>
                          {cat.label}
                        </span>
                      </td>
                      <td className="max-w-md px-4 py-3 text-slate-700">
                        <p className="line-clamp-2">{fb.message}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                        {new Date(fb.createdAt).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((fb) => {
              const cat = CATEGORY_LABELS[fb.category] ?? CATEGORY_LABELS.GENERAL
              return (
                <div key={fb.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{fb.user.name ?? "-"}</p>
                      <p className="text-xs text-slate-400">{fb.user.email}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cat.color}`}>
                      {cat.label}
                    </span>
                  </div>
                  <p className="mb-2 text-sm text-slate-700">{fb.message}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(fb.createdAt).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default FeedbackManageClient
