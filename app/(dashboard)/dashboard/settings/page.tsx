import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getSavedSignature } from "@/lib/actions/saved-signature"
import SavedSignatureSection from "@/components/settings/saved-signature-section"

export const metadata = { title: "Settings — NDC e-Sign" }

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const result = await getSavedSignature(session.user.email)
  const savedSignature = result.ok ? result.data : null

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <h1 className="mb-1 text-xl font-bold text-slate-800">
        ตั้งค่า Settings
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        จัดการข้อมูลส่วนตัวและการตั้งค่าบัญชีของคุณ
        <span className="ml-1 text-slate-400">Manage your account preferences.</span>
      </p>

      <SavedSignatureSection savedSignature={savedSignature} userEmail={session.user.email} />
    </div>
  )
}
