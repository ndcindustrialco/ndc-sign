"use server"

import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { ActionResult } from "./document"

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const FieldTypeSchema = z.enum([
  "SIGNATURE",
  "INITIALS",
  "TEXT",
  "DATE",
  "NUMBER",
  "IMAGE",
  "CHECKBOX",
  "RADIO",
  "SELECT",
  "FILE",
  "STAMP",
  "PHONE",
  "CELLS",
])

const PositionSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(1).max(100),
  height: z.number().min(1).max(100),
})

const CreateFieldSchema = z.object({
  documentId: z.string().cuid(),
  signerId: z.string().cuid().optional(),
  type: FieldTypeSchema,
  page: z.number().int().min(1),
  label: z.string().max(100).optional(),
  required: z.boolean().default(true),
  options: z.array(z.string()).default([]),
  groupId: z.string().max(100).optional(),
}).merge(PositionSchema)

const UpdateFieldSchema = z.object({
  id: z.string().cuid(),
  signerId: z.string().cuid().nullable().optional(),
  type: FieldTypeSchema.optional(),
  page: z.number().int().min(1).optional(),
  label: z.string().max(100).nullable().optional(),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  groupId: z.string().max(100).nullable().optional(),
  x: z.number().min(0).max(100).optional(),
  y: z.number().min(0).max(100).optional(),
  width: z.number().min(1).max(100).optional(),
  height: z.number().min(1).max(100).optional(),
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FieldType =
  | "SIGNATURE" | "INITIALS" | "TEXT" | "DATE"
  | "NUMBER" | "IMAGE" | "CHECKBOX" | "RADIO"
  | "SELECT" | "FILE" | "STAMP" | "PHONE" | "CELLS"

export type FieldItem = {
  id: string
  signerId: string | null
  type: FieldType
  page: number
  x: number
  y: number
  width: number
  height: number
  label: string | null
  required: boolean
  options: string[]
  groupId: string | null
}


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function assertDocumentOwner(documentId: string, userId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { uploadedBy: true },
  })
  if (!doc || doc.uploadedBy !== userId) return false
  return true
}

const FIELD_SELECT = {
  id: true,
  signerId: true,
  type: true,
  page: true,
  x: true,
  y: true,
  width: true,
  height: true,
  label: true,
  required: true,
  options: true,
  groupId: true,
} as const

// ---------------------------------------------------------------------------
// createField
// ---------------------------------------------------------------------------

export async function createField(
  input: z.infer<typeof CreateFieldSchema>
): Promise<ActionResult<FieldItem>> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  const validated = CreateFieldSchema.safeParse(input)
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0]?.message ?? "Invalid input" }
  }

  const { documentId, signerId, type, page, x, y, width, height, label, required, options, groupId } = validated.data

  const isOwner = await assertDocumentOwner(documentId, session.user.id)
  if (!isOwner) return { ok: false, error: "Not found" }

  const field = await prisma.documentField.create({
    data: { documentId, signerId, type, page, x, y, width, height, label, required, options, groupId },
    select: FIELD_SELECT,
  })

  return { ok: true, data: field }
}

// ---------------------------------------------------------------------------
// updateField
// ---------------------------------------------------------------------------

export async function updateField(
  input: z.infer<typeof UpdateFieldSchema>
): Promise<ActionResult<FieldItem>> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  const validated = UpdateFieldSchema.safeParse(input)
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0]?.message ?? "Invalid input" }
  }

  const { id, ...data } = validated.data

  const existing = await prisma.documentField.findUnique({
    where: { id },
    select: { documentId: true },
  })
  if (!existing) return { ok: false, error: "Not found" }

  const isOwner = await assertDocumentOwner(existing.documentId, session.user.id)
  if (!isOwner) return { ok: false, error: "Not found" }

  const field = await prisma.documentField.update({
    where: { id },
    data,
    select: FIELD_SELECT,
  })

  return { ok: true, data: field }
}

// ---------------------------------------------------------------------------
// deleteField
// ---------------------------------------------------------------------------

export async function deleteField(id: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  if (!z.string().cuid().safeParse(id).success) {
    return { ok: false, error: "Invalid id" }
  }

  const existing = await prisma.documentField.findUnique({
    where: { id },
    select: { documentId: true },
  })
  if (!existing) return { ok: false, error: "Not found" }

  const isOwner = await assertDocumentOwner(existing.documentId, session.user.id)
  if (!isOwner) return { ok: false, error: "Not found" }

  await prisma.documentField.delete({ where: { id } })

  return { ok: true, data: undefined }
}
