/**
 * Microsoft Graph — search organization users
 * Uses client credentials token (same as sendMail).
 * Requires Application permission: User.ReadBasic.All
 */

import { getClientCredentialsToken } from "./graph-client"

const GRAPH_BASE = "https://graph.microsoft.com/v1.0"

export interface GraphUser {
  id: string
  displayName: string
  mail: string | null
  userPrincipalName: string
  jobTitle: string | null
  department: string | null
}

/**
 * Search organization users by display name or email.
 * Returns up to `top` results (default 10, max 25).
 */
export async function searchOrgUsers(
  query: string,
  top = 10
): Promise<GraphUser[]> {
  if (!query.trim()) return []

  const token = await getClientCredentialsToken()

  const params = new URLSearchParams({
    $search: `"displayName:${query}" OR "mail:${query}" OR "userPrincipalName:${query}"`,
    $select: "id,displayName,mail,userPrincipalName,jobTitle,department",
    $top: String(Math.min(top, 25)),
    $filter: "accountEnabled eq true",
    $orderby: "displayName",
  })

  const res = await fetch(`${GRAPH_BASE}/users?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ConsistencyLevel: "eventual", // required for $search
    },
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`[Graph] User search failed (${res.status}): ${text}`)
  }

  const json = await res.json() as { value: GraphUser[] }
  return json.value
}
