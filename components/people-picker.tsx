"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { searchPeople } from "@/lib/actions/people"
import type { GraphUser } from "@/lib/email/graph-people"

interface SelectedPerson {
 name: string
 email: string
}

interface PeoplePickerProps {
 value: SelectedPerson | null
 onChange: (person: SelectedPerson | null) => void
 disabled?: boolean
}

function getInitials(name: string): string {
 return name
 .split(" ")
 .slice(0, 2)
 .map((w) => w[0]?.toUpperCase() ?? "")
 .join("")
}

function getEmail(user: GraphUser): string {
 return user.mail ?? user.userPrincipalName
}

export default function PeoplePicker({ value, onChange, disabled }: PeoplePickerProps) {
 const [query, setQuery] = useState("")
 const [results, setResults] = useState<GraphUser[]>([])
 const [loading, setLoading] = useState(false)
 const [open, setOpen] = useState(false)
 const [activeIndex, setActiveIndex] = useState(-1)

 const inputRef = useRef<HTMLInputElement>(null)
 const listRef = useRef<HTMLUListElement>(null)
 const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

 // Cleanup debounce timer on unmount
 useEffect(() => {
 return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
 }, [])

 const handleQueryChange = useCallback((q: string) => {
 setQuery(q)
 if (debounceRef.current) clearTimeout(debounceRef.current)

 if (!q.trim()) {
 setResults([])
 setOpen(false)
 return
 }

 debounceRef.current = setTimeout(async () => {
 setLoading(true)
 const result = await searchPeople(q)
 setLoading(false)
 if (result.ok) {
 setResults(result.data)
 setOpen(result.data.length > 0)
 setActiveIndex(-1)
 }
 }, 300)
 }, [])

 // Close dropdown on outside click
 useEffect(() => {
 function handleClickOutside(e: MouseEvent) {
 const target = e.target as Node
 if (!inputRef.current?.parentElement?.contains(target)) {
 setOpen(false)
 }
 }
 document.addEventListener("mousedown", handleClickOutside)
 return () => document.removeEventListener("mousedown", handleClickOutside)
 }, [])

 function selectUser(user: GraphUser) {
 const email = getEmail(user)
 onChange({ name: user.displayName, email })
 setQuery("")
 setResults([])
 setOpen(false)
 }

 function clearSelection() {
 onChange(null)
 setQuery("")
 setTimeout(() => inputRef.current?.focus(), 0)
 }

 function handleKeyDown(e: React.KeyboardEvent) {
 if (!open) return
 if (e.key === "ArrowDown") {
 e.preventDefault()
 setActiveIndex((i) => Math.min(i + 1, results.length - 1))
 } else if (e.key === "ArrowUp") {
 e.preventDefault()
 setActiveIndex((i) => Math.max(i - 1, 0))
 } else if (e.key === "Enter" && activeIndex >= 0) {
 e.preventDefault()
 const user = results[activeIndex]
 if (user) selectUser(user)
 } else if (e.key === "Escape") {
 setOpen(false)
 }
 }

 // If a person is selected, show chip instead of input
 if (value) {
 return (
 <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2">
 <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold text-zinc-700">
 {getInitials(value.name)}
 </span>
 <div className="min-w-0 flex-1">
 <p className="truncate text-sm font-medium text-zinc-900">{value.name}</p>
 <p className="truncate text-xs text-zinc-500">{value.email}</p>
 </div>
 {!disabled && (
 <button
 type="button"
 onClick={clearSelection}
 className="ml-1 shrink-0 rounded p-0.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
 aria-label="Clear selection"
 >
 <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 )}
 </div>
 )
 }

 return (
 <div className="relative">
 <div className="relative">
 <input
 ref={inputRef}
 type="text"
 placeholder="ค้นหาชื่อหรืออีเมล Search by name or email…"
 value={query}
 onChange={(e) => handleQueryChange(e.target.value)}
 onKeyDown={handleKeyDown}
 onFocus={() => results.length > 0 && setOpen(true)}
 disabled={disabled}
 autoComplete="off"
 className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-3 pr-8 text-sm outline-none focus:ring-2 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
 />
 <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
 {loading ? (
 <svg className="h-4 w-4 animate-spin text-zinc-400" fill="none" viewBox="0 0 24 24">
 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
 </svg>
 ) : (
 <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
 </svg>
 )}
 </div>
 </div>

 {/* Dropdown */}
 {open && results.length > 0 && (
 <ul
 ref={listRef}
 role="listbox"
 className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg"
 >
 {results.map((user, i) => {
 const email = getEmail(user)
 return (
 <li
 key={user.id}
 role="option"
 aria-selected={activeIndex === i}
 onMouseDown={(e) => { e.preventDefault(); selectUser(user) }}
 onMouseEnter={() => setActiveIndex(i)}
 className={`flex cursor-pointer items-center gap-3 px-3 py-2 transition ${
 activeIndex === i
 ? "bg-zinc-100"
 : "hover:bg-zinc-50"
 }`}
 >
 <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700">
 {getInitials(user.displayName)}
 </span>
 <div className="min-w-0">
 <p className="truncate text-sm font-medium text-zinc-900">
 {user.displayName}
 </p>
 <p className="truncate text-xs text-zinc-500">{email}</p>
 {(user.jobTitle ?? user.department) && (
 <p className="truncate text-xs text-zinc-400">
 {[user.jobTitle, user.department].filter(Boolean).join(" · ")}
 </p>
 )}
 </div>
 </li>
 )
 })}
 </ul>
 )}
 </div>
 )
}
