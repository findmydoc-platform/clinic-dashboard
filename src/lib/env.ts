import { z } from "zod"

const PREVIEW_DASHBOARD_ORIGIN = "https://clinics.preview.findmydoc.eu"
const PREVIEW_VERCEL_HOST_PATTERN =
  /^clinic-dashboard-[a-z0-9](?:[a-z0-9-]*[a-z0-9])?-findmydoc\.vercel\.app$/

const httpUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol
    return protocol === "http:" || protocol === "https:"
  }, "Expected an HTTP(S) URL")

const environmentSchema = z
  .object({
    CLINIC_DASHBOARD_AUTH_TEST_MODE: z.literal("controlled").optional(),
    CLINIC_DASHBOARD_LOCAL_ACCEPTANCE_CLINIC_ID: z.string().min(1).max(100).optional(),
    CLINIC_DASHBOARD_LOCAL_ACCEPTANCE_CLINIC_NAME: z.string().min(1).max(200).optional(),
    CLINIC_DASHBOARD_LOCAL_ACCEPTANCE_MODE: z.literal("inquiry-communication").optional(),
    CLINIC_DASHBOARD_LOCAL_ACCEPTANCE_TOKEN: z.string().min(16).max(500).optional(),
    CLINIC_DASHBOARD_TEST_PASSWORD: z.string().min(8).optional(),
    CSRF_SIGNING_SECRET: z.string().min(32),
    DASHBOARD_ORIGIN: httpUrlSchema,
    EXPECTED_SUPABASE_PROJECT_REF: z.string().regex(/^[a-z0-9]{20}$/),
    NODE_ENV: z.enum(["development", "test", "production"]).optional(),
    PAYLOAD_API_URL: httpUrlSchema,
    SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    SUPABASE_URL: httpUrlSchema,
    VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
    VERCEL_URL: z.string().optional(),
  })
  .superRefine((environment, context) => {
    const isControlledTestMode = environment.CLINIC_DASHBOARD_AUTH_TEST_MODE === "controlled"
    const isLocalAcceptance = environment.CLINIC_DASHBOARD_LOCAL_ACCEPTANCE_MODE === "inquiry-communication"
    const isDeployed = environment.VERCEL_ENV === "preview" || environment.VERCEL_ENV === "production"
    const supabaseUrl = new URL(environment.SUPABASE_URL)
    const expectedSupabaseOrigin = `https://${environment.EXPECTED_SUPABASE_PROJECT_REF}.supabase.co`

    for (const [key, value] of [
      ["PAYLOAD_API_URL", environment.PAYLOAD_API_URL],
      ["SUPABASE_URL", environment.SUPABASE_URL],
    ] as const) {
      const url = new URL(value)
      const isAllowedLocalPayload =
        key === "PAYLOAD_API_URL" &&
        isLocalAcceptance &&
        url.protocol === "http:" &&
        (url.hostname === "localhost" || url.hostname === "127.0.0.1")
      if (url.protocol !== "https:" && !isAllowedLocalPayload) {
        context.addIssue({
          code: "custom",
          message: `${key} must use HTTPS`,
          path: [key],
        })
      }
    }

    if (
      supabaseUrl.origin !== expectedSupabaseOrigin ||
      supabaseUrl.pathname !== "/" ||
      supabaseUrl.search ||
      supabaseUrl.hash ||
      supabaseUrl.username ||
      supabaseUrl.password
    ) {
      context.addIssue({
        code: "custom",
        message: "SUPABASE_URL must match EXPECTED_SUPABASE_PROJECT_REF exactly",
        path: ["SUPABASE_URL"],
      })
    }

    if (isControlledTestMode) {
      if (isDeployed || environment.NODE_ENV === "production") {
        context.addIssue({
          code: "custom",
          message: "Controlled authentication is forbidden in deployed and production environments",
          path: ["CLINIC_DASHBOARD_AUTH_TEST_MODE"],
        })
      }
      if (!environment.CLINIC_DASHBOARD_TEST_PASSWORD) {
        context.addIssue({
          code: "custom",
          message: "CLINIC_DASHBOARD_TEST_PASSWORD is required for controlled authentication",
          path: ["CLINIC_DASHBOARD_TEST_PASSWORD"],
        })
      }
    }

    if (isLocalAcceptance) {
      const payloadUrl = new URL(environment.PAYLOAD_API_URL)
      if (!isControlledTestMode || isDeployed || environment.NODE_ENV === "production") {
        context.addIssue({
          code: "custom",
          message: "Local inquiry acceptance requires non-deployed controlled authentication",
          path: ["CLINIC_DASHBOARD_LOCAL_ACCEPTANCE_MODE"],
        })
      }
      if (
        payloadUrl.protocol !== "http:" ||
        (payloadUrl.hostname !== "localhost" && payloadUrl.hostname !== "127.0.0.1") ||
        payloadUrl.pathname !== "/" ||
        payloadUrl.search ||
        payloadUrl.hash ||
        payloadUrl.username ||
        payloadUrl.password
      ) {
        context.addIssue({
          code: "custom",
          message: "Local inquiry acceptance must use an exact loopback Payload origin",
          path: ["PAYLOAD_API_URL"],
        })
      }
      for (const key of [
        "CLINIC_DASHBOARD_LOCAL_ACCEPTANCE_CLINIC_ID",
        "CLINIC_DASHBOARD_LOCAL_ACCEPTANCE_CLINIC_NAME",
        "CLINIC_DASHBOARD_LOCAL_ACCEPTANCE_TOKEN",
      ] as const) {
        if (!environment[key]) {
          context.addIssue({
            code: "custom",
            message: `${key} is required for local inquiry acceptance`,
            path: [key],
          })
        }
      }
    }

    if (isDeployed) {
      if (new URL(environment.DASHBOARD_ORIGIN).protocol !== "https:") {
        context.addIssue({
          code: "custom",
          message: "DASHBOARD_ORIGIN must use HTTPS in deployed environments",
          path: ["DASHBOARD_ORIGIN"],
        })
      }
    }

    if (
      environment.VERCEL_ENV === "preview" &&
      environment.PAYLOAD_API_URL !== "https://preview.findmydoc.eu"
    ) {
      context.addIssue({
        code: "custom",
        message: "Preview deployments must use the preview Payload API",
        path: ["PAYLOAD_API_URL"],
      })
    }

    if (environment.VERCEL_ENV === "preview" && environment.DASHBOARD_ORIGIN !== PREVIEW_DASHBOARD_ORIGIN) {
      context.addIssue({
        code: "custom",
        message: "Preview must use the canonical stable Clinic Dashboard origin",
        path: ["DASHBOARD_ORIGIN"],
      })
    }

    if (
      environment.VERCEL_ENV === "preview" &&
      environment.VERCEL_URL !== undefined &&
      !PREVIEW_VERCEL_HOST_PATTERN.test(environment.VERCEL_URL)
    ) {
      context.addIssue({
        code: "custom",
        message: "VERCEL_URL must match the Clinic Dashboard preview deployment host",
        path: ["VERCEL_URL"],
      })
    }

    if (environment.VERCEL_ENV === "production") {
      if (environment.DASHBOARD_ORIGIN !== "https://clinics.findmydoc.eu") {
        context.addIssue({
          code: "custom",
          message: "Production must use the canonical Clinic Dashboard origin",
          path: ["DASHBOARD_ORIGIN"],
        })
      }
      if (environment.PAYLOAD_API_URL !== "https://findmydoc.eu") {
        context.addIssue({
          code: "custom",
          message: "Production must use the production Payload API",
          path: ["PAYLOAD_API_URL"],
        })
      }
    }
  })

export type RuntimeEnvironment = z.infer<typeof environmentSchema>

export function validateEnvironment(input: Record<string, string | undefined> = process.env) {
  return environmentSchema.parse(input)
}

export function isControlledAuthTestMode(environment: Record<string, string | undefined> = process.env) {
  return (
    environment.CLINIC_DASHBOARD_AUTH_TEST_MODE === "controlled" &&
    environment.NODE_ENV !== "production" &&
    environment.VERCEL_ENV !== "preview" &&
    environment.VERCEL_ENV !== "production"
  )
}

export function isLocalInquiryAcceptanceMode(environment: Record<string, string | undefined> = process.env) {
  return (
    environment.CLINIC_DASHBOARD_LOCAL_ACCEPTANCE_MODE === "inquiry-communication" &&
    isControlledAuthTestMode(environment)
  )
}

export function isSecureCookieEnvironment(environment: Record<string, string | undefined> = process.env) {
  return (
    environment.NODE_ENV === "production" ||
    environment.VERCEL_ENV === "preview" ||
    environment.VERCEL_ENV === "production"
  )
}

export function getExpectedDashboardOrigin(environment: RuntimeEnvironment) {
  return new URL(environment.DASHBOARD_ORIGIN).origin
}

function getPreviewVercelDeploymentOrigin(environment: RuntimeEnvironment) {
  if (
    environment.VERCEL_ENV !== "preview" ||
    !environment.VERCEL_URL ||
    !PREVIEW_VERCEL_HOST_PATTERN.test(environment.VERCEL_URL)
  ) {
    return undefined
  }

  return `https://${environment.VERCEL_URL}`
}

export function getTrustedDashboardOrigin(
  candidate: string | null | undefined,
  environment: RuntimeEnvironment,
) {
  if (!candidate) return undefined

  let normalizedOrigin: string
  try {
    normalizedOrigin = new URL(candidate).origin
  } catch {
    return undefined
  }
  if (normalizedOrigin !== candidate) return undefined

  const trustedOrigins = new Set([getExpectedDashboardOrigin(environment)])
  if (environment.VERCEL_ENV === "preview") {
    const deploymentOrigin = getPreviewVercelDeploymentOrigin(environment)
    if (deploymentOrigin) trustedOrigins.add(deploymentOrigin)
  }

  return trustedOrigins.has(candidate) ? candidate : undefined
}

export function getTrustedRequestDashboardOrigin(
  request: Readonly<{
    headers: Headers
    nextUrl: Readonly<{ host: string; protocol: string }>
  }>,
  environment: RuntimeEnvironment,
) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
  const protocol = forwardedProtocol || request.nextUrl.protocol.replace(/:$/, "")
  if (protocol !== "http" && protocol !== "https") return undefined

  const host = request.headers.get("host")?.trim() || request.nextUrl.host
  return getTrustedDashboardOrigin(`${protocol}://${host}`, environment)
}
