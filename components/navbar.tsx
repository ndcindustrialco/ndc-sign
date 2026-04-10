"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState, useRef, useEffect } from "react"
import { signOut } from "next-auth/react"

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Documents",
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
]

interface NavbarProps {
  userName: string | null | undefined
  userEmail: string | null | undefined
  userImage: string | null | undefined
}

export default function Navbar({ userName, userEmail, userImage }: NavbarProps) {
  const pathname = usePathname()
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileMenuOpenAt, setMobileMenuOpenAt] = useState<string | null>(null)
  const mobileMenuOpen = mobileMenuOpenAt === pathname
  const profileRef = useRef<HTMLDivElement>(null)
  const initials = (userName ?? userEmail ?? "?")[0]?.toUpperCase()

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white">
      <div className="flex h-14 items-center gap-4 px-4 md:px-6">
        {/* Logo */}
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5">
          <Image src="/favicon.ico" alt="" width={28} height={28} />
          <span
            className="hidden text-sm font-bold tracking-widest uppercase sm:block"
            style={{ color: "var(--primary, #0F1059)" }}
          >
            NDC e-Sign
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all"
                style={{
                  color: active ? "var(--primary, #0F1059)" : "#64748b",
                  background: active ? "rgba(15,16,89,0.07)" : "transparent",
                }}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Right section */}
        <div className="ml-auto flex items-center gap-2">

          {/* Profile dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-100"
              aria-label="Profile menu"
            >
              {userImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userImage}
                  alt=""
                  className="h-7 w-7 rounded-full object-cover ring-2 ring-slate-200"
                />
              ) : (
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ background: "var(--primary, #0F1059)" }}
                >
                  {initials}
                </span>
              )}
              <span className="hidden max-w-[120px] truncate text-sm font-medium text-slate-700 sm:block">
                {userName ?? userEmail ?? "User"}
              </span>
              <svg
                className={`hidden h-4 w-4 shrink-0 text-slate-400 transition-transform sm:block ${profileOpen ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <div className="border-b border-slate-100 px-4 py-2.5">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {userName ?? userEmail ?? "User"}
                  </p>
                  {userName && userEmail && (
                    <p className="truncate text-xs text-slate-400">{userEmail}</p>
                  )}
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpenAt(mobileMenuOpen ? null : pathname)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 md:hidden"
            aria-label="Open menu"
          >
            {mobileMenuOpen ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav menu */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-100 px-4 py-2 md:hidden">
          <nav className="flex flex-col gap-0.5">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all"
                  style={{
                    color: active ? "var(--primary, #ffffff)" : "#64748b",
                    background: active ? "rgba(15,16,89,0.07)" : "transparent",
                  }}
                >
                  {item.icon}
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </header>
  )
}
