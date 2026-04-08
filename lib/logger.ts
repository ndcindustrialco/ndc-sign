/**
 * Structured JSON logger with Sentry integration.
 *
 * Usage:
 *   import { logger } from "@/lib/logger"
 *   logger.info("Document uploaded", { documentId, userId })
 *   logger.error("Email send failed", { documentId, error })
 */

import * as Sentry from "@sentry/nextjs"

type LogLevel = "info" | "warn" | "error"

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  [key: string]: unknown
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  }

  // Structured JSON to stdout/stderr
  const output = JSON.stringify(entry)
  if (level === "error") {
    console.error(output)
  } else if (level === "warn") {
    console.warn(output)
  } else {
    console.log(output)
  }

  // Forward errors and warnings to Sentry
  if (level === "error") {
    const errorValue = meta?.["error"]
    if (errorValue instanceof Error) {
      Sentry.captureException(errorValue, { extra: meta })
    } else {
      Sentry.captureMessage(message, {
        level: "error",
        extra: meta,
      })
    }
  } else if (level === "warn") {
    Sentry.captureMessage(message, {
      level: "warning",
      extra: meta,
    })
  }
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    log("info", message, meta)
  },

  warn(message: string, meta?: Record<string, unknown>) {
    log("warn", message, meta)
  },

  error(message: string, meta?: Record<string, unknown>) {
    log("error", message, meta)
  },

  /** Helper to safely extract error message for meta */
  formatError,
}
