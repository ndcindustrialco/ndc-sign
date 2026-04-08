const APP_NAME = "eSign"
const ACCENT_COLOR = "#2563eb" // blue-600

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
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
                This email was sent by ${APP_NAME}. If you did not expect this, you can ignore it.
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
  const expires = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(data.expiresAt)

  const messageBlock = data.customMessage
    ? `<p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.7;white-space:pre-line;">${escapeHtml(data.customMessage)}</p>`
    : ""

  const content = `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#18181b;letter-spacing:-0.3px;">
      Document ready to sign
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
      ${escapeHtml(data.senderName)} invited you to sign
      <span style="color:#18181b;font-weight:500;">${escapeHtml(data.documentName)}</span>.
    </p>
    ${messageBlock}

    <table cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;padding:14px 16px;margin-bottom:28px;width:100%;">
      <tr>
        <td style="font-size:13px;color:#71717a;line-height:1.8;">
          <span style="color:#18181b;">Document</span> &nbsp;${escapeHtml(data.documentName)}<br/>
          <span style="color:#18181b;">Invited by</span> &nbsp;${escapeHtml(data.senderName)}<br/>
          <span style="color:#18181b;">Expires</span> &nbsp;${expires}
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:8px;background:${ACCENT_COLOR};">
          <a href="${escapeHtml(data.signingUrl)}"
             style="display:inline-block;padding:11px 24px;font-size:14px;font-weight:500;color:#ffffff;text-decoration:none;border-radius:8px;">
            Review &amp; Sign
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:20px 0 0;font-size:12px;color:#a1a1aa;line-height:1.6;">
      Or copy this link:<br/>
      <a href="${escapeHtml(data.signingUrl)}" style="color:${ACCENT_COLOR};word-break:break-all;">${escapeHtml(data.signingUrl)}</a>
    </p>
    <p style="margin:6px 0 0;font-size:12px;color:#a1a1aa;">
      This link is single-use and expires on ${expires}.
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
  const signedAt = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(data.signedAt)

  const content = `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#18181b;letter-spacing:-0.3px;">
      Document signed
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
      <span style="color:#18181b;font-weight:500;">${escapeHtml(data.signerName)}</span>
      (${escapeHtml(data.signerEmail)}) has signed
      <span style="color:#18181b;font-weight:500;">${escapeHtml(data.documentName)}</span>.
    </p>

    <table cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;padding:14px 16px;margin-bottom:28px;width:100%;">
      <tr>
        <td style="font-size:13px;color:#71717a;line-height:1.8;">
          <span style="color:#18181b;">Signed by</span> &nbsp;${escapeHtml(data.signerName)} &lt;${escapeHtml(data.signerEmail)}&gt;<br/>
          <span style="color:#18181b;">Signed at</span> &nbsp;${signedAt}
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:8px;border:1px solid #e4e4e7;">
          <a href="${escapeHtml(data.documentUrl)}"
             style="display:inline-block;padding:11px 24px;font-size:14px;font-weight:500;color:#18181b;text-decoration:none;border-radius:8px;">
            View Document
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
  const completedAt = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(data.completedAt)

  const content = `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#18181b;letter-spacing:-0.3px;">
      All signatures collected
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
      <span style="color:#18181b;font-weight:500;">${escapeHtml(data.documentName)}</span>
      has been fully signed by all ${data.totalSigners} recipient${data.totalSigners !== 1 ? "s" : ""}.
      The signed PDF is ready to download.
    </p>

    <table cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;padding:14px 16px;margin-bottom:28px;width:100%;">
      <tr>
        <td style="font-size:13px;color:#71717a;line-height:1.8;">
          <span style="color:#18181b;">Document</span> &nbsp;${escapeHtml(data.documentName)}<br/>
          <span style="color:#18181b;">Completed at</span> &nbsp;${completedAt}<br/>
          <span style="color:#18181b;">Total signers</span> &nbsp;${data.totalSigners}
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:8px;background:${ACCENT_COLOR};">
          <a href="${escapeHtml(data.documentUrl)}"
             style="display:inline-block;padding:11px 24px;font-size:14px;font-weight:500;color:#ffffff;text-decoration:none;border-radius:8px;">
            Download Signed PDF
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
      Document cancelled
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
      Hi ${escapeHtml(data.signerName)},<br/>
      The signing request for
      <span style="color:#18181b;font-weight:500;">${escapeHtml(data.documentName)}</span>
      has been cancelled by ${escapeHtml(data.ownerName)}.
      No further action is needed.
    </p>

    <table cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;padding:14px 16px;margin-bottom:28px;width:100%;">
      <tr>
        <td style="font-size:13px;color:#71717a;line-height:1.8;">
          <span style="color:#18181b;">Reason</span> &nbsp;${escapeHtml(data.voidReason)}
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#a1a1aa;">
      If you have questions, please contact ${escapeHtml(data.ownerName)} directly.
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
      Signing declined
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
      <span style="color:#18181b;font-weight:500;">${escapeHtml(data.signerName)}</span>
      (${escapeHtml(data.signerEmail)}) has declined to sign
      <span style="color:#18181b;font-weight:500;">${escapeHtml(data.documentName)}</span>.
    </p>

    <table cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;padding:14px 16px;margin-bottom:28px;width:100%;">
      <tr>
        <td style="font-size:13px;color:#71717a;line-height:1.8;">
          <span style="color:#18181b;">Declined by</span> &nbsp;${escapeHtml(data.signerName)} &lt;${escapeHtml(data.signerEmail)}&gt;<br/>
          <span style="color:#18181b;">Reason</span> &nbsp;${escapeHtml(data.declineReason)}
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:8px;border:1px solid #e4e4e7;">
          <a href="${escapeHtml(data.documentUrl)}"
             style="display:inline-block;padding:11px 24px;font-size:14px;font-weight:500;color:#18181b;text-decoration:none;border-radius:8px;">
            View Document
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
  const signedAt = new Intl.DateTimeFormat("en-US", {
    month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC", timeZoneName: "short",
  }).format(new Date(data.signedAt))

  const content = `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#18181b;letter-spacing:-0.3px;">
      Your signed copy is attached
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
      Hi ${escapeHtml(data.signerName)},<br/>
      Thank you for signing
      <span style="color:#18181b;font-weight:500;">${escapeHtml(data.documentName)}</span>.
      Your signed copy and audit certificate are attached for your records.
    </p>

    <table cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;padding:14px 16px;margin-bottom:28px;width:100%;">
      <tr>
        <td style="font-size:13px;color:#71717a;line-height:1.8;">
          <span style="color:#18181b;">Document</span> &nbsp;${escapeHtml(data.documentName)}<br/>
          <span style="color:#18181b;">Signed at</span> &nbsp;${signedAt}<br/>
          <span style="color:#18181b;">Sent by</span> &nbsp;${escapeHtml(data.ownerName)}
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#a1a1aa;">
      Please keep this email for your records. If you have any questions, contact ${escapeHtml(data.ownerName)} directly.
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
