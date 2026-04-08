import { Inngest } from "inngest"

const isDev = process.env.NODE_ENV === "development"

export const inngest = new Inngest({
  id: "e-signature",
  ...(isDev
    ? {
        isDev: true,
        // In dev mode, don't use signing keys — they cause signature
        // verification errors when the Inngest Dev Server syncs.
      }
    : {}),
})
