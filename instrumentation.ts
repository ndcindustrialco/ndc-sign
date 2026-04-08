export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Validate environment variables — fail fast if misconfigured
    const { validateEnv } = await import("./lib/env")
    validateEnv()

    await import("./sentry.server.config")
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

export const onRequestError = async (
  error: { digest: string } & Error,
  request: {
    path: string
    method: string
    headers: { [key: string]: string }
  },
  context: { routerKind: string; routePath: string; routeType: string; renderSource: string }
) => {
  const Sentry = await import("@sentry/nextjs")
  Sentry.captureRequestError(error, request, context)
}
