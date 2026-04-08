"use client"

import type { FieldItem } from "@/lib/actions/field"
import FieldItemComponent from "./field-item"

interface FieldOverlayProps {
  fields: FieldItem[]
  currentPage: number
  containerRef: React.RefObject<HTMLDivElement | null>
  selectedId: string | null
  onSelect: (id: string) => void
  onUpdate: (id: string, patch: Partial<Pick<FieldItem, "x" | "y" | "width" | "height">>) => void
  onUpdateCommit: (id: string) => void
  onDelete: (id: string) => void
}

export default function FieldOverlay({
  fields,
  currentPage,
  containerRef,
  selectedId,
  onSelect,
  onUpdate,
  onUpdateCommit,
  onDelete,
}: FieldOverlayProps) {
  const pageFields = fields.filter((f) => f.page === currentPage)

  return (
    <div className="pointer-events-none absolute inset-0">
      {pageFields.map((field) => (
        <div key={field.id} className="pointer-events-auto">
          <FieldItemComponent
            field={field}
            containerRef={containerRef}
            isSelected={selectedId === field.id}
            onSelect={onSelect}
            onUpdate={onUpdate}
            onUpdateCommit={onUpdateCommit}
            onDelete={onDelete}
          />
        </div>
      ))}
    </div>
  )
}
