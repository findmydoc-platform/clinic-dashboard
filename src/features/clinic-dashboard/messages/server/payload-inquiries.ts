import "server-only"

import { z } from "zod"
import { validateEnvironment } from "@/lib/env"
import {
  getPatientInquiryStatusTransitions,
  isAllowedPatientInquiryStatusTransition,
  patientInquiryStatusValues,
  type PatientInquiry,
} from "../model/inquiries"
import type {
  PatientInquiryChangeError,
  PatientInquiryProvider,
  PatientInquiryReadError,
} from "./patient-inquiry-provider"

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

function formatInquiryDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error("Invalid inquiry date")

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

function readErrorForStatus(status: number | undefined): PatientInquiryReadError {
  if (status === 401) return "unauthorized"
  if (status === 403) return "forbidden"
  return "temporarily-unavailable"
}

function changeErrorForStatus(status: number | undefined): PatientInquiryChangeError {
  if (status === 401) return "unauthorized"
  if (status === 403) return "forbidden"
  if (status === 404) return "not-found"
  if (status === 400 || status === 409 || status === 422) return "conflict"
  return "temporarily-unavailable"
}

type PayloadResponse =
  | Readonly<{
      ok: true
      value: unknown
    }>
  | Readonly<{
      ok: false
      status?: number
    }>

async function requestPayloadJson(
  endpoint: URL,
  init: RequestInit,
  fetcher: typeof fetch,
): Promise<PayloadResponse> {
  try {
    const response = await fetcher(endpoint, init)
    if (!response.ok) return { ok: false, status: response.status }
    return { ok: true, value: await response.json().catch(() => null) }
  } catch {
    return { ok: false }
  }
}

export function createPayloadPatientInquiryProvider(
  accessToken: string,
  fetcher: typeof fetch = fetch,
): PatientInquiryProvider {
  return {
    async changeStatus({ inquiryId, status }) {
      try {
        const endpoint = endpointFor(`/api/patientClinicInquiries/${encodeURIComponent(inquiryId)}`)
        const currentResponse = await requestPayloadJson(
          endpoint,
          {
            cache: "no-store",
            headers: requestHeaders(accessToken),
            redirect: "error",
            signal: AbortSignal.timeout(5_000),
          },
          fetcher,
        )
        if (!currentResponse.ok) {
          return { error: changeErrorForStatus(currentResponse.status), ok: false }
        }

        const currentParsed = inquiryUpdateSchema.safeParse(currentResponse.value)
        if (!currentParsed.success) {
          return { error: "temporarily-unavailable", ok: false }
        }
        const currentRaw = "doc" in currentParsed.data ? currentParsed.data.doc : currentParsed.data
        const currentInquiry = mapPatientInquiry(currentRaw)
        if (!isAllowedPatientInquiryStatusTransition(currentInquiry.status, status)) {
          return { error: "conflict", ok: false }
        }

        const updateResponse = await requestPayloadJson(
          endpoint,
          {
            body: JSON.stringify({ status }),
            cache: "no-store",
            headers: {
              ...requestHeaders(accessToken),
              "Content-Type": "application/json",
            },
            method: "PATCH",
            redirect: "error",
            signal: AbortSignal.timeout(5_000),
          },
          fetcher,
        )
        if (!updateResponse.ok) {
          return { error: changeErrorForStatus(updateResponse.status), ok: false }
        }

        const updatedParsed = inquiryUpdateSchema.safeParse(updateResponse.value)
        if (!updatedParsed.success) {
          return { error: "temporarily-unavailable", ok: false }
        }

        const updatedRaw = "doc" in updatedParsed.data ? updatedParsed.data.doc : updatedParsed.data
        return {
          ok: true,
          value: {
            changedAt: formatInquiryDate(updatedRaw.updatedAt).timeLabel,
            inquiry: mapPatientInquiry(updatedRaw),
          },
        }
      } catch {
        return { error: "temporarily-unavailable", ok: false }
      }
    },
    async loadQueue() {
      try {
        const endpoint = endpointFor("/api/patientClinicInquiries")
        endpoint.searchParams.set("depth", "1")
        endpoint.searchParams.set("limit", "100")
        endpoint.searchParams.set("sort", "-createdAt")

        const response = await requestPayloadJson(
          endpoint,
          {
            cache: "no-store",
            headers: requestHeaders(accessToken),
            redirect: "error",
            signal: AbortSignal.timeout(5_000),
          },
          fetcher,
        )
        if (!response.ok) {
          return { error: readErrorForStatus(response.status), ok: false }
        }

        const parsed = inquiryListSchema.safeParse(response.value)
        if (!parsed.success) {
          return { error: "temporarily-unavailable", ok: false }
        }

        return {
          ok: true,
          value: {
            inquiries: parsed.data.docs.map(mapPatientInquiry),
            status: "ready",
          },
        }
      } catch {
        return { error: "temporarily-unavailable", ok: false }
      }
    },
  }
}
