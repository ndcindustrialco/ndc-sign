import { sendGraphMail } from "./graph-client"
import {
  renderInviteEmail,
  renderSignedNotificationEmail,
  renderCompletedEmail,
  renderVoidNotificationEmail,
  renderDeclineNotificationEmail,
  renderSignerCopyEmail,
} from "./templates"

// ---------------------------------------------------------------------------
// Send signing invitation to a recipient
// Sent FROM the document owner's mailbox (OBO)
// ---------------------------------------------------------------------------

export async function sendSigningInvite(opts: {
  userAccessToken: string
  senderEmail: string
  senderName: string
  signerName: string
  signerEmail: string
  documentName: string
  signingUrl: string
  expiresAt: Date
  customSubject?: string
  customMessage?: string
}): Promise<void> {
  const html = renderInviteEmail({
    signerName: opts.signerName,
    documentName: opts.documentName,
    senderName: opts.senderName,
    signingUrl: opts.signingUrl,
    expiresAt: opts.expiresAt,
    customMessage: opts.customMessage,
  })
  await sendGraphMail({
    userAccessToken: opts.userAccessToken,
    fromEmail: opts.senderEmail,
    fromName: opts.senderName,
    subject: opts.customSubject ?? `กรุณาลงนาม / Please sign: ${opts.documentName}`,
    htmlBody: html,
    toAddress: opts.signerEmail,
    toName: opts.signerName,
  })
}

// ---------------------------------------------------------------------------
// Notify document owner that a signer has signed
// Sent FROM the document owner's mailbox TO themselves
// ---------------------------------------------------------------------------

export async function sendSignedNotification(opts: {
  userAccessToken: string
  ownerEmail: string
  ownerName: string
  signerName: string
  signerEmail: string
  documentName: string
  documentUrl: string
  signedAt: Date
  /** Raw bytes of the signed PDF to attach */
  signedPdfBytes?: Uint8Array | null
  /** Raw bytes of the audit certificate PDF to attach */
  auditPdfBytes?: Uint8Array | null
}): Promise<void> {
  const html = renderSignedNotificationEmail({
    ownerName: opts.ownerName,
    signerName: opts.signerName,
    signerEmail: opts.signerEmail,
    documentName: opts.documentName,
    documentUrl: opts.documentUrl,
    signedAt: opts.signedAt,
  })

  const attachments: import("./graph-client").GraphMailAttachment[] = []
  const safeName = opts.documentName.replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "document"

  if (opts.signedPdfBytes) {
    attachments.push({
      name: `${safeName} - Signed.pdf`,
      contentType: "application/pdf",
      bytes: opts.signedPdfBytes,
    })
  }
  if (opts.auditPdfBytes) {
    attachments.push({
      name: `${safeName} - Audit Certificate.pdf`,
      contentType: "application/pdf",
      bytes: opts.auditPdfBytes,
    })
  }

  await sendGraphMail({
    userAccessToken: opts.userAccessToken,
    fromEmail: opts.ownerEmail,
    fromName: opts.ownerName,
    subject: `${opts.signerName} ลงนามแล้ว / signed "${opts.documentName}"`,
    htmlBody: html,
    toAddress: opts.ownerEmail,
    toName: opts.ownerName,
    attachments: attachments.length > 0 ? attachments : undefined,
  })
}

// ---------------------------------------------------------------------------
// Notify document owner that all signers have completed
// Sent FROM the document owner's mailbox TO themselves
// ---------------------------------------------------------------------------

export async function sendCompletedNotification(opts: {
  userAccessToken: string
  ownerEmail: string
  ownerName: string
  documentName: string
  documentUrl: string
  totalSigners: number
  completedAt: Date
  /** Raw bytes of the signed PDF to attach */
  signedPdfBytes?: Uint8Array | null
  /** Raw bytes of the audit certificate PDF to attach */
  auditPdfBytes?: Uint8Array | null
}): Promise<void> {
  const html = renderCompletedEmail({
    ownerName: opts.ownerName,
    documentName: opts.documentName,
    documentUrl: opts.documentUrl,
    totalSigners: opts.totalSigners,
    completedAt: opts.completedAt,
  })

  const attachments: import("./graph-client").GraphMailAttachment[] = []

  const safeName = opts.documentName.replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "document"

  if (opts.signedPdfBytes) {
    attachments.push({
      name: `${safeName} - Signed.pdf`,
      contentType: "application/pdf",
      bytes: opts.signedPdfBytes,
    })
  }
  if (opts.auditPdfBytes) {
    attachments.push({
      name: `${safeName} - Audit Certificate.pdf`,
      contentType: "application/pdf",
      bytes: opts.auditPdfBytes,
    })
  }

  await sendGraphMail({
    userAccessToken: opts.userAccessToken,
    fromEmail: opts.ownerEmail,
    fromName: opts.ownerName,
    subject: `ลงนามครบแล้ว / All signed — "${opts.documentName}"`,
    htmlBody: html,
    toAddress: opts.ownerEmail,
    toName: opts.ownerName,
    attachments: attachments.length > 0 ? attachments : undefined,
  })
}

// ---------------------------------------------------------------------------
// Send signed PDF copy to the signer who just signed
// Sent FROM the document owner's mailbox TO the signer
// ---------------------------------------------------------------------------

export async function sendSignerCopy(opts: {
  userAccessToken: string
  ownerEmail: string
  ownerName: string
  signerName: string
  signerEmail: string
  documentName: string
  signedAt: Date
  signedPdfBytes?: Uint8Array | null
  auditPdfBytes?: Uint8Array | null
}): Promise<void> {
  const html = renderSignerCopyEmail({
    signerName: opts.signerName,
    documentName: opts.documentName,
    ownerName: opts.ownerName,
    signedAt: opts.signedAt,
  })

  const attachments: import("./graph-client").GraphMailAttachment[] = []
  const safeName = opts.documentName.replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "document"

  if (opts.signedPdfBytes) {
    attachments.push({
      name: `${safeName} - Signed.pdf`,
      contentType: "application/pdf",
      bytes: opts.signedPdfBytes,
    })
  }
  if (opts.auditPdfBytes) {
    attachments.push({
      name: `${safeName} - Audit Certificate.pdf`,
      contentType: "application/pdf",
      bytes: opts.auditPdfBytes,
    })
  }

  await sendGraphMail({
    userAccessToken: opts.userAccessToken,
    fromEmail: opts.ownerEmail,
    fromName: opts.ownerName,
    subject: `สำเนาเอกสารที่เซ็นแล้ว / Your signed copy — "${opts.documentName}"`,
    htmlBody: html,
    toAddress: opts.signerEmail,
    toName: opts.signerName,
    attachments: attachments.length > 0 ? attachments : undefined,
  })
}

// ---------------------------------------------------------------------------
// Notify a signer that the document was voided
// Sent FROM the document owner's mailbox TO the signer
// ---------------------------------------------------------------------------

export async function sendVoidNotification(opts: {
  userAccessToken: string
  ownerEmail: string
  ownerName: string
  signerName: string
  signerEmail: string
  documentName: string
  voidReason: string
}): Promise<void> {
  const html = renderVoidNotificationEmail({
    signerName: opts.signerName,
    documentName: opts.documentName,
    ownerName: opts.ownerName,
    voidReason: opts.voidReason,
  })
  await sendGraphMail({
    userAccessToken: opts.userAccessToken,
    fromEmail: opts.ownerEmail,
    fromName: opts.ownerName,
    subject: `ยกเลิกคำขอลงนาม / Cancelled — "${opts.documentName}"`,
    htmlBody: html,
    toAddress: opts.signerEmail,
    toName: opts.signerName,
  })
}

// ---------------------------------------------------------------------------
// Notify document owner that a signer declined
// Sent FROM the document owner's mailbox TO themselves
// ---------------------------------------------------------------------------

export async function sendDeclineNotification(opts: {
  userAccessToken: string
  ownerEmail: string
  ownerName: string
  signerName: string
  signerEmail: string
  documentName: string
  documentUrl: string
  declineReason: string
}): Promise<void> {
  const html = renderDeclineNotificationEmail({
    ownerName: opts.ownerName,
    signerName: opts.signerName,
    signerEmail: opts.signerEmail,
    documentName: opts.documentName,
    documentUrl: opts.documentUrl,
    declineReason: opts.declineReason,
  })
  await sendGraphMail({
    userAccessToken: opts.userAccessToken,
    fromEmail: opts.ownerEmail,
    fromName: opts.ownerName,
    subject: `${opts.signerName} ปฏิเสธลงนาม / declined "${opts.documentName}"`,
    htmlBody: html,
    toAddress: opts.ownerEmail,
    toName: opts.ownerName,
  })
}
