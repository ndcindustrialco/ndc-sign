/**
 * Microsoft Graph API — Client Credentials Flow
 *
 * Uses application-level permissions to send email FROM any user mailbox
 * in the tenant by calling /users/{email}/sendMail.
 *
 * Required Azure AD App Registration:
 *   Application permission: Mail.Send (NOT delegated)
 *   Application permission: User.ReadBasic.All (for people search)
 *
 * Required env vars:
 *   AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, AZURE_AD_TENANT_ID
 */

const GRAPH_BASE = "https://graph.microsoft.com/v1.0"

// In-memory cache — valid for (expires_in - 5min)
let cachedToken: { value: string; expiresAt: number } | null = null

export async function getClientCredentialsToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value
  }

  const tenantId = process.env.AZURE_AD_TENANT_ID
  const clientId = process.env.AZURE_AD_CLIENT_ID
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("[Graph] Missing AZURE_AD_TENANT_ID / CLIENT_ID / CLIENT_SECRET env vars")
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
  })

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`[Graph] Client credentials token failed (${res.status}): ${text}`)
  }

  const data = await res.json() as { access_token: string; expires_in: number }

  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  }

  return cachedToken.value
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface GraphMailAttachment {
  name: string
  contentType: string
  bytes: Uint8Array | Buffer
}

export interface GraphMailMessage {
  subject: string
  htmlBody: string
  toAddress: string
  toName: string
  /** Email of the document owner — used as the actual sending mailbox */
  fromEmail: string
  fromName?: string
  attachments?: GraphMailAttachment[]
  /** Ignored — kept for API compatibility during transition */
  userAccessToken?: string
}

/**
 * Send email via Graph POST /users/{fromEmail}/sendMail
 * Requires Application permission: Mail.Send
 * Mail is sent FROM the document owner's actual mailbox.
 */
export async function sendGraphMail(msg: GraphMailMessage): Promise<void> {
  const token = await getClientCredentialsToken()

  const message: Record<string, unknown> = {
    subject: msg.subject,
    body: { contentType: "HTML", content: msg.htmlBody },
    toRecipients: [{ emailAddress: { address: msg.toAddress, name: msg.toName } }],
    from: { emailAddress: { address: msg.fromEmail, name: msg.fromName ?? msg.fromEmail } },
  }

  if (msg.attachments && msg.attachments.length > 0) {
    message.attachments = msg.attachments.map((att) => ({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: att.name,
      contentType: att.contentType,
      contentBytes: Buffer.from(att.bytes).toString("base64"),
    }))
  }

  const res = await fetch(
    `${GRAPH_BASE}/users/${encodeURIComponent(msg.fromEmail)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, saveToSentItems: true }),
      cache: "no-store",
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`[Graph] sendMail failed (${res.status}): ${text}`)
  }
}
