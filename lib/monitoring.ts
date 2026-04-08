/**
 * Monitoring utilities for production observability.
 *
 * Provides:
 * - Structured metric logging for key business events
 * - Sentry alert helpers for critical failures
 * - Inngest function failure tracking
 */

import * as Sentry from "@sentry/nextjs"
import { logger } from "@/lib/logger"

// ---------------------------------------------------------------------------
// Business metric events — structured logs for dashboards/alerting
// ---------------------------------------------------------------------------

export const metrics = {
  /** Track document lifecycle events */
  documentEvent(event: "created" | "sent" | "completed" | "voided", meta: Record<string, unknown>) {
    logger.info(`metric.document.${event}`, { metric: `document.${event}`, ...meta })
  },

  /** Track signing events */
  signingEvent(
    event: "invited" | "opened" | "signed" | "declined",
    meta: Record<string, unknown>
  ) {
    logger.info(`metric.signing.${event}`, { metric: `signing.${event}`, ...meta })
  },

  /** Track email delivery */
  emailEvent(
    event: "sent" | "failed" | "retrying",
    meta: Record<string, unknown>
  ) {
    const level = event === "failed" ? "error" : "info"
    logger[level](`metric.email.${event}`, { metric: `email.${event}`, ...meta })
  },

  /** Track token verification outcomes */
  tokenEvent(
    event: "verified" | "expired" | "invalid" | "used",
    meta: Record<string, unknown>
  ) {
    const level = event === "invalid" ? "warn" : "info"
    logger[level](`metric.token.${event}`, { metric: `token.${event}`, ...meta })
  },

  /** Track rate limit events */
  rateLimitHit(meta: { ip: string; path: string; limit: number }) {
    logger.warn("metric.rate_limit.hit", { metric: "rate_limit.hit", ...meta })
  },
}

// ---------------------------------------------------------------------------
// Alert helpers — for critical production events
// ---------------------------------------------------------------------------

export const alerts = {
  /** Alert when audit chain integrity is broken */
  auditChainBroken(documentId: string, brokenAt: string) {
    const msg = `Audit chain integrity broken for document ${documentId} at event ${brokenAt}`
    logger.error(msg, { documentId, brokenAt })
    Sentry.captureMessage(msg, {
      level: "fatal",
      tags: { alert: "audit_integrity" },
      extra: { documentId, brokenAt },
    })
  },

  /** Alert when email delivery fails after all retries */
  emailDeliveryFailed(meta: {
    type: string
    recipientEmail: string
    documentId: string
    error: string
  }) {
    logger.error("Email delivery failed after all retries", meta)
    Sentry.captureMessage(`Email delivery failed: ${meta.type}`, {
      level: "error",
      tags: { alert: "email_failure", emailType: meta.type },
      extra: meta,
    })
  },

  /** Alert when Redis connection fails (rate limiting degraded) */
  redisConnectionFailed(error: string) {
    logger.error("Redis connection failed — rate limiting degraded to in-memory", {
      error,
    })
    Sentry.captureMessage("Redis connection failed", {
      level: "warning",
      tags: { alert: "redis_down" },
      extra: { error },
    })
  },

  /** Alert when document hash mismatch is detected */
  documentHashMismatch(documentId: string, expected: string, actual: string) {
    const msg = `Document hash mismatch for ${documentId}`
    logger.error(msg, { documentId, expected, actual })
    Sentry.captureMessage(msg, {
      level: "fatal",
      tags: { alert: "document_integrity" },
      extra: { documentId, expected, actual },
    })
  },
}

// ---------------------------------------------------------------------------
// Sentry alert configuration guide
// ---------------------------------------------------------------------------
//
// Set up the following alerts in Sentry Dashboard → Alerts → Create Alert:
//
// 1. CRITICAL: Audit Chain Integrity
//    - Filter: tags[alert] = "audit_integrity"
//    - Trigger: When event occurs >= 1 time in 1 hour
//    - Notify: #security channel + on-call
//
// 2. HIGH: Email Delivery Failures
//    - Filter: tags[alert] = "email_failure"
//    - Trigger: When event occurs >= 3 times in 15 minutes
//    - Notify: #alerts channel
//
// 3. MEDIUM: Redis Down
//    - Filter: tags[alert] = "redis_down"
//    - Trigger: When event occurs >= 1 time in 5 minutes
//    - Notify: #infrastructure channel
//
// 4. HIGH: Document Integrity
//    - Filter: tags[alert] = "document_integrity"
//    - Trigger: When event occurs >= 1 time in 1 hour
//    - Notify: #security channel + on-call
//
// 5. Performance: Slow Page Loads
//    - Metric: p95(transaction.duration) > 2000ms
//    - Filter: transaction = "/sign/*" OR transaction = "/dashboard/*"
//    - Trigger: When condition met for 5 minutes
//    - Notify: #performance channel
//
// 6. Error Rate Spike
//    - Metric: event count per 5 minutes
//    - Trigger: When > 50 events in 5 minutes
//    - Notify: #alerts channel
