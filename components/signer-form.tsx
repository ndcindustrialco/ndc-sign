"use client"

import { useState, useTransition } from "react"
import { addSigner } from "@/lib/actions/signer"
import type { SignerItem } from "@/lib/actions/signer"
import PeoplePicker from "@/components/people-picker"

interface SignerFormProps {
 documentId: string
 onAdded: (signer: SignerItem) => void
}

export default function SignerForm({ documentId, onAdded }: SignerFormProps) {
 const [person, setPerson] = useState<{ name: string; email: string } | null>(null)
 const [signingOrder, setSigningOrder] = useState<number>(1)
 const [error, setError] = useState<string | null>(null)
 const [isPending, startTransition] = useTransition()

 function handleSubmit(e: React.FormEvent) {
 e.preventDefault()
 if (!person) return
 setError(null)

 startTransition(async () => {
 const result = await addSigner({
 documentId,
 name: person.name,
 email: person.email,
 signingOrder,
 })
 if (!result.ok) {
 setError(result.error)
 return
 }
 onAdded(result.data)
 setPerson(null)
 setSigningOrder(1)
 })
 }

 return (
 <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
 <p className="mb-3 text-sm font-medium text-zinc-700">เพิ่มผู้ลงนาม Add Recipient</p>

 <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
 {/* People picker — takes up remaining space */}
 <div className="flex-1">
 <PeoplePicker value={person} onChange={setPerson} disabled={isPending} />
 </div>

 {/* Signing order */}
 <div className="flex items-center gap-1.5">
 <label className="text-xs text-zinc-500 whitespace-nowrap">ลำดับ Order</label>
 <input
 type="number"
 min={1}
 max={99}
 value={signingOrder}
 onChange={(e) => setSigningOrder(Math.max(1, parseInt(e.target.value) || 1))}
 disabled={isPending}
 className="w-16 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-center text-sm outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-50"
 />
 </div>

 {/* Submit */}
 <button
 type="submit"
 disabled={!person || isPending}
 className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
 >
 {isPending ? "กำลังเพิ่ม…" : "เพิ่ม Add"}
 </button>
 </div>

 <p className="mt-2 text-xs text-zinc-400">
 ลำดับเดียวกัน = เซ็นพร้อมกัน ลำดับน้อยกว่า = เซ็นก่อน
 </p>

 {error && (
 <p className="mt-2 text-sm text-red-600">{error}</p>
 )}
 </form>
 )
}
