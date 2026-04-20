import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib"
import { createHash } from "crypto"
import { prisma } from "@/lib/prisma"
import { supabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FieldWithSubmission = {
  id: string
  type: string       // FieldType — kept as string to avoid import cycle
  page: number       // 1-based
  x: number          // % from left
  y: number          // % from top
  width: number      // % of page width
  height: number     // % of page height
  value: string      // base64 PNG (SIGNATURE) or plain text
}

// ---------------------------------------------------------------------------
// Coordinate conversion
// pdf-lib origin: bottom-left
// Our overlay origin: top-left
// ---------------------------------------------------------------------------

function toPdfCoords(
  field: { x: number; y: number; width: number; height: number },
  pageWidth: number,
  pageHeight: number
) {
  const x = (field.x / 100) * pageWidth
  const w = (field.width / 100) * pageWidth
  const h = (field.height / 100) * pageHeight
  // y from top → convert to y from bottom
  const y = pageHeight - (field.y / 100) * pageHeight - h
  return { x, y, w, h }
}

// ---------------------------------------------------------------------------
// generateSignedPdf
// Called after signer submits — embeds all submissions into the PDF
// ---------------------------------------------------------------------------

export async function generateSignedPdf(
  documentId: string,
  signerId: string
): Promise<{ signedBytes: Uint8Array; signedPath: string }> {
  // 1. Load document + signer submissions
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      storagePath: true,
      uploadedBy: true,
      signers: {
        select: {
          id: true,
          submissions: {
            select: {
              fieldId: true,
              value: true,
              field: {
                select: {
                  id: true,
                  type: true,
                  page: true,
                  x: true,
                  y: true,
                  width: true,
                  height: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!document) throw new Error(`Document ${documentId} not found`)

  // 2. Download original PDF from Supabase Storage
  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .download(document.storagePath)

  if (downloadError || !fileData) {
    throw new Error(`Failed to download PDF: ${downloadError?.message}`)
  }

  const originalBytes = new Uint8Array(await fileData.arrayBuffer())

  // Compute SHA-256 of original
  const documentHash = createHash("sha256").update(originalBytes).digest("hex")

  // 3. Load PDF with pdf-lib
  const pdfDoc = await PDFDocument.load(originalBytes)
  const pages = pdfDoc.getPages()
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)

  // 4. Collect all field submissions across all signers (build flat list)
  const allFields: FieldWithSubmission[] = []

  for (const signer of document.signers) {
    for (const sub of signer.submissions) {
      allFields.push({
        id: sub.fieldId,
        type: sub.field.type,
        page: sub.field.page,
        x: sub.field.x,
        y: sub.field.y,
        width: sub.field.width,
        height: sub.field.height,
        value: sub.value,
      })
    }
  }

  // 5. Embed each field into PDF
  for (const field of allFields) {
    const pageIndex = field.page - 1   // 0-based
    if (pageIndex < 0 || pageIndex >= pages.length) continue

    const page = pages[pageIndex]
    const { width: pageWidth, height: pageHeight } = page.getSize()
    const { x, y, w, h } = toPdfCoords(field, pageWidth, pageHeight)

    const isImageField = ["SIGNATURE", "INITIALS", "STAMP", "IMAGE"].includes(field.type)
    if (isImageField) {
      // base64 PNG → embed as image
      const base64Data = field.value.replace(/^data:image\/\w+;base64,/, "")
      const pngBytes = Buffer.from(base64Data, "base64")

      try {
        const pngImage = await pdfDoc.embedPng(pngBytes)

        // Auto-rotate 90° when image orientation doesn't match the field box
        // (e.g. landscape signature into a portrait cell in a table).
        const imgLandscape = pngImage.width >= pngImage.height
        const boxLandscape = w >= h
        const rotate = imgLandscape !== boxLandscape

        if (rotate) {
          // When rotated 90°, the image's width spans the box height & vice versa.
          // Fit the rotated image (swapped dims) inside the box, preserving aspect.
          const imgAspect = pngImage.width / pngImage.height
          // After rotation, "drawn width on page" = h' ≤ h, "drawn height" = w' ≤ w
          // Solve for largest rotated image that fits inside (w, h):
          //   drawn_w_rotated = imgH_scaled, drawn_h_rotated = imgW_scaled
          //   with imgW_scaled / imgH_scaled = imgAspect
          let drawnW = h
          let drawnH = h * imgAspect
          if (drawnH > w) {
            drawnH = w
            drawnW = w / imgAspect
          }
          // pdf-lib rotates around (x, y); after rotate(90°) the image grows into +x, -y
          // Place so the rotated bbox is centered inside the field.
          const bboxW = drawnH
          const bboxH = drawnW
          const offsetX = (w - bboxW) / 2
          const offsetY = (h - bboxH) / 2
          page.drawImage(pngImage, {
            x: x + offsetX + bboxW,
            y: y + offsetY,
            width: drawnW,
            height: drawnH,
            rotate: degrees(90),
            opacity: 1,
          })
        } else {
          // Preserve aspect ratio: fit inside the field box and center
          const fitted = pngImage.scaleToFit(w, h)
          const drawX = x + (w - fitted.width) / 2
          const drawY = y + (h - fitted.height) / 2
          page.drawImage(pngImage, {
            x: drawX,
            y: drawY,
            width: fitted.width,
            height: fitted.height,
            opacity: 1,
          })
        }
      } catch {
        // If PNG embed fails, fall back to text placeholder
        page.drawText("[Signature]", {
          x: x + 2,
          y: y + h / 2 - 6,
          size: 10,
          font: helvetica,
          color: rgb(0.1, 0.1, 0.1),
        })
      }
    } else {
      // TEXT or DATE — draw as text, vertically centered
      const fontSize = Math.max(8, Math.min(12, h * 0.5))
      const text = field.value.slice(0, 100) // safety clamp

      page.drawText(text, {
        x: x + 2,
        y: y + (h - fontSize) / 2,
        size: fontSize,
        font: helvetica,
        color: rgb(0.05, 0.05, 0.05),
        maxWidth: w - 4,
      })
    }
  }

  // 6. Flatten (remove interactive form fields if any, prevent editing)
  try {
    const form = pdfDoc.getForm()
    form.flatten()
  } catch {
    // No form fields — this is fine
  }

  // 7. Serialize signed PDF
  const signedBytes = await pdfDoc.save()

  // 8. Upload signed PDF to Supabase Storage
  const signedPath = `${document.uploadedBy}/signed-${documentId}-${signerId}.pdf`

  const { error: uploadError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(signedPath, signedBytes, {
      contentType: "application/pdf",
      upsert: true,
    })

  if (uploadError) {
    throw new Error(`Failed to upload signed PDF: ${uploadError.message}`)
  }

  // 9. Check if all SIGNER-role signers have signed
  const allSignersSigned = await prisma.signer.findMany({
    where: { documentId, role: "SIGNER" },
    select: { status: true },
  })
  const allDone = allSignersSigned.every((s) => s.status === "SIGNED")

  // 10. Update document record
  await prisma.document.update({
    where: { id: documentId },
    data: {
      signedStoragePath: signedPath,
      documentHash,
      signedAt: new Date(),
      ...(allDone ? { status: "COMPLETED" as const } : {}),
    },
  })

  return { signedBytes, signedPath }
}
