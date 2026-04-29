import { PDFDocument, rgb, StandardFonts, degrees, LineCapStyle } from "pdf-lib"
import { createHash } from "crypto"
import { prisma } from "@/lib/prisma"
import { supabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase"
import { logger } from "@/lib/logger"

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
//
// PDFs can carry /Rotate (0/90/180/270). Viewers — including react-pdf in the
// signer UI — display the page already rotated, so field %-coords are in the
// *visual* (rotated) frame. We must map them back to the page's native
// (unrotated) PDF coordinates before drawing, and counter-rotate drawn content
// so it stays upright after the viewer applies /Rotate.
//
// We work in a per-field **local box frame**: origin at the visual top-left
// corner of the field, u → right, v → down, sizes in the same units as the
// visual page. Everything the caller expresses (sub-rect offset, auto-rotated
// signature, text baseline) lives in this frame; `composeDraw()` maps it to
// pdf-lib's drawImage/drawText params regardless of page rotation.
// ---------------------------------------------------------------------------

type BoxFrame = {
  // Origin of the local box frame in PDF (unrotated) coordinates.
  originX: number
  originY: number
  // Unit vectors for local u (right) and v (down) axes, expressed in PDF space.
  uX: number
  uY: number
  vX: number
  vY: number
  // Visual-space box dimensions (local frame extent).
  w: number
  h: number
  // Page rotation applied (0/90/180/270), CW, per PDF /Rotate spec.
  pageRotation: 0 | 90 | 180 | 270
}

function getBoxFrame(
  field: { x: number; y: number; width: number; height: number },
  pageWidth: number,
  pageHeight: number,
  rotation: number
): BoxFrame {
  const rot = (((rotation % 360) + 360) % 360) as 0 | 90 | 180 | 270

  // Visual page dimensions (what the signer sees).
  const visualW = rot === 90 || rot === 270 ? pageHeight : pageWidth
  const visualH = rot === 90 || rot === 270 ? pageWidth : pageHeight

  const vx = (field.x / 100) * visualW
  const vy = (field.y / 100) * visualH
  const w = (field.width / 100) * visualW
  const h = (field.height / 100) * visualH

  // Visual point (U, V) → PDF (bottom-left origin):
  //   r=  0: (U,            pageH - V)
  //   r= 90: (V,            U)
  //   r=180: (pageW - U,    V)
  //   r=270: (pageW - V,    pageH - U)
  //
  // Origin = visual box TL = (vx, vy). Unit vectors = partials wrt (U, V).
  switch (rot) {
    case 0:
      return {
        originX: vx,
        originY: pageHeight - vy,
        uX: 1, uY: 0,
        vX: 0, vY: -1,
        w, h, pageRotation: rot,
      }
    case 90:
      return {
        originX: vy,
        originY: vx,
        uX: 0, uY: 1,
        vX: 1, vY: 0,
        w, h, pageRotation: rot,
      }
    case 180:
      return {
        originX: pageWidth - vx,
        originY: vy,
        uX: -1, uY: 0,
        vX: 0, vY: 1,
        w, h, pageRotation: rot,
      }
    case 270:
      return {
        originX: pageWidth - vy,
        originY: pageHeight - vx,
        uX: 0, uY: -1,
        vX: -1, vY: 0,
        w, h, pageRotation: rot,
      }
  }
}

// Map a local (u, v) point to PDF coordinates.
function localPoint(frame: BoxFrame, u: number, v: number) {
  return {
    x: frame.originX + u * frame.uX + v * frame.vX,
    y: frame.originY + u * frame.uY + v * frame.vY,
  }
}

type DrawParams = {
  x: number
  y: number
  width: number
  height: number
  rotateDeg: 0 | 90 | 180 | 270
}

// Compose a local sub-rect draw with the page's rotation.
//
// Inputs are in the *local* box frame:
//   (u, v)         = visual top-left of the content sub-rect
//   (bboxW, bboxH) = visual size of the content sub-rect
//   localCwRot     = CW rotation of the content within the local frame around
//                    its TL. 0 by default; 90 when auto-rotating a landscape
//                    signature into a portrait cell. (Currently unused — kept
//                    for API symmetry with future content rotation needs.)
//
// pdf-lib draws into the page's *unrotated* PDF space; the viewer then applies
// the page's `/Rotate` (CW) on top. So to make the content appear upright in
// the visual frame, we must counter-rotate by `pageRotation` CCW (equivalent
// to pdf-lib's `rotate: degrees(pageRotation)`, since pdf-lib rotates CCW).
//
// pdf-lib applies operations as: translate(x,y) → rotate(θ) → scale(w,h) →
// drawObject (unit square in image space, with image (0,1) at visual TL of
// the raster). Solving for the (x,y) such that image (0,1) lands at the
// visual TL in PDF space:
//
//   θ =   0 → (x, y) = (visTL_x,         visTL_y - bboxH)
//   θ =  90 → (x, y) = (visTL_x + bboxH, visTL_y)
//   θ = 180 → (x, y) = (visTL_x,         visTL_y + bboxH)
//   θ = 270 → (x, y) = (visTL_x - bboxH, visTL_y)
//
// `width` and `height` are always the visual dimensions (bboxW, bboxH). The
// content's `localCwRot` would compose with pageRotation here if non-zero.
function composeDraw(
  frame: BoxFrame,
  u: number, v: number,
  bboxW: number, bboxH: number,
  _localCwRot: 0 | 90 = 0
): DrawParams {
  const rotateDeg = frame.pageRotation as 0 | 90 | 180 | 270
  const visTL = localPoint(frame, u, v)

  let x: number
  let y: number
  switch (rotateDeg) {
    case 0:
      x = visTL.x;         y = visTL.y - bboxH
      break
    case 90:
      x = visTL.x + bboxH; y = visTL.y
      break
    case 180:
      x = visTL.x;         y = visTL.y + bboxH
      break
    case 270:
      x = visTL.x - bboxH; y = visTL.y
      break
  }

  return { x, y, width: bboxW, height: bboxH, rotateDeg }
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
    const pageRotation = page.getRotation().angle
    logger.warn("[signed-pdf] field debug", {
      documentId,
      signerId,
      page: field.page,
      pageRotation,
      pageWidth,
      pageHeight,
      fieldType: field.type,
      fieldXY: { x: field.x, y: field.y, w: field.width, h: field.height },
    })
    const frame = getBoxFrame(field, pageWidth, pageHeight, pageRotation)
    const { w, h } = frame

    const isImageField = ["SIGNATURE", "INITIALS", "STAMP", "IMAGE"].includes(field.type)
    if (isImageField) {
      // base64 PNG → embed as image
      const base64Data = field.value.replace(/^data:image\/\w+;base64,/, "")
      const pngBytes = Buffer.from(base64Data, "base64")

      try {
        const pngImage = await pdfDoc.embedPng(pngBytes)

        // Preserve aspect ratio: fit inside the field box and center.
        const fitted = pngImage.scaleToFit(w, h)
        const offsetU = (w - fitted.width) / 2
        const offsetV = (h - fitted.height) / 2
        const d = composeDraw(frame, offsetU, offsetV, fitted.width, fitted.height, 0)
        logger.warn("[signed-pdf] embed image", {
          documentId,
          signerId,
          fieldId: field.id,
          pageRotation,
          frameW: w,
          frameH: h,
          imgW: pngImage.width,
          imgH: pngImage.height,
          drawX: d.x,
          drawY: d.y,
          drawW: d.width,
          drawH: d.height,
          rotateDeg: d.rotateDeg,
        })
        page.drawImage(pngImage, {
          x: d.x,
          y: d.y,
          width: d.width,
          height: d.height,
          rotate: degrees(d.rotateDeg),
          opacity: 1,
        })
      } catch {
        // If PNG embed fails, fall back to text placeholder.
        const fontSize = 10
        const d = composeDraw(frame, 2, h / 2 - fontSize * 0.6, w - 4, fontSize, 0)
        page.drawText("[Signature]", {
          x: d.x,
          y: d.y,
          size: fontSize,
          font: helvetica,
          color: rgb(0.1, 0.1, 0.1),
          rotate: degrees(d.rotateDeg),
        })
      }
    } else if (field.type === "CHECKBOX") {
      // Draw a vector checkmark (two lines: down-left leg + up-right leg).
      // Helvetica doesn't support ✓ (U+2713), so we draw it as raw PDF ops.
      const size = Math.max(8, Math.min(h * 0.75, 20))
      const offsetU = (w - size) / 2
      const offsetV = (h - size) / 2
      // Checkmark control points in local (u,v) frame, v↓:
      //   start  → mid  → end
      //   (0.1, 0.55) → (0.35, 0.85) → (0.9, 0.2)  (as fraction of size)
      const pts = [
        localPoint(frame, offsetU + size * 0.1,  offsetV + size * 0.55),
        localPoint(frame, offsetU + size * 0.35, offsetV + size * 0.85),
        localPoint(frame, offsetU + size * 0.9,  offsetV + size * 0.2),
      ] as const
      const strokeW = Math.max(1, size * 0.1)
      page.drawLine({ start: { x: pts[0].x, y: pts[0].y }, end: { x: pts[1].x, y: pts[1].y }, thickness: strokeW, color: rgb(0.05, 0.05, 0.05), lineCap: LineCapStyle.Round })
      page.drawLine({ start: { x: pts[1].x, y: pts[1].y }, end: { x: pts[2].x, y: pts[2].y }, thickness: strokeW, color: rgb(0.05, 0.05, 0.05), lineCap: LineCapStyle.Round })
    } else if (field.type === "FILE") {
      // Draw the filename (stored as JSON prefix before the base64 payload).
      const fileName = field.value.startsWith("file:")
        ? field.value.split("|")[0].slice(5)
        : "[File attached]"
      const fontSize = Math.max(8, Math.min(12, h * 0.5))
      const offsetU = 2
      const offsetV = (h - fontSize) / 2
      const d = composeDraw(frame, offsetU, offsetV, w - 4, fontSize, 0)
      page.drawText(fileName.slice(0, 80), {
        x: d.x,
        y: d.y,
        size: fontSize,
        font: helvetica,
        color: rgb(0.05, 0.05, 0.05),
        maxWidth: w - 4,
        rotate: degrees(d.rotateDeg),
      })
    } else {
      // TEXT, DATE, NUMBER, PHONE, CELLS, RADIO, SELECT — draw as text, vertically centered.
      const fontSize = Math.max(8, Math.min(12, h * 0.5))
      const text = field.value.slice(0, 100) // safety clamp

      // Local baseline: TL offset (u=2, v=h - (h-fontSize)/2 - fontSize*0.2).
      // pdf-lib's drawText y is the baseline in the *source* coordinate; we
      // match the prior visual by positioning the text box's TL (u=2, v=...)
      // and using composeDraw to get pivot + rotation. We treat the text as
      // occupying (w-4, fontSize), so the bbox TL in local coords is:
      //   u = 2
      //   v = (h - fontSize) / 2
      const offsetU = 2
      const offsetV = (h - fontSize) / 2
      const d = composeDraw(frame, offsetU, offsetV, w - 4, fontSize, 0)

      page.drawText(text, {
        x: d.x,
        y: d.y,
        size: fontSize,
        font: helvetica,
        color: rgb(0.05, 0.05, 0.05),
        maxWidth: w - 4,
        rotate: degrees(d.rotateDeg),
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
  const signedPath = `${document.uploadedBy}/signed-${documentId}.pdf`
  const signedBuffer = Buffer.from(signedBytes)

  logger.warn("[signed-pdf] uploading", { documentId, signerId, signedPath, bytes: signedBuffer.length })

  const { error: uploadError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(signedPath, signedBuffer, {
      contentType: "application/pdf",
      upsert: true,
    })

  if (uploadError) {
    logger.error("[signed-pdf] upload failed", { documentId, signedPath, error: uploadError.message })
    throw new Error(`Failed to upload signed PDF: ${uploadError.message}`)
  }

  logger.warn("[signed-pdf] upload ok", { documentId, signedPath })

  // 9. Check if all signers have signed
  const allSignersSigned = await prisma.signer.findMany({
    where: { documentId },
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

  logger.warn("[signed-pdf] document updated", { documentId, signedPath, allDone })

  return { signedBytes, signedPath }
}
