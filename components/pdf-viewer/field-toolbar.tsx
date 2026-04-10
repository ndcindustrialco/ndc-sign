"use client"

type FieldType = "SIGNATURE" | "TEXT" | "DATE"

interface FieldToolbarProps {
 selectedType: FieldType
 onTypeChange: (type: FieldType) => void
 currentPage: number
 totalPages: number
 onPageChange: (page: number) => void
}

const TYPES: { value: FieldType; label: string; icon: string }[] = [
 { value: "SIGNATURE", label: "ลายเซ็น Sign", icon: "✍️" },
 { value: "TEXT", label: "ข้อความ Text", icon: "T" },
 { value: "DATE", label: "วันที่ Date", icon: "📅" },
]

export default function FieldToolbar({
 selectedType,
 onTypeChange,
 currentPage,
 totalPages,
 onPageChange,
}: FieldToolbarProps) {
 return (
 <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-2">
 {/* Field type selector */}
 <div className="flex items-center gap-1">
 <span className="mr-2 text-xs font-medium text-zinc-500">เพิ่มฟิลด์ Add field:</span>
 {TYPES.map((t) => (
 <button
 key={t.value}
 onClick={() => onTypeChange(t.value)}
 className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
 selectedType === t.value
 ? "bg-zinc-900 text-white"
 : "text-zinc-600 hover:bg-zinc-100"
 }`}
 >
 <span>{t.icon}</span>
 {t.label}
 </button>
 ))}
 </div>

 {/* Page navigation */}
 {totalPages > 1 && (
 <div className="flex items-center gap-2 text-sm">
 <button
 onClick={() => onPageChange(Math.max(1, currentPage - 1))}
 disabled={currentPage <= 1}
 className="rounded px-2 py-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
 >
 ←
 </button>
 <span className="text-zinc-600">
 Page {currentPage} / {totalPages}
 </span>
 <button
 onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
 disabled={currentPage >= totalPages}
 className="rounded px-2 py-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
 >
 →
 </button>
 </div>
 )}
 </div>
 )
}
