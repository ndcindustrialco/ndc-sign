"use server"

import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const SubmitFeedbackSchema = z.object({
  category: z.enum(["BUG", "FEATURE_REQUEST", "GENERAL"]),
  message: z.string().min(1, "กรุณากรอกข้อความ").max(2000, "ข้อความต้องไม่เกิน 2000 ตัวอักษร"),
})

// ---------------------------------------------------------------------------
// Submit Feedback
// ---------------------------------------------------------------------------

export async function submitFeedback(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const parsed = SubmitFeedbackSchema.safeParse({
    category: formData.get("category"),
    message: formData.get("message"),
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  await prisma.feedback.create({
    data: {
      userId: session.user.id,
      category: parsed.data.category,
      message: parsed.data.message,
    },
  })

  revalidatePath("/dashboard/feedback")
  return { success: true }
}

// ---------------------------------------------------------------------------
// List Feedback (IT role only)
// ---------------------------------------------------------------------------

export async function listFeedback() {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized", data: [] }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (user?.role !== "IT") {
    return { success: false, error: "Forbidden", data: [] }
  }

  const feedbacks = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
  })

  return { success: true, data: feedbacks }
}
