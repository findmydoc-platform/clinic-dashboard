import "server-only"
import { PostHog } from "posthog-node"
import { resolvePostHogDeploymentMetadata } from "@/telemetry/deployment-metadata"

const POSTHOG_SERVER_EXCEPTION_APPLICATION = "dashboard"
const POSTHOG_SERVER_EXCEPTION_DISTINCT_ID = "server:dashboard"
const REQUEST_URL_BASE = "https://clinic-dashboard.invalid"
const MAX_REQUEST_URL_LENGTH = 2048
const SENSITIVE_EXCEPTION_PROPERTY_NAME =
  /authorization|cookie|credential|header|password|secret|token|query/i
const SENSITIVE_EXCEPTION_PROPERTY_VALUE =
  /\b(?:basic|bearer|digest)\s+\S+|(?:access[_-]?token|api[_-]?key|authorization|cookie|credential|password|secret|session|token)\s*[:=]/i
const URL_WITH_UNSAFE_SUFFIX = /(?:https?:\/\/|\/)\S*[?#]\S*/i

const POSTHOG_EXCEPTION_SEND_TIMEOUT_MS = 1_500

let posthogServerClient: PostHog | null = null

type PostHogClientWithCaptureException = PostHog & {
  captureException: (error: unknown, distinctId?: string, properties?: Record<string, unknown>) => unknown
}

type ExceptionProperties = Record<string, boolean | number | string | null | undefined>

export type ServerExceptionContext = {
  method?: string
  route?: string
}

const hasCaptureException = (client: PostHog): client is PostHogClientWithCaptureException => {
  const maybeClient = client as unknown as { captureException?: unknown }
  return typeof maybeClient.captureException === "function"
}

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`PostHog exception send exceeded ${timeoutMs}ms`)),
      timeoutMs,
    )
    timeout.unref?.()

    promise.then(
      (value) => {
        clearTimeout(timeout)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timeout)
        reject(error)
      },
    )
  })

const toLoggedError = (error: unknown): Error => {
  if (error instanceof Error) return error

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message
    return new Error(typeof message === "string" ? message : String(message ?? error))
  }

  return new Error(String(error))
}

const sanitizeRequestUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined

  try {
    return new URL(url, REQUEST_URL_BASE).pathname.slice(0, MAX_REQUEST_URL_LENGTH)
  } catch {
    const [path] = url.split(/[?#]/)
    const normalizedPath = path?.trim()
    return normalizedPath ? normalizedPath.slice(0, MAX_REQUEST_URL_LENGTH) : undefined
  }
}

const sanitizeExceptionProperties = (properties: ExceptionProperties) =>
  Object.fromEntries(
    Object.entries(properties).flatMap(([key, value]) => {
      if (SENSITIVE_EXCEPTION_PROPERTY_NAME.test(key)) return []

      if (typeof value === "string") {
        if (key.toLowerCase().includes("url")) {
          const sanitizedUrl = sanitizeRequestUrl(value)
          return sanitizedUrl === undefined ? [] : [[key, sanitizedUrl]]
        }

        if (SENSITIVE_EXCEPTION_PROPERTY_VALUE.test(value)) return []
        if (URL_WITH_UNSAFE_SUFFIX.test(value)) return []
      }

      return [[key, value]]
    }),
  )

const createPostHogServerClient = (): PostHog => {
  const projectApiKey = process.env.POSTHOG_PROJECT_API_KEY
  const host = process.env.POSTHOG_HOST

  if (!projectApiKey || !host) {
    throw new Error("PostHog server configuration is missing")
  }

  return new PostHog(projectApiKey, {
    fetchRetryCount: 0,
    flushAt: 1,
    flushInterval: 0,
    host,
    requestTimeout: 1_000,
  })
}

const getPostHogServer = (): PostHog => {
  if (!posthogServerClient) {
    posthogServerClient = createPostHogServerClient()
  }

  return posthogServerClient
}

export const captureServerException = async (
  error: unknown,
  context: ServerExceptionContext,
  properties: ExceptionProperties = {},
): Promise<void> => {
  const route = sanitizeRequestUrl(context.route)
  const captureProperties = {
    ...sanitizeExceptionProperties(properties),
    ...(context.method ? { method: context.method } : {}),
    ...(route ? { route } : {}),
    application: POSTHOG_SERVER_EXCEPTION_APPLICATION,
    error: error instanceof Error ? error.message : String(error),
  }
  const deploymentMetadata = resolvePostHogDeploymentMetadata()

  if (deploymentMetadata.kind === "local") {
    const { error: _error, ...localProperties } = captureProperties
    console.error(
      {
        ...localProperties,
        distinctId: POSTHOG_SERVER_EXCEPTION_DISTINCT_ID,
        err: toLoggedError(error),
        event: "telemetry.posthog.exception_local",
        posthog_event: "$exception",
      },
      "Captured server exception locally without PostHog",
    )
    return
  }

  if (deploymentMetadata.kind === "invalid") {
    console.error(
      {
        err: toLoggedError(error),
        event: "telemetry.posthog.exception_skipped_invalid_deployment_metadata",
        reason: deploymentMetadata.reason,
      },
      "PostHog exception skipped because deployment metadata is invalid",
    )
    return
  }

  try {
    const client = getPostHogServer()
    const additionalProperties = {
      ...captureProperties,
      ...deploymentMetadata.metadata,
    }

    await withTimeout(
      (async () => {
        if (hasCaptureException(client)) {
          await client.captureException(error, POSTHOG_SERVER_EXCEPTION_DISTINCT_ID, additionalProperties)
        } else if (typeof client.capture === "function") {
          await client.capture({
            distinctId: POSTHOG_SERVER_EXCEPTION_DISTINCT_ID,
            event: "$exception",
            properties: additionalProperties,
          })
        }

        await client.flush()
      })(),
      POSTHOG_EXCEPTION_SEND_TIMEOUT_MS,
    )
  } catch (telemetryError) {
    console.error(
      {
        err: toLoggedError(telemetryError),
        event: "telemetry.posthog.exception_send_failed",
      },
      "PostHog server exception capture failed",
    )
  }
}
