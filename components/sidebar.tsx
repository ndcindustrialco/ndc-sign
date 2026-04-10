"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { signOut } from "next-auth/react"

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "เอกสาร Documents",
    exact: true,
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/upload",
    label: "อัปโหลด Upload",
    exact: false,
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
  },
]

interface SidebarProps {
  userName: string | null | undefined
  userEmail: string | null | undefined
  userImage: string | null | undefined
  mobileOpen: boolean
  onMobileClose: () => void
}

const SidebarContent = ({
  userName,
  userEmail,
  userImage,
  collapsed,
  setCollapsed,
  onNavClick,
}: {
  userName: string | null | undefined
  userEmail: string | null | undefined
  userImage: string | null | undefined
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  onNavClick?: () => void
}) => {
  const pathname = usePathname()
  const initials = (userName ?? userEmail ?? "?")[0]?.toUpperCase()

  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <div className="flex h-full flex-col bg-slate-900">
      {/* Logo */}
      <div className={`flex h-14 items-center border-b border-slate-700/50 ${collapsed ? "justify-center px-2" : "justify-between px-4"}`}>
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <Image src="/favicon.ico" alt="" width={28} height={28} className="rounded" />
            <span className="text-sm font-bold tracking-widest uppercase text-white">
              NDC e-Sign
            </span>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard">
            <Image src="/favicon.ico" alt="" width={28} height={28} className="rounded" />
          </Link>
        )}
        {/* Collapse toggle - desktop only */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto hidden h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 lg:flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={collapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {!collapsed && (
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            เมนู Menu
          </p>
        )}
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              title={collapsed ? item.label : undefined}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              } ${collapsed ? "justify-center" : ""}`}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-700/50 px-3 py-3">
        <div className={`flex items-center gap-3 rounded-lg px-3 py-2 ${collapsed ? "justify-center" : ""}`}>
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userImage}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-slate-600"
            />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white">
              {initials}
            </span>
          )}
          {!collapsed && (
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-xs font-semibold text-slate-200">
                {userName ?? userEmail ?? "User"}
              </span>
              {userName && userEmail && (
                <span className="truncate text-[11px] text-slate-500">{userEmail}</span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={collapsed ? "ออกจากระบบ Sign out" : undefined}
          className={`mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 transition-all hover:bg-white/5 hover:text-slate-300 ${collapsed ? "justify-center" : ""}`}
        >
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!collapsed && <span>ออกจากระบบ Sign out</span>}
        </button>
      </div>
    </div>
  )
}

const Sidebar = ({ userName, userEmail, userImage, mobileOpen, onMobileClose }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    onMobileClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex ${collapsed ? "w-18" : "w-60"} h-full shrink-0 flex-col transition-all duration-200`}
      >
        <SidebarContent
          userName={userName}
          userEmail={userEmail}
          userImage={userImage}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
          aria-hidden
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 flex-col transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } flex`}
      >
        <SidebarContent
          userName={userName}
          userEmail={userEmail}
          userImage={userImage}
          collapsed={false}
          setCollapsed={() => {}}
          onNavClick={onMobileClose}
        />
      </aside>
    </>
  )
}

export default Sidebar
