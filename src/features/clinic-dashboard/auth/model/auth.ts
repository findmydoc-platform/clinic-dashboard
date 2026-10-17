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

const authenticatedClinicContextSchema = z.object({
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

export const clinicScopeBootstrapSchema = z
  .object({
    schemaVersion: z.literal("clinic-scope-v1"),
    principal: authenticatedClinicContextSchema.shape.principal,
    status: z.literal("approved"),
    clinics: z
      .array(
        z
          .object({
            id: z
              .string()
              .min(1)
              .max(100)
              .regex(/^[A-Za-z0-9._~-]+$/u),
            name: z.string().trim().min(1),
            capabilities: clinicDashboardCapabilitiesSchema,
          })
          .strict(),
      )
      .refine((clinics) => new Set(clinics.map(({ id }) => id)).size === clinics.length, {
        message: "Clinic IDs must be unique.",
      }),
  })
  .strict()
export type ClinicScopeBootstrap = z.infer<typeof clinicScopeBootstrapSchema>
export type AuthorizedClinic = ClinicScopeBootstrap["clinics"][number]

export type ClinicDashboardCapability = z.infer<typeof clinicDashboardCapabilitySchema>
export type AuthenticatedClinicContext = z.infer<typeof authenticatedClinicContextSchema>

const clinicDashboardAuthErrorCodes = [
  "INVALID_INPUT",
  "INVALID_CREDENTIALS",
  "INVALID_OR_EXPIRED_LINK",
  "ACCOUNT_UNAVAILABLE",
  "REQUEST_REJECTED",
  "AUTH_TEMPORARILY_UNAVAILABLE",
  "AUTH_LINK_TEMPORARILY_UNAVAILABLE",
  "AUTH_COMPLETION_UNCERTAIN",
  "SERVICE_TEMPORARILY_UNAVAILABLE",
] as const

export type ClinicDashboardAuthErrorCode = (typeof clinicDashboardAuthErrorCodes)[number]

export type ClinicDashboardAccessResult =
  | Readonly<{ context: ClinicScopeBootstrap; status: "approved" }>
  | Readonly<{ status: "denied" | "temporarily-unavailable" | "unauthenticated" | "unauthorized" }>

export type ClinicDashboardEmailFlow = "invite" | "recovery"

const inquiryDeepLinkPattern = /^[A-Za-z0-9._~-]{1,100}$/u
const inquiryReturnTargetPattern = /^\/\?inquiry=([A-Za-z0-9._~-]{1,100})$/u

export type ClinicDashboardReturnTarget = "/" | `/?inquiry=${string}` | `/clinics/${string}`

export function parseInquiryDeepLink(value: string | readonly string[] | undefined) {
  return typeof value === "string" && inquiryDeepLinkPattern.test(value) ? value : undefined
}

export function createClinicDashboardReturnTarget(inquiryId?: string): ClinicDashboardReturnTarget {
  return inquiryId && inquiryDeepLinkPattern.test(inquiryId) ? `/?inquiry=${inquiryId}` : "/"
}

export type ClinicDashboardExactTarget = Readonly<{
  clinicId: string
  kind: "inquiry" | "review"
  recordId: string
}>

export function parseClinicDashboardExactTarget(value: unknown): ClinicDashboardExactTarget | undefined {
  if (typeof value !== "string") return undefined
  const match =
    /^\/clinics\/([A-Za-z0-9._~-]{1,100})\?section=(messages|reviews)&(inquiry|review)=([A-Za-z0-9._~-]{1,128})$/u.exec(
      value,
    )
  if (!match) return undefined
  const [, clinicId, section, domain, recordId] = match
  if ((section === "messages") !== (domain === "inquiry")) return undefined
  if ([".", ".."].includes(clinicId!) || [".", ".."].includes(recordId!)) return undefined
  if (domain === "inquiry" && !inquiryDeepLinkPattern.test(recordId!)) return undefined
  if (domain === "review" && !/^[A-Za-z0-9_-]{1,128}$/u.test(recordId!)) return undefined
  return { clinicId: clinicId!, kind: domain === "inquiry" ? "inquiry" : "review", recordId: recordId! }
}

export function parseClinicDashboardReturnTarget(value: unknown): ClinicDashboardReturnTarget | undefined {
  if (value === "/") return value
  if (parseClinicDashboardExactTarget(value)) return value as ClinicDashboardReturnTarget
  return typeof value === "string" &&
    !/^\/clinics\/\.{1,2}(?:\?|$)/u.test(value) &&
    (inquiryReturnTargetPattern.test(value) ||
      /^\/clinics\/[A-Za-z0-9._~-]{1,100}(?:\?section=(?:dashboard|messages|reviews|profile|subscriptions|certificates-accreditations))?$/u.test(
        value,
      ))
    ? (value as ClinicDashboardReturnTarget)
    : undefined
}

export function createClinicDashboardLoginPath(returnTarget: ClinicDashboardReturnTarget) {
  return returnTarget === "/" ? "/login" : `/login?next=${encodeURIComponent(returnTarget)}`
}

export function createClinicDashboardExactTargetPath(
  target: ClinicDashboardExactTarget,
): ClinicDashboardReturnTarget | undefined {
  const section = target.kind === "inquiry" ? "messages" : "reviews"
  const path = `/clinics/${target.clinicId}?section=${section}&${target.kind}=${target.recordId}`
  return parseClinicDashboardExactTarget(path) ? (path as ClinicDashboardReturnTarget) : undefined
}

export function createClinicDashboardReturnTargetForRequest(
  pathname: string,
  inquiryValues: readonly string[],
  sectionValues: readonly string[] = [],
  reviewValues: readonly string[] = [],
  queryKeys: readonly string[] = [],
) {
  if (/^\/clinics\/[A-Za-z0-9._~-]{1,100}$/u.test(pathname) && !/^\/clinics\/\.{1,2}$/u.test(pathname)) {
    const record =
      inquiryValues.length === 1 && reviewValues.length === 0
        ? `?section=messages&inquiry=${inquiryValues[0]}`
        : reviewValues.length === 1 && inquiryValues.length === 0
          ? `?section=reviews&review=${reviewValues[0]}`
          : undefined
    const expectedSection = inquiryValues.length === 1 ? "messages" : "reviews"
    const matchingSection =
      sectionValues.length === 0 || (sectionValues.length === 1 && sectionValues[0] === expectedSection)
    const knownKeys = queryKeys.every((key) =>
      ["section", "inquiry", "review", "sessionRecovery", "selection"].includes(key),
    )
    if (record && matchingSection && knownKeys && parseClinicDashboardExactTarget(`${pathname}${record}`))
      return `${pathname}${record}` as ClinicDashboardReturnTarget
    const section =
      sectionValues.length === 1 &&
      /^(?:dashboard|messages|reviews|profile|subscriptions|certificates-accreditations)$/u.test(
        sectionValues[0] ?? "",
      )
        ? `?section=${sectionValues[0]}`
        : ""
    return `${pathname}${section}` as ClinicDashboardReturnTarget
  }
  const inquiryId =
    pathname === "/" && inquiryValues.length === 1 ? parseInquiryDeepLink(inquiryValues[0]) : undefined
  return createClinicDashboardReturnTarget(inquiryId)
}

export function createClinicDashboardLoginPathForRequest(
  pathname: string,
  inquiryValues: readonly string[],
  sectionValues: readonly string[] = [],
  reviewValues: readonly string[] = [],
  queryKeys: readonly string[] = [],
) {
  return createClinicDashboardLoginPath(
    createClinicDashboardReturnTargetForRequest(
      pathname,
      inquiryValues,
      sectionValues,
      reviewValues,
      queryKeys,
    ),
  )
}

export const clinicDashboardEmailDestinations = {
  invite: "/auth/invite/complete",
  recovery: "/auth/password/reset/complete",
} as const satisfies Record<ClinicDashboardEmailFlow, string>
