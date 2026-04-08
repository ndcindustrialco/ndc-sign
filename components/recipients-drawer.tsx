"use client"

import { useState, useEffect, useCallback } from "react"
import SignerForm from "@/components/signer-form"
import SignerList from "@/components/signer-list"
import type { SignerItem } from "@/lib/actions/signer"

interface RecipientsDrawerProps {
 documentId: string
 initialSigners: SignerItem[]
}

export default function RecipientsDrawer({ documentId, initialSigners }: RecipientsDrawerProps) {
 const [open, setOpen] = useState(false)
 const [signers, setSigners] = useState<SignerItem[]>(initialSigners)
 const [newSigners, setNewSigners] = useState<SignerItem[]>([])

 // Close on Escape
 useEffect(() => {
 if (!open) return
 const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
 document.addEventListener("keydown", handler)
 return () => document.removeEventListener("keydown", handler)
 }, [open])

 // Prevent body scroll when open
 useEffect(() => {
 document.body.style.overflow = open ? "hidden" : ""
 return () => { document.body.style.overflow = "" }
 }, [open])

 const handleAdded = useCallback((signer: SignerItem) => {
 setNewSigners((prev) => [...prev, signer])
 }, [])

 const handleRemoved = useCallback((id: string) => {
 setSigners((prev) => prev.filter((s) => s.id !== id))
 setNewSigners((prev) => prev.filter((s) => s.id !== id))
 }, [])

 return (
 <>
 {/* Trigger button */}
 <button
 onClick={() => setOpen(true)}
 className="flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
 >
 <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
 d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
 </svg>
 Recipients
 {(signers.length + newSigners.filter((n) => !signers.find((s) => s.id === n.id)).length) > 0 && (
 <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1.5 text-xs font-medium text-white">
 {signers.length + newSigners.filter((n) => !signers.find((s) => s.id === n.id)).length}
 </span>
 )}
 </button>

 {/* Backdrop */}
 {open && (
 <div
 className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
 onClick={() => setOpen(false)}
 />
 )}

 {/* Drawer panel */}
 <div
 className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-4xl flex-col bg-white shadow-2xl transition-transform duration-300 ${
 open ? "translate-x-0" : "translate-x-full"
 }`}
 >
 {/* Header */}
 <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
 <div>
 <h2 className="text-base font-semibold text-zinc-900">Recipients</h2>
 <p className="mt-0.5 text-xs text-zinc-500">
 Add signers and copy their secure signing links.
 </p>
 </div>
 <button
 onClick={() => setOpen(false)}
 className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
 aria-label="Close"
 >
 <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>

 {/* Scrollable body */}
 <div className="flex-1 overflow-y-auto px-6 py-5">
 <div className="flex flex-col gap-4">
 <SignerForm documentId={documentId} onAdded={handleAdded} />
 <SignerList
 initialSigners={signers}
 newSigners={newSigners}
 onRemoved={handleRemoved}
 />
 </div>
 </div>
 </div>
 </>
 )
}
