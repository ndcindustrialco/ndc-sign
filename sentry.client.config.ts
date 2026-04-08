import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance: sample 20% of transactions in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Session Replay: capture 10% of sessions, 100% of error sessions
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,      // GDPR: mask all text in replays
      blockAllMedia: true,    // GDPR: block media in replays
    }),
    Sentry.browserTracingIntegration(),
  ],

  // Filter out noisy/irrelevant errors
  beforeSend(event) {
    // Ignore ResizeObserver errors (browser noise)
    if (event.exception?.values?.[0]?.value?.includes("ResizeObserver")) {
      return null
    }
    return event
  },

  // Tag environment
  environment: process.env.NODE_ENV ?? "development",
})
