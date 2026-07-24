import { z } from "zod"

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
    CLINIC_DASHBOARD_TEST_PASSWORD: z.string().min(8).optional(),
    CSRF_SIGNING_SECRET: z.string().min(32),
    DASHBOARD_ORIGIN: httpUrlSchema,
    EXPECTED_SUPABASE_PROJECT_REF: z.string().regex(/^[a-z0-9]{20}$/),
    NODE_ENV: z.enum(["development", "test", "production"]).optional(),
    PAYLOAD_API_URL: httpUrlSchema,
    SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    SUPABASE_URL: httpUrlSchema,
    VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
    VERCEL_URL: z.string().min(1).optional(),
  })
  .superRefine((environment, context) => {
    const isControlledTestMode = environment.CLINIC_DASHBOARD_AUTH_TEST_MODE === "controlled"
    const isDeployed = environment.VERCEL_ENV === "preview" || environment.VERCEL_ENV === "production"
    const supabaseUrl = new URL(environment.SUPABASE_URL)
    const expectedSupabaseOrigin = `https://${environment.EXPECTED_SUPABASE_PROJECT_REF}.supabase.co`

    for (const [key, value] of [
      ["PAYLOAD_API_URL", environment.PAYLOAD_API_URL],
      ["SUPABASE_URL", environment.SUPABASE_URL],
    ] as const) {
      if (new URL(value).protocol !== "https:") {
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

export function isSecureCookieEnvironment(environment: Record<string, string | undefined> = process.env) {
  return (
    environment.NODE_ENV === "production" ||
    environment.VERCEL_ENV === "preview" ||
    environment.VERCEL_ENV === "production"
  )
}

export function getExpectedDashboardOrigin(environment: RuntimeEnvironment) {
  if (environment.VERCEL_ENV === "preview" && environment.VERCEL_URL) {
    const previewOrigin = new URL(`https://${environment.VERCEL_URL}`)
    if (
      !previewOrigin.hostname.startsWith("clinic-dashboard-") ||
      !previewOrigin.hostname.endsWith("-findmydoc.vercel.app")
    ) {
      throw new Error("VERCEL_URL must resolve to the trusted Clinic Dashboard preview hostname")
    }
    return previewOrigin.origin
  }

  return new URL(environment.DASHBOARD_ORIGIN).origin
}
