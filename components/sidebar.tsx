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

const SETTINGS_NAV = {
  href: "/dashboard/settings",
  label: "ตั้งค่า Settings",
  exact: false,
  icon: (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
}

const FEEDBACK_NAV = {
  href: "/dashboard/feedback",
  label: "ความคิดเห็น Feedback",
  exact: true,
  icon: (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
    </svg>
  ),
}

const FEEDBACK_MANAGE_NAV = {
  href: "/dashboard/feedback/manage",
  label: "จัดการ Feedback Manage Feedback",
  exact: false,
  icon: (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
}

interface SidebarProps {
  userName: string | null | undefined
  userEmail: string | null | undefined
  userImage: string | null | undefined
  userRole: string
  mobileOpen: boolean
  onMobileClose: () => void
}

const SidebarContent = ({
  userName,
  userEmail,
  userImage,
  userRole,
  collapsed,
  setCollapsed,
  onNavClick,
}: {
  userName: string | null | undefined
  userEmail: string | null | undefined
  userImage: string | null | undefined
  userRole: string
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
    <div className="flex h-full flex-col border-r border-slate-200 bg-white">
      {/* Logo */}
      <div className={`flex h-14 items-center border-b border-slate-200 ${collapsed ? "justify-center px-2" : "justify-between px-4"}`}>
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <Image src="/favicon.ico" alt="" width={28} height={28} className="rounded" />
            <span className="text-sm font-bold tracking-widest uppercase text-slate-800">
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
          className="ml-auto hidden h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 lg:flex"
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
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
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
                  ? "bg-slate-100 text-slate-900 shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              } ${collapsed ? "justify-center" : ""}`}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-500" />
              )}
            </Link>
          )
        })}

        {/* Settings - visible to all users */}
        {(() => {
          const active = isActive(SETTINGS_NAV.href, SETTINGS_NAV.exact)
          return (
            <Link
              href={SETTINGS_NAV.href}
              onClick={onNavClick}
              title={collapsed ? SETTINGS_NAV.label : undefined}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "bg-slate-100 text-slate-900 shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              } ${collapsed ? "justify-center" : ""}`}
            >
              {SETTINGS_NAV.icon}
              {!collapsed && <span>{SETTINGS_NAV.label}</span>}
              {!collapsed && active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-500" />
              )}
            </Link>
          )
        })()}

        {/* Feedback section */}
        {!collapsed && (
          <p className="mb-2 mt-4 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            อื่นๆ Others
          </p>
        )}
        {collapsed && <div className="my-2 border-t border-slate-200" />}

        {/* Feedback - visible to all users */}
        {(() => {
          const active = isActive(FEEDBACK_NAV.href, FEEDBACK_NAV.exact)
          return (
            <Link
              href={FEEDBACK_NAV.href}
              onClick={onNavClick}
              title={collapsed ? FEEDBACK_NAV.label : undefined}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "bg-slate-100 text-slate-900 shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              } ${collapsed ? "justify-center" : ""}`}
            >
              {FEEDBACK_NAV.icon}
              {!collapsed && <span>{FEEDBACK_NAV.label}</span>}
              {!collapsed && active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-500" />
              )}
            </Link>
          )
        })()}

        {/* Feedback Management - IT only */}
        {userRole === "IT" && (() => {
          const active = isActive(FEEDBACK_MANAGE_NAV.href, FEEDBACK_MANAGE_NAV.exact)
          return (
            <Link
              href={FEEDBACK_MANAGE_NAV.href}
              onClick={onNavClick}
              title={collapsed ? FEEDBACK_MANAGE_NAV.label : undefined}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "bg-slate-100 text-slate-900 shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              } ${collapsed ? "justify-center" : ""}`}
            >
              {FEEDBACK_MANAGE_NAV.icon}
              {!collapsed && <span>{FEEDBACK_MANAGE_NAV.label}</span>}
              {!collapsed && active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-500" />
              )}
            </Link>
          )
        })()}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-200 px-3 py-3">
        <div className={`flex items-center gap-3 rounded-lg px-3 py-2 ${collapsed ? "justify-center" : ""}`}>
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userImage}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-slate-200"
            />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
              {initials}
            </span>
          )}
          {!collapsed && (
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-xs font-semibold text-slate-800">
                {userName ?? userEmail ?? "User"}
              </span>
              {userName && userEmail && (
                <span className="truncate text-[11px] text-slate-400">{userEmail}</span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={collapsed ? "ออกจากระบบ Sign out" : undefined}
          className={`mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 transition-all hover:bg-slate-50 hover:text-slate-700 ${collapsed ? "justify-center" : ""}`}
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

const Sidebar = ({ userName, userEmail, userImage, userRole, mobileOpen, onMobileClose }: SidebarProps) => {
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
          userRole={userRole}
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
          userRole={userRole}
          collapsed={false}
          setCollapsed={() => {}}
          onNavClick={onMobileClose}
        />
      </aside>
    </>
  )
}

export default Sidebar
