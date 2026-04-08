import type { FieldType } from "@/lib/actions/field"

export const FIELD_DEFAULTS: Record<FieldType, { width: number; height: number }> = {
  SIGNATURE:  { width: 25, height: 8 },
  INITIALS:   { width: 12, height: 6 },
  TEXT:       { width: 20, height: 5 },
  DATE:       { width: 15, height: 5 },
  NUMBER:     { width: 15, height: 5 },
  PHONE:      { width: 18, height: 5 },
  CELLS:      { width: 25, height: 5 },
  CHECKBOX:   { width: 4,  height: 4 },
  RADIO:      { width: 4,  height: 4 },
  SELECT:     { width: 20, height: 5 },
  IMAGE:      { width: 18, height: 12 },
  FILE:       { width: 20, height: 6 },
  STAMP:      { width: 18, height: 10 },
}
