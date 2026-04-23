const APP_NAME = "eSign"
const ACCENT_COLOR = "#2563eb" // blue-600

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#ffffff;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;">
              <span style="font-size:15px;font-weight:600;color:#18181b;letter-spacing:-0.3px;">${APP_NAME}</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td>
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:40px;border-top:1px solid #f4f4f5;margin-top:40px;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">
                ส่งอัตโนมัติจาก ${APP_NAME} / Automated message from ${APP_NAME}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Format date — dual language
// ---------------------------------------------------------------------------

function formatDate(date: Date): string {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  }).format(date)
  return `${formatted} (UTC+7)`
}

// ---------------------------------------------------------------------------
// Invite to Sign
// ---------------------------------------------------------------------------

export interface InviteEmailData {
  signerName: string
  documentName: string
  senderName: string
  signingUrl: string
  expiresAt: Date
  customMessage?: string
}

export function renderInviteEmail(data: InviteEmailData): string {
  const expires = formatDate(data.expiresAt)

  const messageBlock = data.customMessage
    ? `<p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.7;white-space:pre-line;">${escapeHtml(data.customMessage)}</p>`
    : ""

  const content = `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#18181b;letter-spacing:-0.3px;">
      เอกสารรอลงนาม / Sign request
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
      ${escapeHtml(data.senderName)} ขอให้คุณลงนาม
      <span style="color:#18181b;font-weight:500;">${escapeHtml(data.documentName)}</span>
    </p>
    ${messageBlock}

    <table cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;padding:14px 16px;margin-bottom:28px;width:100%;">
      <tr>
        <td style="font-size:13px;color:#71717a;line-height:1.8;">
          <span style="color:#18181b;">ผู้ส่ง / From</span> &nbsp;${escapeHtml(data.senderName)}<br/>
          <span style="color:#18181b;">หมดอายุ / Expires</span> &nbsp;${expires}
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:8px;background:${ACCENT_COLOR};">
          <a href="${escapeHtml(data.signingUrl)}"
             style="display:inline-block;padding:11px 24px;font-size:14px;font-weight:500;color:#ffffff;text-decoration:none;border-radius:8px;">
            ลงนาม / Sign
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:20px 0 0;font-size:12px;color:#a1a1aa;line-height:1.6;">
      ลิงก์ใช้ได้ครั้งเดียว / Single-use link<br/>
      <a href="${escapeHtml(data.signingUrl)}" style="color:${ACCENT_COLOR};word-break:break-all;">${escapeHtml(data.signingUrl)}</a>
    </p>
  `
  return baseLayout(content)
}

// ---------------------------------------------------------------------------
// Signer has signed — notify document owner
// ---------------------------------------------------------------------------

export interface SignedNotificationData {
  ownerName: string
  signerName: string
  signerEmail: string
  documentName: string
  documentUrl: string
  signedAt: Date
}

export function renderSignedNotificationEmail(data: SignedNotificationData): string {
  const signedAt = formatDate(data.signedAt)

  const content = `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#18181b;letter-spacing:-0.3px;">
      มีคนลงนามแล้ว / Signed
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
      <span style="color:#18181b;font-weight:500;">${escapeHtml(data.signerName)}</span>
      ลงนาม
      <span style="color:#18181b;font-weight:500;">${escapeHtml(data.documentName)}</span>
      แล้ว (ไฟล์แนบ)
    </p>

    <table cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;padding:14px 16px;margin-bottom:28px;width:100%;">
      <tr>
        <td style="font-size:13px;color:#71717a;line-height:1.8;">
          <span style="color:#18181b;">ผู้ลงนาม / Signer</span> &nbsp;${escapeHtml(data.signerName)} &lt;${escapeHtml(data.signerEmail)}&gt;<br/>
          <span style="color:#18181b;">เวลา / At</span> &nbsp;${signedAt}
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:8px;border:1px solid #e4e4e7;">
          <a href="${escapeHtml(data.documentUrl)}"
             style="display:inline-block;padding:11px 24px;font-size:14px;font-weight:500;color:#18181b;text-decoration:none;border-radius:8px;">
            ดูเอกสาร / View
          </a>
        </td>
      </tr>
    </table>
  `
  return baseLayout(content)
}

// ---------------------------------------------------------------------------
// All signers done — notify document owner
// ---------------------------------------------------------------------------

export interface CompletedNotificationData {
  ownerName: string
  documentName: string
  documentUrl: string
  totalSigners: number
  completedAt: Date
}

export function renderCompletedEmail(data: CompletedNotificationData): string {
  const completedAt = formatDate(data.completedAt)

  const content = `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#18181b;letter-spacing:-0.3px;">
      ลงนามครบแล้ว / Completed
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
      <span style="color:#18181b;font-weight:500;">${escapeHtml(data.documentName)}</span>
      ลงนามครบ ${data.totalSigners} คน พร้อมดาวน์โหลด
    </p>

    <table cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;padding:14px 16px;margin-bottom:28px;width:100%;">
      <tr>
        <td style="font-size:13px;color:#71717a;line-height:1.8;">
          <span style="color:#18181b;">เสร็จเมื่อ / At</span> &nbsp;${completedAt}<br/>
          <span style="color:#18181b;">ผู้ลงนาม / Signers</span> &nbsp;${data.totalSigners}
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:8px;background:${ACCENT_COLOR};">
          <a href="${escapeHtml(data.documentUrl)}"
             style="display:inline-block;padding:11px 24px;font-size:14px;font-weight:500;color:#ffffff;text-decoration:none;border-radius:8px;">
            ดาวน์โหลด / Download
          </a>
        </td>
      </tr>
    </table>
  `
  return baseLayout(content)
}

// ---------------------------------------------------------------------------
// Document voided — notify signers
// ---------------------------------------------------------------------------

export interface VoidNotificationData {
  signerName: string
  documentName: string
  ownerName: string
  voidReason: string
}

export function renderVoidNotificationEmail(data: VoidNotificationData): string {
  const content = `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#18181b;letter-spacing:-0.3px;">
      เอกสารถูกยกเลิก / Cancelled
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
      <span style="color:#18181b;font-weight:500;">${escapeHtml(data.documentName)}</span>
      ถูกยกเลิกโดย ${escapeHtml(data.ownerName)} / cancelled by ${escapeHtml(data.ownerName)}
    </p>

    <table cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;padding:14px 16px;margin-bottom:28px;width:100%;">
      <tr>
        <td style="font-size:13px;color:#71717a;line-height:1.8;">
          <span style="color:#18181b;">เหตุผล / Reason</span> &nbsp;${escapeHtml(data.voidReason)}
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#a1a1aa;">
      สอบถาม ติดต่อ ${escapeHtml(data.ownerName)} / Contact ${escapeHtml(data.ownerName)} for questions
    </p>
  `
  return baseLayout(content)
}

// ---------------------------------------------------------------------------
// Signer declined — notify document owner
// ---------------------------------------------------------------------------

export interface DeclineNotificationData {
  ownerName: string
  signerName: string
  signerEmail: string
  documentName: string
  documentUrl: string
  declineReason: string
}

export function renderDeclineNotificationEmail(data: DeclineNotificationData): string {
  const content = `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#18181b;letter-spacing:-0.3px;">
      ปฏิเสธลงนาม / Declined
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
      <span style="color:#18181b;font-weight:500;">${escapeHtml(data.signerName)}</span>
      ปฏิเสธลงนาม
      <span style="color:#18181b;font-weight:500;">${escapeHtml(data.documentName)}</span>
    </p>

    <table cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;padding:14px 16px;margin-bottom:28px;width:100%;">
      <tr>
        <td style="font-size:13px;color:#71717a;line-height:1.8;">
          <span style="color:#18181b;">ผู้ปฏิเสธ / By</span> &nbsp;${escapeHtml(data.signerName)} &lt;${escapeHtml(data.signerEmail)}&gt;<br/>
          <span style="color:#18181b;">เหตุผล / Reason</span> &nbsp;${escapeHtml(data.declineReason)}
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:8px;border:1px solid #e4e4e7;">
          <a href="${escapeHtml(data.documentUrl)}"
             style="display:inline-block;padding:11px 24px;font-size:14px;font-weight:500;color:#18181b;text-decoration:none;border-radius:8px;">
            ดูเอกสาร / View
          </a>
        </td>
      </tr>
    </table>
  `
  return baseLayout(content)
}

// ---------------------------------------------------------------------------
// Signer copy — sent to signer after they sign, with the signed PDF attached
// ---------------------------------------------------------------------------

export interface SignerCopyData {
  signerName: string
  documentName: string
  ownerName: string
  signedAt: Date
}

export function renderSignerCopyEmail(data: SignerCopyData): string {
  const signedAt = formatDate(new Date(data.signedAt))

  const content = `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#18181b;letter-spacing:-0.3px;">
      สำเนาเอกสาร / Your signed copy
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
      ขอบคุณที่ลงนาม
      <span style="color:#18181b;font-weight:500;">${escapeHtml(data.documentName)}</span>
      ไฟล์แนบมาพร้อมอีเมลนี้
    </p>

    <table cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;padding:14px 16px;margin-bottom:28px;width:100%;">
      <tr>
        <td style="font-size:13px;color:#71717a;line-height:1.8;">
          <span style="color:#18181b;">เวลา / At</span> &nbsp;${signedAt}<br/>
          <span style="color:#18181b;">ผู้ส่ง / From</span> &nbsp;${escapeHtml(data.ownerName)}
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#a1a1aa;">
      เก็บอีเมลนี้ไว้เป็นหลักฐาน / Keep this email for your records
    </p>
  `
  return baseLayout(content)
}

// ---------------------------------------------------------------------------
// Reminder to Sign — sent to a signer who has not yet signed
// ---------------------------------------------------------------------------

export interface ReminderEmailData {
  signerName: string
  documentName: string
  senderName: string
  signingUrl: string
  expiresAt: Date
  customMessage?: string
}

export function renderReminderEmail(data: ReminderEmailData): string {
  const expires = formatDate(data.expiresAt)

  const messageBlock = data.customMessage
    ? `<p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.7;white-space:pre-line;">${escapeHtml(data.customMessage)}</p>`
    : ""

  const content = `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#18181b;letter-spacing:-0.3px;">
      แจ้งเตือนลงนาม / Reminder
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
      ${escapeHtml(data.senderName)} ฝากเตือนให้ลงนาม
      <span style="color:#18181b;font-weight:500;">${escapeHtml(data.documentName)}</span>
    </p>
    ${messageBlock}

    <table cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;padding:14px 16px;margin-bottom:28px;width:100%;">
      <tr>
        <td style="font-size:13px;color:#71717a;line-height:1.8;">
          <span style="color:#18181b;">ผู้ส่ง / From</span> &nbsp;${escapeHtml(data.senderName)}<br/>
          <span style="color:#18181b;">หมดอายุ / Expires</span> &nbsp;${expires}
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:8px;background:${ACCENT_COLOR};">
          <a href="${escapeHtml(data.signingUrl)}"
             style="display:inline-block;padding:11px 24px;font-size:14px;font-weight:500;color:#ffffff;text-decoration:none;border-radius:8px;">
            ลงนาม / Sign
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:20px 0 0;font-size:12px;color:#a1a1aa;line-height:1.6;">
      ลิงก์ใช้ได้ครั้งเดียว / Single-use link<br/>
      <a href="${escapeHtml(data.signingUrl)}" style="color:${ACCENT_COLOR};word-break:break-all;">${escapeHtml(data.signingUrl)}</a>
    </p>
  `
  return baseLayout(content)
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
