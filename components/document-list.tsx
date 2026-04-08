"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { deleteDocument } from "@/lib/actions/document"
import type { DocumentItem } from "@/lib/actions/document"

const STATUS_LABEL: Record<string, string> = {
 DRAFT: "Draft",
 PENDING: "Pending",
 COMPLETED: "Completed",
 VOIDED: "Voided",
}

const STATUS_CLASS: Record<string, string> = {
 DRAFT: "bg-slate-100 text-slate-600",
 PENDING: "bg-amber-100 text-amber-700",
 COMPLETED: "bg-emerald-100 text-emerald-700",
 VOIDED: "bg-red-100 text-red-600",
}

const ALL_STATUSES = ["DRAFT", "PENDING", "COMPLETED", "VOIDED"] as const

function formatBytes(bytes: number) {
 if (bytes < 1024) return `${bytes} B`
 if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
 return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

interface Props {
 initialDocuments: DocumentItem[]
 totalPages: number
 currentPage: number
 currentStatus?: string
 currentSearch?: string
}

export default function DocumentList({
 initialDocuments,
 totalPages,
 currentPage,
 currentStatus,
 currentSearch,
}: Props) {
 const router = useRouter()
 const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments)
 const [confirmId, setConfirmId] = useState<string | null>(null)
 const [isPending, startTransition] = useTransition()
 const [search, setSearch] = useState(currentSearch ?? "")
 const [statusFilter, setStatusFilter] = useState<string>(currentStatus ?? "ALL")

 function navigate(overrides: { page?: number; status?: string; search?: string }) {
   const params = new URLSearchParams()
   const page = overrides.page ?? currentPage
   const status = overrides.status ?? statusFilter
   const q = overrides.search ?? search

   if (page > 1) params.set("page", String(page))
   if (status && status !== "ALL") params.set("status", status)
   if (q) params.set("search", q)

   const qs = params.toString()
   router.push(`/dashboard${qs ? `?${qs}` : ""}`)
 }

 function handleStatusChange(value: string) {
   setStatusFilter(value)
   navigate({ status: value, page: 1 })
 }

 function handleSearch() {
   navigate({ search, page: 1 })
 }

 function handleDelete(id: string) {
   startTransition(async () => {
     const result = await deleteDocument(id)
     if (result.ok) {
       setDocuments((prev) => prev.filter((d) => d.id !== id))
     }
     setConfirmId(null)
   })
 }

 return (
   <>
     {/* Filters */}
     <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
       <form
         className="relative flex-1"
         onSubmit={(e) => { e.preventDefault(); handleSearch() }}
       >
         <svg
           className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
           style={{ color: "var(--accent, #ADB5BD)" }}
           fill="none" stroke="currentColor" viewBox="0 0 24 24"
         >
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
         </svg>
         <input
           type="text"
           placeholder="Search documents…"
           value={search}
           onChange={(e) => setSearch(e.target.value)}
           onBlur={handleSearch}
           className="w-full rounded-lg bg-white py-2.5 pl-9 pr-3 text-sm outline-none"
           style={{ border: "1px solid var(--border, #E5E7EB)", color: "var(--foreground, #212529)" }}
         />
       </form>
       <select
         value={statusFilter}
         onChange={(e) => handleStatusChange(e.target.value)}
         className="rounded-lg bg-white px-3 py-2.5 text-sm outline-none"
         style={{ border: "1px solid var(--border, #E5E7EB)", color: "var(--foreground, #212529)" }}
       >
         <option value="ALL">All statuses</option>
         {ALL_STATUSES.map((s) => (
           <option key={s} value={s}>{STATUS_LABEL[s]}</option>
         ))}
       </select>
     </div>

     {/* Empty states */}
     {documents.length === 0 && !currentSearch && !currentStatus ? (
       <div className="rounded-xl border-2 border-dashed py-20 text-center" style={{ borderColor: "var(--border, #E5E7EB)" }}>
         <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "var(--secondary, #F1F3F5)" }}>
           <svg className="h-7 w-7" style={{ color: "var(--accent, #ADB5BD)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
               d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
           </svg>
         </div>
         <p className="text-sm font-semibold" style={{ color: "var(--foreground, #212529)" }}>No documents yet</p>
         <p className="mt-1 text-xs" style={{ color: "var(--accent, #ADB5BD)" }}>Upload your first PDF to get started</p>
         <Link
           href="/dashboard/upload"
           className="mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
           style={{ background: "var(--primary, #0F1059)" }}
         >
           Upload document
         </Link>
       </div>
     ) : documents.length === 0 ? (
       <div className="rounded-xl border-2 border-dashed py-14 text-center" style={{ borderColor: "var(--border, #E5E7EB)" }}>
         <p className="text-sm" style={{ color: "var(--accent, #ADB5BD)" }}>No documents match your filters.</p>
       </div>
     ) : (
       <>
         {/* Mobile: Card list */}
         <div className="flex flex-col gap-3 sm:hidden">
           {documents.map((doc) => (
             <div
               key={doc.id}
               className="rounded-xl bg-white p-4 shadow-sm"
               style={{ border: "1px solid var(--border, #E5E7EB)" }}
             >
               <div className="flex items-start justify-between gap-3">
                 <div className="min-w-0 flex-1">
                   <Link
                     href={`/dashboard/documents/${doc.id}`}
                     className="line-clamp-2 text-sm font-semibold leading-snug"
                     style={{ color: "var(--primary, #0F1059)" }}
                   >
                     {doc.name}
                   </Link>
                   <p className="mt-1 text-xs" style={{ color: "var(--accent, #ADB5BD)" }} suppressHydrationWarning>
                     {formatBytes(doc.size)} · {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(doc.createdAt))}
                   </p>
                 </div>
                 <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[doc.status] ?? ""}`}>
                   {STATUS_LABEL[doc.status] ?? doc.status}
                 </span>
               </div>
               <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--border, #E5E7EB)" }}>
                 <span className="text-xs" style={{ color: "var(--accent, #ADB5BD)" }}>
                   {doc.totalSigners === 0 ? "No signers" : (
                     <span style={{ color: doc.signedCount === doc.totalSigners ? "var(--success, #198754)" : "var(--accent, #ADB5BD)" }}>
                       {doc.signedCount}/{doc.totalSigners} signed
                     </span>
                   )}
                 </span>
                 <div className="flex items-center gap-4">
                   <Link
                     href={`/dashboard/documents/${doc.id}`}
                     className="text-xs font-medium"
                     style={{ color: "var(--primary, #0F1059)" }}
                   >
                     View →
                   </Link>
                   <button
                     onClick={() => setConfirmId(doc.id)}
                     className="text-xs font-medium"
                     style={{ color: "var(--danger, #DC3545)" }}
                   >
                     Delete
                   </button>
                 </div>
               </div>
             </div>
           ))}
         </div>

         {/* Desktop: Table */}
         <div className="hidden overflow-hidden rounded-xl sm:block" style={{ border: "1px solid var(--border, #E5E7EB)" }}>
           <table className="w-full text-sm">
             <thead>
               <tr style={{ borderBottom: "1px solid var(--border, #E5E7EB)", background: "var(--secondary, #F1F3F5)" }}>
                 <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent, #ADB5BD)" }}>Name</th>
                 <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent, #ADB5BD)" }}>Size</th>
                 <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent, #ADB5BD)" }}>Status</th>
                 <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent, #ADB5BD)" }}>Signers</th>
                 <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent, #ADB5BD)" }}>Uploaded</th>
                 <th className="px-4 py-3" />
               </tr>
             </thead>
             <tbody>
               {documents.map((doc) => (
                 <tr
                   key={doc.id}
                   className="transition-colors hover:bg-slate-50"
                   style={{ borderBottom: "1px solid var(--border, #E5E7EB)" }}
                 >
                   <td className="px-4 py-3 font-medium">
                     <Link
                       href={`/dashboard/documents/${doc.id}`}
                       className="hover:underline hover:underline-offset-4"
                       style={{ color: "var(--primary, #0F1059)" }}
                     >
                       {doc.name}
                     </Link>
                   </td>
                   <td className="px-4 py-3" style={{ color: "var(--accent, #ADB5BD)" }}>{formatBytes(doc.size)}</td>
                   <td className="px-4 py-3">
                     <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[doc.status] ?? ""}`}>
                       {STATUS_LABEL[doc.status] ?? doc.status}
                     </span>
                   </td>
                   <td className="px-4 py-3">
                     {doc.totalSigners === 0 ? (
                       <span style={{ color: "var(--border, #E5E7EB)" }}>—</span>
                     ) : (
                       <span style={{ color: doc.signedCount === doc.totalSigners ? "var(--success, #198754)" : "var(--accent, #ADB5BD)" }}>
                         {doc.signedCount}/{doc.totalSigners}
                       </span>
                     )}
                   </td>
                   <td className="px-4 py-3" style={{ color: "var(--accent, #ADB5BD)" }} suppressHydrationWarning>
                     {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(doc.createdAt))}
                   </td>
                   <td className="px-4 py-3">
                     <div className="flex items-center justify-end gap-3">
                       <Link
                         href={`/dashboard/documents/${doc.id}`}
                         className="text-xs font-medium transition-opacity hover:opacity-70"
                         style={{ color: "var(--primary, #0F1059)" }}
                       >
                         View →
                       </Link>
                       <button
                         onClick={() => setConfirmId(doc.id)}
                         className="text-xs font-medium transition-opacity hover:opacity-70"
                         style={{ color: "var(--danger, #DC3545)" }}
                       >
                         Delete
                       </button>
                     </div>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>

         {/* Pagination */}
         {totalPages > 1 && (
           <div className="mt-4 flex items-center justify-between">
             <p className="text-xs" style={{ color: "var(--accent, #ADB5BD)" }}>
               Page {currentPage} of {totalPages}
             </p>
             <div className="flex gap-2">
               <button
                 onClick={() => navigate({ page: currentPage - 1 })}
                 disabled={currentPage <= 1}
                 className="rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-40"
                 style={{ border: "1px solid var(--border, #E5E7EB)", color: "var(--foreground, #212529)" }}
               >
                 Previous
               </button>
               <button
                 onClick={() => navigate({ page: currentPage + 1 })}
                 disabled={currentPage >= totalPages}
                 className="rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-40"
                 style={{ border: "1px solid var(--border, #E5E7EB)", color: "var(--foreground, #212529)" }}
               >
                 Next
               </button>
             </div>
           </div>
         )}
       </>
     )}

     {/* Confirm delete modal */}
     {confirmId && (
       <>
         <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmId(null)} />
         <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
           <div
             className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl"
             style={{ border: "1px solid var(--border, #E5E7EB)" }}
           >
             <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-100">
               <svg className="h-5 w-5" style={{ color: "var(--danger, #DC3545)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                   d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
               </svg>
             </div>
             <h3 className="text-base font-semibold" style={{ color: "var(--foreground, #212529)" }}>
               Delete document?
             </h3>
             <p className="mt-1.5 text-sm" style={{ color: "var(--accent, #ADB5BD)" }}>
               This will permanently delete the document, all fields, and signer data. This action cannot be undone.
             </p>
             <div className="mt-5 flex gap-2">
               <button
                 onClick={() => setConfirmId(null)}
                 disabled={isPending}
                 className="flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors hover:bg-slate-50 disabled:opacity-40"
                 style={{ border: "1px solid var(--border, #E5E7EB)", color: "var(--foreground, #212529)" }}
               >
                 Cancel
               </button>
               <button
                 onClick={() => handleDelete(confirmId)}
                 disabled={isPending}
                 className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                 style={{ background: "var(--danger, #DC3545)" }}
               >
                 {isPending && (
                   <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                   </svg>
                 )}
                 Delete
               </button>
             </div>
           </div>
         </div>
       </>
     )}
   </>
 )
}
