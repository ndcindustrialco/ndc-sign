import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib"
import { createHash } from "crypto"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuditEventRow = {
  type: string
  actorEmail: string | null
  actorName: string | null
  meta: unknown
  createdAt: Date
}

export type AuditSigner = {
  name: string
  email: string
  status: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_W = 595
const PAGE_H = 842
const MARGIN = 48
const CONTENT_W = PAGE_W - MARGIN * 2

const GRAY_DARK: [number, number, number] = [0.12, 0.12, 0.12]
const GRAY_MID: [number, number, number] = [0.4, 0.4, 0.4]
const GRAY_LIGHT: [number, number, number] = [0.65, 0.65, 0.65]
const GREEN: [number, number, number] = [0.05, 0.55, 0.18]
const RED: [number, number, number] = [0.75, 0.1, 0.1]

const EVENT_LABELS: Record<string, string> = {
  DOCUMENT_CREATED: "Document created",
  DOCUMENT_SENT: "Email sent",
  DOCUMENT_COMPLETED: "Submission completed",
  DOCUMENT_VOIDED: "Document voided",
  SIGNER_INVITED: "Email sent",
  SIGNER_OPENED: "Email link clicked",
  SIGNER_SIGNED: "Submission completed",
  SIGNER_DECLINED: "Signing declined",
  SIGNER_REINVITED: "Email re-sent",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date, timeZone = "Asia/Bangkok"): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
    timeZoneName: "short",
  }).format(new Date(date))
}

function sessionIdFromEmail(email: string): string {
  return createHash("md5").update(email + Date.now().toString()).digest("hex")
}

function wrapText(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = text.split(" ")
  const lines: string[] = []
  let cur = ""
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (font.widthOfTextAtSize(test, size) <= maxW) {
      cur = test
    } else {
      if (cur) lines.push(cur)
      // If a single word is still too long, force-break it
      if (font.widthOfTextAtSize(w, size) > maxW) {
        let part = ""
        for (const ch of w) {
          if (font.widthOfTextAtSize(part + ch, size) <= maxW) {
            part += ch
          } else {
            lines.push(part)
            part = ch
          }
        }
        cur = part
      } else {
        cur = w
      }
    }
  }
  if (cur) lines.push(cur)
  return lines
}

// ---------------------------------------------------------------------------
// Page state (mutable, passed around)
// ---------------------------------------------------------------------------

type State = {
  doc: PDFDocument
  page: PDFPage
  y: number
  bold: PDFFont
  regular: PDFFont
  mono: PDFFont
}

function ensureSpace(s: State, needed: number) {
  if (s.y - needed < MARGIN + 20) {
    s.page = s.doc.addPage([PAGE_W, PAGE_H])
    s.y = PAGE_H - MARGIN
  }
}

function drawText(
  s: State,
  text: string,
  opts: {
    font?: PDFFont
    size: number
    x?: number
    color?: [number, number, number]
    lineGap?: number
  }
) {
  const font = opts.font ?? s.regular
  const [r, g, b] = opts.color ?? GRAY_DARK
  s.page.drawText(text, {
    x: opts.x ?? MARGIN,
    y: s.y,
    font,
    size: opts.size,
    color: rgb(r, g, b),
  })
  s.y -= opts.size + (opts.lineGap ?? 5)
}

function drawWrappedText(
  s: State,
  text: string,
  opts: {
    font?: PDFFont
    size: number
    x?: number
    maxW?: number
    color?: [number, number, number]
    lineGap?: number
  }
) {
  const font = opts.font ?? s.regular
  const maxW = opts.maxW ?? CONTENT_W
  const x = opts.x ?? MARGIN
  const lines = wrapText(text, font, opts.size, maxW)
  for (const line of lines) {
    ensureSpace(s, opts.size + 8)
    drawText(s, line, { ...opts, font, x })
  }
}

function drawHRule(s: State, color: [number, number, number] = [0.82, 0.82, 0.82], gap = 10) {
  s.page.drawLine({
    start: { x: MARGIN, y: s.y },
    end: { x: PAGE_W - MARGIN, y: s.y },
    thickness: 0.5,
    color: rgb(...color),
  })
  s.y -= gap
}

function drawLabelValue(
  s: State,
  label: string,
  value: string,
  opts: { labelSize?: number; valueSize?: number; gap?: number } = {}
) {
  const ls = opts.labelSize ?? 8
  const vs = opts.valueSize ?? 9
  ensureSpace(s, ls + vs + 14)
  drawText(s, label, { font: s.bold, size: ls, color: GRAY_MID, lineGap: 2 })
  drawWrappedText(s, value || "—", { font: s.regular, size: vs, color: GRAY_DARK })
  s.y -= opts.gap ?? 4
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function generateAuditPdf(opts: {
  documentName: string
  documentHash: string | null       // original PDF SHA-256
  signedDocumentHash?: string | null // signed PDF SHA-256 (after all sign)
  ownerEmail: string
  ownerName: string
  signers: AuditSigner[]
  auditEvents: AuditEventRow[]
  completedAt: Date
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const mono = await pdfDoc.embedFont(StandardFonts.Courier)

  const s: State = {
    doc: pdfDoc,
    page: pdfDoc.addPage([PAGE_W, PAGE_H]),
    y: PAGE_H - MARGIN,
    bold,
    regular,
    mono,
  }

  // ── Cover header ──────────────────────────────────────────────────────────
  drawText(s, "eSign", { font: bold, size: 22, color: GRAY_DARK })
  s.y -= 2
  drawText(s, "Audit Certificate", { font: regular, size: 13, color: GRAY_MID })
  s.y -= 8
  drawHRule(s, [0.15, 0.15, 0.15], 14)

  // Document name + hashes
  drawText(s, opts.documentName, { font: bold, size: 13, color: GRAY_DARK })
  s.y -= 4

  if (opts.documentHash) {
    drawText(s, "Original SHA256:", { font: bold, size: 8, color: GRAY_MID, lineGap: 2 })
    drawWrappedText(s, opts.documentHash, {
      font: mono,
      size: 7.5,
      color: GRAY_MID,
      maxW: CONTENT_W,
    })
    s.y -= 2
  }

  if (opts.signedDocumentHash) {
    drawText(s, "Result SHA256:", { font: bold, size: 8, color: GRAY_MID, lineGap: 2 })
    drawWrappedText(s, opts.signedDocumentHash, {
      font: mono,
      size: 7.5,
      color: GRAY_MID,
      maxW: CONTENT_W,
    })
    s.y -= 2
  }

  drawText(s, `Generated at: ${formatDate(opts.completedAt)}`, {
    font: regular,
    size: 8,
    color: GRAY_MID,
  })

  s.y -= 10

  // ── Per-signer sections ───────────────────────────────────────────────────
  for (const signer of opts.signers) {
    ensureSpace(s, 120)
    drawHRule(s, [0.75, 0.75, 0.75], 10)

    // Signer heading
    const statusColor = signer.status === "SIGNED" ? GREEN : signer.status === "DECLINED" ? RED : GRAY_LIGHT
    const statusLabel = signer.status === "SIGNED" ? "Signed" : signer.status === "DECLINED" ? "Declined" : signer.status

    drawText(s, signer.name, { font: bold, size: 12, color: GRAY_DARK })

    // Status right-aligned on same row — draw it, then adjust y back
    const statusW = bold.widthOfTextAtSize(statusLabel, 10)
    s.y += 12 + 5  // undo last drawText descent
    s.page.drawText(statusLabel, {
      x: PAGE_W - MARGIN - statusW,
      y: s.y,
      font: bold,
      size: 10,
      color: rgb(...statusColor),
    })
    s.y -= 12 + 5

    s.y -= 4

    // Find events for this signer
    const signerEvents = opts.auditEvents.filter((e) => {
      const meta = e.meta as Record<string, unknown> | null
      const eventEmail = e.actorEmail ?? (meta?.signerEmail as string | undefined) ?? ""
      return eventEmail === signer.email
    })

    // Signed event metadata (IP, UA, timezone)
    const signedEvent = signerEvents.find((e) => e.type === "SIGNER_SIGNED")
    const signedMeta = signedEvent?.meta as Record<string, unknown> | null

    const ip = (signedMeta?.ip as string | null) ?? null
    const ua = (signedMeta?.userAgent as string | null) ?? null
    const tz = (signedMeta?.timezone as string | null) ?? null
    const sessionId = sessionIdFromEmail(signer.email)

    // Email
    drawLabelValue(s, "Email", signer.email)
    drawText(s, "Email verification: Verified", { font: regular, size: 8, color: GREEN, lineGap: 6 })

    if (ip) drawLabelValue(s, "IP Address", ip)
    drawLabelValue(s, "Session ID", sessionId)
    if (ua) drawLabelValue(s, "User Agent", ua)
    if (tz) drawLabelValue(s, "Time Zone", tz)

    // Fields signed by this signer
    const fieldLabels = signerEvents
      .filter((e) => e.type === "SIGNER_SIGNED")
      .flatMap((e) => {
        const meta = e.meta as Record<string, unknown> | null
        const fields = meta?.fields as string[] | undefined
        return fields ?? []
      })

    if (fieldLabels.length > 0) {
      drawLabelValue(s, "Fields Signed", fieldLabels.join(", "))
    }
  }

  // ── Event Log ─────────────────────────────────────────────────────────────
  s.y -= 6
  ensureSpace(s, 40)
  drawHRule(s, [0.75, 0.75, 0.75], 10)
  drawText(s, "Event Log", { font: bold, size: 12, color: GRAY_DARK })
  s.y -= 6

  for (const event of opts.auditEvents) {
    const meta = event.meta as Record<string, unknown> | null
    const who = event.actorEmail ?? (meta?.signerEmail as string | undefined) ?? opts.ownerEmail
    const label = EVENT_LABELS[event.type] ?? event.type
    const dateStr = formatDate(event.createdAt)

    ensureSpace(s, 18)

    // Date column (left)
    s.page.drawText(dateStr, {
      x: MARGIN,
      y: s.y,
      font: regular,
      size: 8,
      color: rgb(...GRAY_MID),
    })

    // Action + who (right of date)
    const actionText = `${label} by ${who}`
    const dateColW = regular.widthOfTextAtSize(dateStr, 8) + 12
    const actionLines = wrapText(actionText, regular, 8, CONTENT_W - dateColW)

    s.page.drawText(actionLines[0] ?? actionText, {
      x: MARGIN + dateColW,
      y: s.y,
      font: regular,
      size: 8,
      color: rgb(...GRAY_DARK),
    })
    s.y -= 13

    // Overflow lines
    for (let i = 1; i < actionLines.length; i++) {
      ensureSpace(s, 13)
      s.page.drawText(actionLines[i]!, {
        x: MARGIN + dateColW,
        y: s.y,
        font: regular,
        size: 8,
        color: rgb(...GRAY_DARK),
      })
      s.y -= 13
    }
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  ensureSpace(s, 24)
  s.y -= 8
  drawHRule(s, [0.82, 0.82, 0.82], 6)
  drawText(s, `This audit certificate was generated by eSign · ${formatDate(new Date())}`, {
    font: regular,
    size: 7,
    color: GRAY_LIGHT,
  })

  return pdfDoc.save()
}
