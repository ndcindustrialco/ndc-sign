"use server"

import { z } from "zod"
import { auth } from "@/lib/auth"
import { searchOrgUsers } from "@/lib/email/graph-people"
import type { GraphUser } from "@/lib/email/graph-people"
import type { ActionResult } from "./document"

const SearchSchema = z.object({
  query: z.string().min(1).max(100).trim(),
})

export async function searchPeople(
  query: string
): Promise<ActionResult<GraphUser[]>> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  const validated = SearchSchema.safeParse({ query })
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0]?.message ?? "Invalid query" }
  }

  try {
    const users = await searchOrgUsers(validated.data.query)
    return { ok: true, data: users }
  } catch (err) {
    return { ok: false, error: "Failed to search users. Please try again." }
  }
}
