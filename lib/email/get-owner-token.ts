import { prisma } from "@/lib/prisma"

/**
 * Retrieves the stored AAD id_token for a user (document owner)
 * from the NextAuth Account table.
 *
 * OBO requires the assertion to be a token whose audience (`aud`) is
 * the client app ID — which is the id_token, NOT the Graph access_token.
 */
export async function getOwnerAccessToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "microsoft-entra-id",
    },
    select: { id_token: true },
  })
  return account?.id_token ?? null
}
