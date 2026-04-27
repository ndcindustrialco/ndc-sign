import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib"
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
//   (u, v)   = top-left of the content sub-rect
//   (cw, ch) = content size along local +u and +v axes, *before* any
//              in-frame rotation
//   localCwRot = CW rotation of the content within the local frame, around
//                the sub-rect's TL (u, v). 0 by default; 90 when auto-rotating
//                a landscape signature into a portrait cell.
//
// Output is pdf-lib drawImage/drawText params such that the content appears at
// the intended place/orientation after the PDF viewer re-applies /Rotate.
//
// Derivation:
//   - Local CW rotation = CCW rotation in PDF space (local v-axis points down,
//     PDF y-axis points up), so PDF-space CCW rotation θ = localCwRot - pageRot.
//   - pdf-lib's `rotate: degrees(θ)` rotates the source rect CCW by θ around
//     pivot (x, y). For axis-aligned multiples of 90°, the axis-aligned bbox
//     of the rotated rect has a specific corner that coincides with pivot:
//         θ =   0 → pivot = bbox BL
//         θ =  90 → pivot = bbox BR
//         θ = 180 → pivot = bbox TR
//         θ = 270 → pivot = bbox TL
//   - The PDF-space bbox itself is the axis-aligned bbox of the local sub-rect
//     mapped through the frame (since the frame's u/v axes are axis-aligned in
//     PDF space for multiples of 90°).
// Caller convention: (u, v, bboxW, bboxH) is the *final* bounding box of the
// content in local space — already reflecting any in-box rotation. localCwRot
// only tells us whether the source image is oriented along the bbox or rotated
// 90° CW within it.
//
// Internally:
//   - PDF-space bbox = axis-aligned image of the local bbox under the frame.
//   - pdf-lib draws at (width_src, height_src) and rotates CCW by rotateDeg
//     around a pivot corner of the PDF bbox:
//         rotateDeg   pivot       (width_src, height_src)
//             0       BL          (bboxW, bboxH)
//            90       BR          (bboxH, bboxW)
//           180       TR          (bboxW, bboxH)
//           270       TL          (bboxH, bboxW)
function composeDraw(
  frame: BoxFrame,
  u: number, v: number,
  bboxW: number, bboxH: number,
  localCwRot: 0 | 90 = 0
): DrawParams {
  const raw = localCwRot - frame.pageRotation
  const rotateDeg = (((raw % 360) + 360) % 360) as 0 | 90 | 180 | 270

  // PDF-space axis-aligned bbox of the local sub-rect.
  const corners = [
    localPoint(frame, u, v),
    localPoint(frame, u + bboxW, v),
    localPoint(frame, u, v + bboxH),
    localPoint(frame, u + bboxW, v + bboxH),
  ]
  const xs = corners.map((p) => p.x)
  const ys = corners.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  let pivotX: number
  let pivotY: number
  let width: number
  let height: number
  switch (rotateDeg) {
    case 0:
      pivotX = minX; pivotY = minY
      width = maxX - minX; height = maxY - minY
      break
    case 90:
      pivotX = maxX; pivotY = minY
      width = maxY - minY; height = maxX - minX
      break
    case 180:
      pivotX = maxX; pivotY = maxY
      width = maxX - minX; height = maxY - minY
      break
    case 270:
      pivotX = minX; pivotY = maxY
      width = maxY - minY; height = maxX - minX
      break
  }

  return { x: pivotX, y: pivotY, width, height, rotateDeg }
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
    } else {
      // TEXT or DATE — draw as text, vertically centered.
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
