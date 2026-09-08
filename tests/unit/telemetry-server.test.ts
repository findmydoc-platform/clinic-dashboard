import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const fakeClient = vi.hoisted(() => ({
  captureException: vi.fn(() => Promise.resolve()),
  flush: vi.fn(() => Promise.resolve()),
}))

const posthogNodeMocks = vi.hoisted(() => ({
  PostHog: vi.fn(),
}))

vi.mock("posthog-node", () => posthogNodeMocks)

describe("captureServerException", () => {
  const originalEnvironment = process.env

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    fakeClient.captureException.mockResolvedValue(undefined)
    fakeClient.flush.mockResolvedValue(undefined)
    posthogNodeMocks.PostHog.mockImplementation(function (this: Record<string, unknown>) {
      Object.assign(this, fakeClient)
    })
    process.env = { ...originalEnvironment }
  })

  afterEach(() => {
    vi.useRealTimers()
    process.env = originalEnvironment
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it("captures a sanitized production exception with trusted metadata", async () => {
    process.env = {
      ...process.env,
      DEPLOYMENT_COMMIT_SHA: "a".repeat(40),
      DEPLOYMENT_ENVIRONMENT: "production",
      NODE_ENV: "production",
      POSTHOG_HOST: "https://posthog.invalid",
      POSTHOG_PROJECT_API_KEY: "test-key", // pragma: allowlist secret
      RELEASE_VERSION: "v1.2.3",
    }

    const error = new Error("boom")
    const { captureServerException } = await import("@/telemetry/server")
    await expect(
      captureServerException(
        error,
        {
          method: "GET",
          route: "/api/dashboard/reviews/[reviewId]/response",
        },
        {
          application: "caller-value",
          authorization: "sensitive", // pragma: allowlist secret
          cookie: "sensitive", // pragma: allowlist secret
          credential: "sensitive", // pragma: allowlist secret
          deployment_commit_sha: "b".repeat(40),
          deployment_environment: "preview",
          detail: "Bearer secret-token", // pragma: allowlist secret
          error: "caller-value",
          headers: "sensitive",
          password: "sensitive", // pragma: allowlist secret
          query: "sensitive",
          release_version: "v9.9.9",
          request_url: "/private?token=sensitive", // pragma: allowlist secret
          secret: "sensitive", // pragma: allowlist secret
          token: "sensitive", // pragma: allowlist secret
        },
      ),
    ).resolves.not.toThrow()

    expect(posthogNodeMocks.PostHog).toHaveBeenCalled()
    expect(fakeClient.captureException).toHaveBeenCalledWith(error, "server:dashboard", {
      application: "dashboard",
      deployment_commit_sha: "a".repeat(40),
      deployment_environment: "production",
      error: "boom",
      method: "GET",
      request_url: "/private",
      release_version: "v1.2.3",
      route: "/api/dashboard/reviews/[reviewId]/response",
    })
    expect(fakeClient.flush).toHaveBeenCalled()
  })

  it("does not construct a PostHog client when deployment metadata is invalid", async () => {
    process.env = {
      ...process.env,
      DEPLOYMENT_COMMIT_SHA: "short-sha",
      DEPLOYMENT_ENVIRONMENT: "production",
      NODE_ENV: "production",
      POSTHOG_HOST: "https://posthog.invalid",
      POSTHOG_PROJECT_API_KEY: "test-key", // pragma: allowlist secret
      RELEASE_VERSION: "v1.2.3",
    }

    const { captureServerException } = await import("@/telemetry/server")
    await expect(captureServerException(new Error("boom"), { route: "/api/health" })).resolves.not.toThrow()

    expect(posthogNodeMocks.PostHog).not.toHaveBeenCalled()
    expect(fakeClient.captureException).not.toHaveBeenCalled()
    expect(fakeClient.flush).not.toHaveBeenCalled()
  })

  it("writes a structured local log without constructing a PostHog client", async () => {
    delete process.env.DEPLOYMENT_COMMIT_SHA
    delete process.env.DEPLOYMENT_ENVIRONMENT
    delete process.env.POSTHOG_HOST
    delete process.env.POSTHOG_PROJECT_API_KEY
    delete process.env.RELEASE_VERSION
    process.env = { ...process.env, NODE_ENV: "test" }
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)

    const { captureServerException } = await import("@/telemetry/server")
    await captureServerException(new Error("boom"), {
      method: "GET",
      route: "/auth/callback",
    })

    expect(posthogNodeMocks.PostHog).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith(
      expect.objectContaining({
        application: "dashboard",
        distinctId: "server:dashboard",
        err: expect.any(Error),
        event: "telemetry.posthog.exception_local",
        method: "GET",
        posthog_event: "$exception",
        route: "/auth/callback",
      }),
      expect.any(String),
    )
    expect(consoleError).toHaveBeenCalledWith(
      expect.not.objectContaining({ error: expect.anything() }),
      expect.any(String),
    )
  })

  it("does not throw when PostHog capture fails", async () => {
    process.env = {
      ...process.env,
      DEPLOYMENT_COMMIT_SHA: "a".repeat(40),
      DEPLOYMENT_ENVIRONMENT: "preview",
      NODE_ENV: "production",
      POSTHOG_HOST: "https://posthog.invalid",
      POSTHOG_PROJECT_API_KEY: "test-key", // pragma: allowlist secret
    }
    fakeClient.captureException.mockRejectedValueOnce(new Error("telemetry unavailable"))

    const { captureServerException } = await import("@/telemetry/server")
    await expect(captureServerException(new Error("boom"), { route: "/api/health" })).resolves.not.toThrow()
  })

  it("returns within a fixed budget when PostHog capture does not settle", async () => {
    vi.useFakeTimers()
    fakeClient.captureException.mockReturnValue(new Promise(() => undefined))
    process.env = {
      ...process.env,
      DEPLOYMENT_COMMIT_SHA: "a".repeat(40),
      DEPLOYMENT_ENVIRONMENT: "preview",
      NODE_ENV: "production",
      POSTHOG_HOST: "https://posthog.invalid",
      POSTHOG_PROJECT_API_KEY: "test-key", // pragma: allowlist secret
    }

    const { captureServerException } = await import("@/telemetry/server")
    const result = captureServerException(new Error("boom"), { route: "/api/health" })

    await vi.advanceTimersByTimeAsync(1_500)

    await expect(result).resolves.toBeUndefined()
    expect(fakeClient.captureException).toHaveBeenCalledOnce()
    expect(fakeClient.flush).not.toHaveBeenCalled()
  })
})
