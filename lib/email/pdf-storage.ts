/**
 * Temporary PDF storage for email attachments.
 *
 * Inngest events have a 256KB payload limit, so we store PDFs in
 * Supabase Storage and pass only the path through the event.
 * The Inngest function downloads the file before sending the email,
 * then deletes it.
 */

import { supabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase"
import { randomUUID } from "crypto"

const TEMP_PREFIX = "email-temp"

/** Upload PDF bytes and return the storage path. */
export async function uploadTempPdf(
  bytes: Uint8Array,
  label: string
): Promise<string> {
  const path = `${TEMP_PREFIX}/${randomUUID()}-${label}.pdf`

  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(path, bytes, {
      contentType: "application/pdf",
      upsert: false,
    })

  if (error) {
    throw new Error(`[pdf-storage] upload failed: ${error.message}`)
  }

  return path
}

/** Download PDF bytes from a storage path. Returns null if not found. */
export async function downloadTempPdf(
  path: string
): Promise<Uint8Array | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .download(path)

  if (error || !data) {
    console.error(`[pdf-storage] download failed (${path}):`, error?.message)
    return null
  }

  return new Uint8Array(await data.arrayBuffer())
}

/** Delete a temp PDF after it has been used. Silently ignores errors. */
export async function deleteTempPdf(path: string): Promise<void> {
  await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .remove([path])
    .catch(() => { /* best effort cleanup */ })
}
