import { z } from "zod"

const clinicDashboardCapabilitySchema = z.enum([
  "clinic-profile:view",
  "clinic-profile:edit",
  "clinic-gallery:view",
  "clinic-gallery:edit",
  "clinic-treatments:view",
  "clinic-treatments:edit",
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

export const clinicDashboardEmailDestinations = {
  invite: "/auth/invite/complete",
  recovery: "/auth/password/reset/complete",
} as const satisfies Record<ClinicDashboardEmailFlow, string>
