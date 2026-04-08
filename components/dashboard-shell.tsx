"use client"

import Navbar from "@/components/navbar"

interface DashboardShellProps {
  userName: string | null | undefined
  userEmail: string | null | undefined
  userImage: string | null | undefined
  children: React.ReactNode
}

export default function DashboardShell({ userName, userEmail, userImage, children }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--background, #f8fafc)" }}>
      <Navbar userName={userName} userEmail={userEmail} userImage={userImage} />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
