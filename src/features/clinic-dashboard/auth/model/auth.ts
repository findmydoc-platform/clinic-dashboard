import { z } from "zod"

const clinicDashboardCapabilitySchema = z.enum([
  "clinic-profile:view",
  "clinic-profile:edit",
  "clinic-gallery:view",
  "clinic-gallery:edit",
  "clinic-treatments:view",
  "clinic-treatments:edit",
  "clinic-inquiries:view",
  "clinic-inquiries:edit",
])
const clinicDashboardCapabilitiesSchema = z
  .array(clinicDashboardCapabilitySchema)
  .max(clinicDashboardCapabilitySchema.options.length)
  .refine((capabilities) => new Set(capabilities).size === capabilities.length, {
    message: "Capabilities must be unique.",
  })
  .readonly()

export const authenticatedClinicContextSchema = z.object({
  capabilities: clinicDashboardCapabilitiesSchema.readonly(),
  clinic: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
  }),
  principal: z.object({
    displayName: z.string().min(1),
    email: z.string().email(),
    id: z.string().min(1),
  }),
  status: z.literal("approved"),
})

export type ClinicDashboardCapability = z.infer<typeof clinicDashboardCapabilitySchema>
export type AuthenticatedClinicContext = z.infer<typeof authenticatedClinicContextSchema>

const clinicDashboardAuthErrorCodes = [
  "INVALID_INPUT",
  "INVALID_CREDENTIALS",
  "INVALID_OR_EXPIRED_LINK",
  "ACCOUNT_UNAVAILABLE",
  "REQUEST_REJECTED",
  "AUTH_TEMPORARILY_UNAVAILABLE",
  "SERVICE_TEMPORARILY_UNAVAILABLE",
] as const

export type ClinicDashboardAuthErrorCode = (typeof clinicDashboardAuthErrorCodes)[number]

export type ClinicDashboardAccessResult =
  | Readonly<{ context: AuthenticatedClinicContext; status: "approved" }>
  | Readonly<{ status: "denied" | "temporarily-unavailable" | "unauthenticated" | "unauthorized" }>

export type ClinicDashboardEmailFlow = "invite" | "recovery"

const inquiryDeepLinkPattern = /^[A-Za-z0-9._~-]{1,100}$/u
const inquiryReturnTargetPattern = /^\/\?inquiry=([A-Za-z0-9._~-]{1,100})$/u

export type ClinicDashboardReturnTarget = "/" | `/?inquiry=${string}`

export function parseInquiryDeepLink(value: string | readonly string[] | undefined) {
  return typeof value === "string" && inquiryDeepLinkPattern.test(value) ? value : undefined
}

export function createClinicDashboardReturnTarget(inquiryId?: string): ClinicDashboardReturnTarget {
  return inquiryId && inquiryDeepLinkPattern.test(inquiryId) ? `/?inquiry=${inquiryId}` : "/"
}

export function parseClinicDashboardReturnTarget(value: unknown): ClinicDashboardReturnTarget | undefined {
  if (value === "/") return value
  return typeof value === "string" && inquiryReturnTargetPattern.test(value)
    ? (value as ClinicDashboardReturnTarget)
    : undefined
}

export function createClinicDashboardLoginPath(returnTarget: ClinicDashboardReturnTarget) {
  return returnTarget === "/" ? "/login" : `/login?next=${encodeURIComponent(returnTarget)}`
}

export function createClinicDashboardLoginPathForRequest(pathname: string, inquiryValues: readonly string[]) {
  const inquiryId =
    pathname === "/" && inquiryValues.length === 1 ? parseInquiryDeepLink(inquiryValues[0]) : undefined
  return createClinicDashboardLoginPath(createClinicDashboardReturnTarget(inquiryId))
}

export const clinicDashboardEmailDestinations = {
  invite: "/auth/invite/complete",
  recovery: "/auth/password/reset/complete",
} as const satisfies Record<ClinicDashboardEmailFlow, string>
