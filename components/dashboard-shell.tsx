"use client"

import { useState } from "react"
import Sidebar from "@/components/sidebar"
import DashboardHeader from "@/components/dashboard-header"

interface DashboardShellProps {
  userName: string | null | undefined
  userEmail: string | null | undefined
  userImage: string | null | undefined
  userRole: string
  children: React.ReactNode
}

const DashboardShell = ({ userName, userEmail, userImage, userRole, children }: DashboardShellProps) => {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--background, #f8fafc)" }}>
      {/* Sidebar */}
      <Sidebar
        userName={userName}
        userEmail={userEmail}
        userImage={userImage}
        userRole={userRole}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header with breadcrumbs */}
        <DashboardHeader onMenuClick={() => setMobileOpen(true)} />

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

export default DashboardShell
