"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

/** Map route segments to readable labels */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "แดชบอร์ด Dashboard",
  documents: "เอกสาร Documents",
  upload: "อัปโหลด Upload",
  edit: "แก้ไข Edit",
  feedback: "ความคิดเห็น Feedback",
  manage: "จัดการ Manage",
}

const isUuid = (segment: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)

const isCuid = (segment: string) =>
  /^c[a-z0-9]{24,}$/i.test(segment)

const isDynamicId = (segment: string) =>
  isUuid(segment) || isCuid(segment) || /^\d+$/.test(segment)

interface Crumb {
  label: string
  href: string
}

const buildBreadcrumbs = (pathname: string): Crumb[] => {
  const segments = pathname.split("/").filter(Boolean)
  const crumbs: Crumb[] = []

  // Always start with Home icon pointing to dashboard
  crumbs.push({ label: "หน้าแรก Home", href: "/dashboard" })

  let currentPath = ""
  for (const segment of segments) {
    currentPath += `/${segment}`

    // Skip "dashboard" since Home already points there
    if (segment === "dashboard") continue

    if (isDynamicId(segment)) {
      crumbs.push({ label: "รายละเอียด Detail", href: currentPath })
    } else {
      const label = SEGMENT_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1)
      crumbs.push({ label, href: currentPath })
    }
  }

  return crumbs
}

interface DashboardHeaderProps {
  onMenuClick: () => void
}

const DashboardHeader = ({ onMenuClick }: DashboardHeaderProps) => {
  const pathname = usePathname()
  const crumbs = buildBreadcrumbs(pathname)

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4 md:px-6">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 lg:hidden"
        aria-label="Open menu"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1
          const isHome = i === 0

          return (
            <span key={crumb.href} className="flex items-center gap-1.5">
              {i > 0 && (
                <svg
                  className="h-3.5 w-3.5 shrink-0 text-slate-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
              {isLast ? (
                <span className="font-semibold text-slate-800">
                  {isHome ? (
                    <HomeIcon className="h-4 w-4" />
                  ) : (
                    crumb.label
                  )}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-slate-400 transition-colors hover:text-slate-600"
                >
                  {isHome ? (
                    <HomeIcon className="h-4 w-4" />
                  ) : (
                    crumb.label
                  )}
                </Link>
              )}
            </span>
          )
        })}
      </nav>

    </header>
  )
}

const HomeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1m-2 0h2"
    />
  </svg>
)

export default DashboardHeader
