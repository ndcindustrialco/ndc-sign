"use client"

interface Props {
  onMenuClick: () => void
}

export default function DashboardMobileBar({ onMenuClick }: Props) {
  return (
    <div
      className="flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden"
    >
      <button
        onClick={onMenuClick}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
        aria-label="Open menu"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: "var(--primary, #0F1059)" }}>
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="white" aria-hidden>
            <polygon points="4,2 16,2 18,10 16,18 4,18 2,10" />
          </svg>
        </div>
        <span className="text-sm font-bold tracking-widest uppercase" style={{ color: "var(--primary, #0F1059)" }}>eSign</span>
      </div>
    </div>
  )
}
