import { serve } from "inngest/next"
import { inngest } from "@/lib/inngest/client"
import { allFunctions } from "@/lib/inngest/functions"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: allFunctions,
  /**
   * In development without the Inngest Dev Server running,
   * PUT requests (used for syncing) will fail with signature
   * verification errors. This is expected and harmless.
   *
   * To run the Inngest Dev Server locally:
   *   npx inngest-cli@latest dev
   */
})
