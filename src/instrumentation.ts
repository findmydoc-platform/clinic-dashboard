import type { Instrumentation } from "next"

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  try {
    const { captureServerException } = await import("@/telemetry/server")
    await captureServerException(error, {
      method: request.method,
      route: context.routePath,
    })
  } catch {
    console.warn(
      { event: "telemetry.posthog.request_error_send_failed" },
      "PostHog telemetry failed; continuing",
    )
  }
}
