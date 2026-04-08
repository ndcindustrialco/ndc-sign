import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,

  // Performance: sample 20% in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Tag environment
  environment: process.env.NODE_ENV ?? "development",

  // Attach server context to errors
  beforeSend(event) {
    // Strip sensitive data from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((b) => {
        if (b.data?.url && typeof b.data.url === "string") {
          // Remove tokens from URLs in breadcrumbs
          b.data.url = b.data.url.replace(/\/sign\/[a-f0-9]{64}/g, "/sign/[REDACTED]")
        }
        return b
      })
    }
    return event
  },
})
