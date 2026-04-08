"use client"

import { useState, useTransition } from "react"
import { removeSigner } from "@/lib/actions/signer"
import type { SignerItem } from "@/lib/actions/signer"

const STATUS_BADGE = "bg-blue-100 text-blue-700"

const STATUS_CLASS: Record<string, string> = {
 PENDING: "bg-zinc-100 text-zinc-600",
 WAITING: "bg-amber-100 text-amber-700",
 OPENED: "bg-yellow-100 text-yellow-700",
 SIGNED: "bg-green-100 text-green-700",
 DECLINED: "bg-red-100 text-red-600",
}

const STATUS_LABEL: Record<string, string> = {
 PENDING: "Pending",
 WAITING: "Waiting for Others",
 OPENED: "Opened",
 SIGNED: "Signed",
 DECLINED: "Declined",
}

interface SignerListProps {
 initialSigners: SignerItem[]
 newSigners: SignerItem[] // freshly added (have signingUrl)
 onRemoved: (id: string) => void
}

export default function SignerList({ initialSigners, newSigners, onRemoved }: SignerListProps) {
 const [copied, setCopied] = useState<string | null>(null)
 const [isPending, startTransition] = useTransition()
 const [removingId, setRemovingId] = useState<string | null>(null)

 const all = [
 ...initialSigners,
 // Merge in any newly added signers not already in initialSigners
 ...newSigners.filter((n) => !initialSigners.find((s) => s.id === n.id)),
 ].sort((a, b) => a.signingOrder - b.signingOrder || a.order - b.order)

 // Find signing URL for a signer (only available for newly added ones)
 function getUrl(id: string): string | null {
 return newSigners.find((s) => s.id === id)?.signingUrl ?? null
 }

 function copyUrl(id: string, url: string) {
 navigator.clipboard.writeText(url).then(() => {
 setCopied(id)
 setTimeout(() => setCopied(null), 2000)
 })
 }

 function handleRemove(id: string) {
 setRemovingId(id)
 startTransition(async () => {
 const result = await removeSigner(id)
 if (result.ok) {
 onRemoved(id)
 }
 setRemovingId(null)
 })
 }

 if (all.length === 0) {
 return (
 <div className="rounded-xl border border-dashed border-zinc-200 py-10 text-center">
 <svg className="mx-auto mb-3 h-8 w-8 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
 d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
 </svg>
 <p className="text-sm font-medium text-zinc-500">No recipients yet</p>
 <p className="mt-0.5 text-xs text-zinc-400">Add a recipient above to generate a signing link.</p>
 </div>
 )
 }

 // Group by signingOrder to show visual grouping
 const orderGroups = [...new Set(all.map((s) => s.signingOrder))].sort((a, b) => a - b)
 const isMultiGroup = orderGroups.length > 1

 return (
 <div className="overflow-hidden rounded-xl border border-zinc-200">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
 {isMultiGroup && <th className="px-4 py-3">Step</th>}
 <th className="px-4 py-3">Name</th>
 <th className="px-4 py-3">Email</th>
 <th className="px-4 py-3">Action</th>
 <th className="px-4 py-3">Status</th>
 <th className="px-4 py-3">Signing Link</th>
 <th className="px-4 py-3"></th>
 </tr>
 </thead>
 <tbody>
 {all.map((signer, idx) => {
 const url = getUrl(signer.id)
 const prevOrder = idx > 0 ? all[idx - 1]!.signingOrder : null
 const isNewGroup = isMultiGroup && prevOrder !== null && signer.signingOrder !== prevOrder

 return (
 <>
 {isNewGroup && (
 <tr key={`divider-${signer.signingOrder}`}>
 <td colSpan={isMultiGroup ? 7 : 6} className="px-4 py-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 bg-zinc-50 border-t border-zinc-100">
 Then ↓
 </td>
 </tr>
 )}
 <tr
 key={signer.id}
 className="border-b border-zinc-100 last:border-0"
 >
 {isMultiGroup && (
 <td className="px-4 py-3 text-center">
 <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-bold text-white">
 {signer.signingOrder}
 </span>
 </td>
 )}
 <td className="px-4 py-3 font-medium text-zinc-900">
 {signer.name}
 </td>
 <td className="px-4 py-3 text-zinc-500">{signer.email}</td>
 <td className="px-4 py-3">
 <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE}`}>
 Needs to Sign
 </span>
 </td>
 <td className="px-4 py-3">
 <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[signer.status] ?? ""}`}>
 {STATUS_LABEL[signer.status] ?? signer.status}
 </span>
 </td>
 <td className="px-4 py-3">
 {url ? (
 <button
 onClick={() => copyUrl(signer.id, url)}
 className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50"
 >
 {copied === signer.id ? (
 <span className="text-green-600">✓ Copied!</span>
 ) : (
 <>
 <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
 </svg>
 Copy Link
 </>
 )}
 </button>
 ) : (
 <span className="text-xs text-zinc-400">—</span>
 )}
 </td>
 <td className="px-4 py-3">
 {signer.status !== "SIGNED" && (
 <button
 onClick={() => handleRemove(signer.id)}
 disabled={isPending && removingId === signer.id}
 className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
 >
 Remove
 </button>
 )}
 </td>
 </tr>
 </>
 )
 })}
 </tbody>
 </table>
 </div>
 )
}
