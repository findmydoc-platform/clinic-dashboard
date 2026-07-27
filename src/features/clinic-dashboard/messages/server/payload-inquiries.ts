import "server-only"

import { z } from "zod"
import { validateEnvironment } from "@/lib/env"
import {
  getPatientInquiryStatusTransitions,
  patientInquiryStatusValues,
  type PatientInquiry,
  type PatientInquiryQueueSnapshot,
  type PatientInquiryStatus,
} from "../model/inquiries"

const relationshipIdSchema = z.union([z.string(), z.number()]).transform(String)
const relationshipSchema = z.union([
  relationshipIdSchema,
  z.object({
    id: relationshipIdSchema,
    name: z.string().min(1),
  }),
])
const rawInquirySchema = z.object({
  createdAt: z.string(),
  email: z.string().email(),
  fullName: z.string().min(1),
  id: relationshipIdSchema,
  message: z.string().min(1),
  phoneNumber: z.string().min(1),
  preferredContactWindow: z
    .enum(["as_soon_as_possible", "morning", "afternoon", "evening", "no_preference"])
    .nullish(),
  status: z.enum(patientInquiryStatusValues),
  treatment: relationshipSchema.nullish(),
  treatmentTimeline: z
    .enum(["as_soon_as_possible", "within_two_weeks", "within_one_month", "flexible"])
    .nullish(),
  updatedAt: z.string(),
})
const inquiryListSchema = z.object({
  docs: z.array(rawInquirySchema),
})
const inquiryUpdateSchema = z.union([z.object({ doc: rawInquirySchema }), rawInquirySchema])

const treatmentTimelineLabels = {
  as_soon_as_possible: "As soon as possible",
  flexible: "Flexible",
  within_one_month: "Within one month",
  within_two_weeks: "Within two weeks",
} as const

const contactWindowLabels = {
  afternoon: "Afternoon",
  as_soon_as_possible: "As soon as possible",
  evening: "Evening",
  morning: "Morning",
  no_preference: "No preference",
} as const

type PatientInquiryPayloadErrorKind =
  "conflict" | "forbidden" | "not-found" | "temporarily-unavailable" | "unauthorized"

type PatientInquiryPayloadFailure = Error & Readonly<{ kind: PatientInquiryPayloadErrorKind }>

function patientInquiryPayloadError(kind: PatientInquiryPayloadErrorKind): PatientInquiryPayloadFailure {
  return Object.assign(new Error(`Patient inquiry request failed: ${kind}`), {
    kind,
    name: "PatientInquiryPayloadError",
  })
}

export function isPatientInquiryPayloadError(error: unknown): error is PatientInquiryPayloadFailure {
  return (
    error instanceof Error &&
    "kind" in error &&
    ["conflict", "forbidden", "not-found", "temporarily-unavailable", "unauthorized"].includes(
      String(error.kind),
    )
  )
}

function formatInquiryDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw patientInquiryPayloadError("temporarily-unavailable")

  return {
    dateLabel: new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      timeZone: "Europe/Berlin",
      year: "numeric",
    }).format(date),
    timeLabel: new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      minute: "2-digit",
      timeZone: "Europe/Berlin",
    }).format(date),
  }
}

function relationshipName(relationship: z.infer<typeof relationshipSchema> | null | undefined) {
  return relationship !== null && typeof relationship === "object" ? relationship.name : undefined
}

function mapPatientInquiry(rawInquiry: z.infer<typeof rawInquirySchema>): PatientInquiry {
  const { dateLabel, timeLabel } = formatInquiryDate(rawInquiry.createdAt)

  return {
    availableTransitions: getPatientInquiryStatusTransitions(rawInquiry.status),
    contactWindow: rawInquiry.preferredContactWindow
      ? contactWindowLabels[rawInquiry.preferredContactWindow]
      : "Not specified",
    createdAt: rawInquiry.createdAt,
    dateLabel,
    email: rawInquiry.email,
    id: rawInquiry.id,
    interest: relationshipName(rawInquiry.treatment) ?? "General clinic inquiry",
    message: rawInquiry.message,
    name: rawInquiry.fullName,
    phone: rawInquiry.phoneNumber,
    status: rawInquiry.status,
    timeLabel,
    treatmentTimeline: rawInquiry.treatmentTimeline
      ? treatmentTimelineLabels[rawInquiry.treatmentTimeline]
      : "Not specified",
  }
}

function endpointFor(pathname: string) {
  return new URL(pathname, validateEnvironment().PAYLOAD_API_URL)
}

function requestHeaders(accessToken: string) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
  }
}

function errorKindForStatus(status: number): PatientInquiryPayloadErrorKind {
  if (status === 401) return "unauthorized"
  if (status === 403) return "forbidden"
  if (status === 404) return "not-found"
  if (status === 400 || status === 409 || status === 422) return "conflict"
  return "temporarily-unavailable"
}

export async function fetchPatientInquiryQueue(
  accessToken: string,
  fetcher: typeof fetch = fetch,
): Promise<PatientInquiryQueueSnapshot> {
  const endpoint = endpointFor("/api/patientClinicInquiries")
  endpoint.searchParams.set("depth", "1")
  endpoint.searchParams.set("limit", "100")
  endpoint.searchParams.set("sort", "-createdAt")

  let response: Response
  try {
    response = await fetcher(endpoint, {
      cache: "no-store",
      headers: requestHeaders(accessToken),
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
    })
  } catch {
    throw patientInquiryPayloadError("temporarily-unavailable")
  }

  if (!response.ok) throw patientInquiryPayloadError(errorKindForStatus(response.status))

  const parsed = inquiryListSchema.safeParse(await response.json().catch(() => null))
  if (!parsed.success) throw patientInquiryPayloadError("temporarily-unavailable")

  return {
    inquiries: parsed.data.docs.map(mapPatientInquiry),
    status: "ready",
  }
}

export async function fetchPatientInquiry(
  accessToken: string,
  inquiryId: string,
  fetcher: typeof fetch = fetch,
): Promise<PatientInquiry> {
  const endpoint = endpointFor(`/api/patientClinicInquiries/${encodeURIComponent(inquiryId)}`)
  let response: Response

  try {
    response = await fetcher(endpoint, {
      cache: "no-store",
      headers: requestHeaders(accessToken),
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
    })
  } catch {
    throw patientInquiryPayloadError("temporarily-unavailable")
  }

  if (!response.ok) throw patientInquiryPayloadError(errorKindForStatus(response.status))

  const parsed = inquiryUpdateSchema.safeParse(await response.json().catch(() => null))
  if (!parsed.success) throw patientInquiryPayloadError("temporarily-unavailable")

  return mapPatientInquiry("doc" in parsed.data ? parsed.data.doc : parsed.data)
}

export async function updatePatientInquiryStatus(
  accessToken: string,
  inquiryId: string,
  status: PatientInquiryStatus,
  fetcher: typeof fetch = fetch,
) {
  const endpoint = endpointFor(`/api/patientClinicInquiries/${encodeURIComponent(inquiryId)}`)
  let response: Response

  try {
    response = await fetcher(endpoint, {
      body: JSON.stringify({ status }),
      cache: "no-store",
      headers: {
        ...requestHeaders(accessToken),
        "Content-Type": "application/json",
      },
      method: "PATCH",
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
    })
  } catch {
    throw patientInquiryPayloadError("temporarily-unavailable")
  }

  if (!response.ok) throw patientInquiryPayloadError(errorKindForStatus(response.status))

  const parsed = inquiryUpdateSchema.safeParse(await response.json().catch(() => null))
  if (!parsed.success) throw patientInquiryPayloadError("temporarily-unavailable")

  const rawInquiry = "doc" in parsed.data ? parsed.data.doc : parsed.data
  const inquiry = mapPatientInquiry(rawInquiry)
  return {
    changedAt: formatInquiryDate(rawInquiry.updatedAt).timeLabel,
    inquiry,
  }
}
