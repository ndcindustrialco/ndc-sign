import Link from "next/link"

interface Crumb {
 label: string
 href?: string
}

interface DashboardHeaderProps {
 breadcrumbs: Crumb[]
}

export default function DashboardHeader({ breadcrumbs }: DashboardHeaderProps) {
 return (
 <header
 className="hidden h-14 shrink-0 items-center justify-between bg-white px-6 lg:flex"
 style={{ borderBottom: "1px solid var(--border, #E5E7EB)" }}
 >
 {/* Breadcrumb */}
 <nav className="flex items-center gap-1.5 text-sm">
 {breadcrumbs.map((crumb, i) => (
 <span key={i} className="flex items-center gap-1.5">
 {i > 0 && (
 <svg
 className="h-3 w-3 shrink-0"
 style={{ color: "var(--accent, #ADB5BD)" }}
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 >
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
 </svg>
 )}
 {crumb.href ? (
 <Link
 href={crumb.href}
 className="transition-colors hover:opacity-80"
 style={{ color: "var(--accent, #ADB5BD)" }}
 >
 {crumb.label}
 </Link>
 ) : (
 <span className="font-semibold" style={{ color: "var(--foreground, #212529)" }}>
 {crumb.label}
 </span>
 )}
 </span>
 ))}
 </nav>

 {/* Right actions */}
 <div className="flex items-center gap-1">
 {/* Notification bell */}
 <button
 className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-slate-100"
 style={{ color: "var(--accent, #ADB5BD)" }}
 aria-label="Notifications"
 title="Notifications"
 >
 <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={1.8}
 d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
 />
 </svg>
 </button>
 </div>
 </header>
 )
}
