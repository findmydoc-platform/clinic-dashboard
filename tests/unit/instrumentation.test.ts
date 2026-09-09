import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const captureServerException = vi.hoisted(() => vi.fn())

vi.mock("@/telemetry/server", () => ({ captureServerException }))

describe("onRequestError", () => {
  const originalEnvironment = process.env

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env = { ...originalEnvironment, NEXT_RUNTIME: "nodejs" }
  })

  afterEach(() => {
    process.env = originalEnvironment
    vi.restoreAllMocks()
  })

  it("does not change error handling when exception telemetry fails", async () => {
    captureServerException.mockRejectedValueOnce(new Error("telemetry unavailable"))
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const { onRequestError } = await import("@/instrumentation")
    const error = new Error("boom")
    const request = { headers: {}, method: "GET", path: "/api/health" }

    await expect(
      onRequestError(error, request, {
        revalidateReason: undefined,
        routePath: "/api/health",
        routeType: "route",
        routerKind: "App Router",
      }),
    ).resolves.toBeUndefined()
    expect(captureServerException).toHaveBeenCalledWith(error, {
      method: "GET",
      route: "/api/health",
    })
    expect(consoleWarn).toHaveBeenCalledWith(
      { event: "telemetry.posthog.request_error_send_failed" },
      "PostHog telemetry failed; continuing",
    )
  })
})
