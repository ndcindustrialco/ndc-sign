import { inngest } from "./client"
import {
  sendSigningInvite,
  sendSignedNotification,
  sendCompletedNotification,
  sendSignerCopy,
  sendVoidNotification,
  sendDeclineNotification,
} from "@/lib/email/send"
import { downloadTempPdf, deleteTempPdf } from "@/lib/email/pdf-storage"

// ---------------------------------------------------------------------------
// Helper: revive Date fields that were serialized to strings via JSON
// ---------------------------------------------------------------------------

function reviveDates<T extends Record<string, unknown>>(
  data: T,
  keys: string[]
): T {
  const copy: Record<string, unknown> = { ...data }
  for (const key of keys) {
    if (key in copy && copy[key] !== undefined && copy[key] !== null) {
      copy[key] = new Date(copy[key] as string | number)
    }
  }
  return copy as T
}

// ---------------------------------------------------------------------------
// Helper: download PDFs from temp storage paths and attach as bytes
// Cleans up temp files after download.
// ---------------------------------------------------------------------------

async function resolvePdfPaths(
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const copy = { ...data }
  const pathsToCleanup: string[] = []

  if (typeof copy.signedPdfPath === "string" && copy.signedPdfPath) {
    const bytes = await downloadTempPdf(copy.signedPdfPath)
    copy.signedPdfBytes = bytes
    pathsToCleanup.push(copy.signedPdfPath)
    delete copy.signedPdfPath
  }

  if (typeof copy.auditPdfPath === "string" && copy.auditPdfPath) {
    const bytes = await downloadTempPdf(copy.auditPdfPath)
    copy.auditPdfBytes = bytes
    pathsToCleanup.push(copy.auditPdfPath)
    delete copy.auditPdfPath
  }

  // Cleanup temp files (best effort, don't block on failure)
  for (const path of pathsToCleanup) {
    deleteTempPdf(path).catch(() => {})
  }

  return copy
}

// ---------------------------------------------------------------------------
// Inngest functions with automatic retry (v4 API: 2-arg createFunction)
// ---------------------------------------------------------------------------

export const sendSigningInviteFunction = inngest.createFunction(
  { id: "send-signing-invite", retries: 3, triggers: [{ event: "email/signing-invite" }] },
  async ({ event }) => {
    const data = reviveDates(event.data, ["expiresAt"])
    await sendSigningInvite(data as Parameters<typeof sendSigningInvite>[0])
    return { sent: true }
  }
)

export const sendSignedNotificationFunction = inngest.createFunction(
  { id: "send-signed-notification", retries: 3, triggers: [{ event: "email/signed-notification" }] },
  async ({ event }) => {
    let data = reviveDates(event.data, ["signedAt"])
    data = await resolvePdfPaths(data)
    await sendSignedNotification(data as Parameters<typeof sendSignedNotification>[0])
    return { sent: true }
  }
)

export const sendCompletedNotificationFunction = inngest.createFunction(
  { id: "send-completed-notification", retries: 3, triggers: [{ event: "email/completed-notification" }] },
  async ({ event }) => {
    let data = reviveDates(event.data, ["completedAt"])
    data = await resolvePdfPaths(data)
    await sendCompletedNotification(data as Parameters<typeof sendCompletedNotification>[0])
    return { sent: true }
  }
)

export const sendSignerCopyFunction = inngest.createFunction(
  { id: "send-signer-copy", retries: 3, triggers: [{ event: "email/signer-copy" }] },
  async ({ event }) => {
    let data = reviveDates(event.data, ["signedAt"])
    data = await resolvePdfPaths(data)
    await sendSignerCopy(data as Parameters<typeof sendSignerCopy>[0])
    return { sent: true }
  }
)

export const sendVoidNotificationFunction = inngest.createFunction(
  { id: "send-void-notification", retries: 3, triggers: [{ event: "email/void-notification" }] },
  async ({ event }) => {
    await sendVoidNotification(event.data as Parameters<typeof sendVoidNotification>[0])
    return { sent: true }
  }
)

export const sendDeclineNotificationFunction = inngest.createFunction(
  { id: "send-decline-notification", retries: 3, triggers: [{ event: "email/decline-notification" }] },
  async ({ event }) => {
    await sendDeclineNotification(event.data as Parameters<typeof sendDeclineNotification>[0])
    return { sent: true }
  }
)

export const allFunctions = [
  sendSigningInviteFunction,
  sendSignedNotificationFunction,
  sendCompletedNotificationFunction,
  sendSignerCopyFunction,
  sendVoidNotificationFunction,
  sendDeclineNotificationFunction,
]
