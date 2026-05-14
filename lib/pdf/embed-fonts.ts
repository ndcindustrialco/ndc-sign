import { PDFDocument, StandardFonts } from "pdf-lib"
import { logger } from "@/lib/logger"

export type EmbeddedFonts = {
  regular: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>
  medium: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>
  bold: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>
  mono: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>
}

/**
 * Embed standard fonts (Helvetica/Courier) - support ASCII only.
 * Thai text will be handled via sanitization in PDF generation.
 */
export async function embedThaiFont(pdfDoc: PDFDocument): Promise<EmbeddedFonts> {
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const medium = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const mono = await pdfDoc.embedFont(StandardFonts.Courier)

  logger.warn("[embedFont] using standard fonts (ASCII only)")
  return { regular, medium, bold, mono }
}

/**
 * Sanitize text for PDF output - removes Thai characters and replaces with ASCII placeholder
 * pdf-lib's standard fonts only support ASCII/Latin characters
 */
export function sanitizeTextForPDF(text: string): string {
  if (!text) return ""

  // Check if text contains non-ASCII characters (e.g., Thai)
  const hasNonASCII = /[^\x00-\x7F]/.test(text)
  if (hasNonASCII) {
    logger.warn("[sanitizeTextForPDF] text contains non-ASCII characters, using placeholder", { original: text })
    return "[text]"
  }

  return text.slice(0, 100) // Safety clamp
}
