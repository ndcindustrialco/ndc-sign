"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import type { ActionResult } from "./document"

// Max ~500KB base64 PNG — generous for a signature
const MAX_DATA_URL_LENGTH = 700_000

const SaveSchema = z.object({
  email: z.email().trim(),
  dataUrl: z.string().startsWith("data:image/png;base64,").max(MAX_DATA_URL_LENGTH),
})

// ---------------------------------------------------------------------------
// Get saved signature by email (called on signing page load)
// ---------------------------------------------------------------------------

export async function getSavedSignature(
  email: string
): Promise<ActionResult<string | null>> {
  if (!email) return { ok: true, data: null }

  const saved = await prisma.savedSignature.findUnique({
    where: { email },
    select: { dataUrl: true },
  })

  return { ok: true, data: saved?.dataUrl ?? null }
}

// ---------------------------------------------------------------------------
// Upsert saved signature (called when signer opts to save)
// ---------------------------------------------------------------------------

export async function saveSignature(
  input: z.infer<typeof SaveSchema>
): Promise<ActionResult> {
  const validated = SaveSchema.safeParse(input)
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0]?.message ?? "Invalid signature" }
  }

  const { email, dataUrl } = validated.data

  await prisma.savedSignature.upsert({
    where: { email },
    create: { email, dataUrl },
    update: { dataUrl },
  })

  return { ok: true, data: undefined }
}

// ---------------------------------------------------------------------------
// Delete saved signature (signer wants to clear their saved sig)
// ---------------------------------------------------------------------------

export async function deleteSavedSignature(email: string): Promise<ActionResult> {
  await prisma.savedSignature.deleteMany({ where: { email } })
  return { ok: true, data: undefined }
}
