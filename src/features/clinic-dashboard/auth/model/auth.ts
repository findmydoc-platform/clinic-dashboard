import { z } from "zod"

const clinicDashboardCapabilityValues = [
  "clinic-profile:view",
  "clinic-profile:edit",
  "clinic-treatments:view",
  "clinic-treatments:edit",
] as const

const clinicDashboardCapabilitySchema = z.enum(clinicDashboardCapabilityValues)

const capabilityListSchema = z
  .array(clinicDashboardCapabilitySchema)
  .min(1)
  .max(clinicDashboardCapabilityValues.length)
  .superRefine((capabilities, context) => {
    const unique = new Set(capabilities)
    const ordered = clinicDashboardCapabilityValues.filter((capability) => unique.has(capability))
    if (
      unique.size !== capabilities.length ||
      ordered.some((capability, index) => capability !== capabilities[index])
    ) {
      context.addIssue({ code: "custom", message: "Capabilities must be unique and canonically ordered." })
    }
    if (
      !unique.has("clinic-profile:view") ||
      (unique.has("clinic-profile:edit") && !unique.has("clinic-profile:view")) ||
      (unique.has("clinic-treatments:edit") && !unique.has("clinic-treatments:view"))
    ) {
      context.addIssue({ code: "custom", message: "Capability dependencies are invalid." })
    }
  })
  .readonly()

export const authenticatedClinicContextSchema = z.object({
  capabilities: capabilityListSchema,
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
