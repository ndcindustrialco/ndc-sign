"use client"

import { useState } from "react"
import SignerForm from "@/components/signer-form"
import SignerList from "@/components/signer-list"
import type { SignerItem } from "@/lib/actions/signer"

interface RecipientsPanelProps {
 documentId: string
 initialSigners: SignerItem[]
 onDone: (signers: SignerItem[]) => void
 onClose: () => void
}

export default function RecipientsPanel({
 documentId,
 initialSigners,
 onDone,
 onClose,
}: RecipientsPanelProps) {
 const [signers, setSigners] = useState<SignerItem[]>(initialSigners)
 const [newSigners, setNewSigners] = useState<SignerItem[]>([])

 function handleAdded(signer: SignerItem) {
 setNewSigners((prev) => [...prev, signer])
 }

 function handleRemoved(id: string) {
 setSigners((prev) => prev.filter((s) => s.id !== id))
 setNewSigners((prev) => prev.filter((s) => s.id !== id))
 }

 function handleClose() {
 // Merge state back to parent on close
 const remaining = signers
 const added = newSigners.filter((n) => !signers.find((s) => s.id === n.id))
 onDone([...remaining, ...added])
 onClose()
 }

 return (
 <div className="flex h-full flex-col">
 {/* Header */}
 <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
 <div>
 <h2 className="text-base font-semibold text-zinc-900">Recipients</h2>
 <p className="mt-0.5 text-xs text-zinc-500">Add signers — each is saved immediately.</p>
 </div>
 <button
 onClick={handleClose}
 className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
 aria-label="Close"
 >
 <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>

 {/* Body */}
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
 )
}
