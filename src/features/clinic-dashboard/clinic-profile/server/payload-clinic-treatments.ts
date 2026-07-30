import "server-only"

import { z } from "zod"
import { validateEnvironment } from "@/lib/env"
import type {
  ClinicTreatmentCreateInput,
  ClinicTreatmentOffering,
  ClinicTreatmentUpdateInput,
  MasterTreatment,
} from "../model/clinic-treatment"
import type {
  ClinicTreatmentChangeError,
  ClinicTreatmentProvider,
  ClinicTreatmentReadError,
} from "./clinic-treatment-provider"

const relationshipIdSchema = z.union([z.string(), z.number()]).transform(String)
const relationshipSchema = z.union([
  relationshipIdSchema,
  z
    .object({
      id: relationshipIdSchema,
    })
    .passthrough(),
])
const rawTreatmentSchema = z.object({
  description: z.unknown().nullish(),
  id: relationshipIdSchema,
  name: z.string().min(1),
})
const rawOfferingSchema = z.object({
  active: z.boolean(),
  clinic: relationshipSchema,
  id: relationshipIdSchema,
  price: z.number().nonnegative(),
  treatment: rawTreatmentSchema,
})
const treatmentListSchema = z.object({ docs: z.array(rawTreatmentSchema) })
const offeringListSchema = z.object({ docs: z.array(rawOfferingSchema) })
const offeringResponseSchema = z.union([z.object({ doc: rawOfferingSchema }), rawOfferingSchema])

type PayloadResponse = Readonly<{ ok: true; value: unknown }> | Readonly<{ ok: false; status?: number }>

function relationshipId(value: z.infer<typeof relationshipSchema>) {
  return typeof value === "string" ? value : value.id
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

function readErrorForStatus(status: number | undefined): ClinicTreatmentReadError {
  if (status === 401) return "unauthorized"
  if (status === 403) return "forbidden"
  return "temporarily-unavailable"
}

function changeErrorForStatus(status: number | undefined): ClinicTreatmentChangeError {
  if (status === 401) return "unauthorized"
  if (status === 403) return "forbidden"
  if (status === 404) return "not-found"
  if (status === 400 || status === 422) return "invalid-input"
  if (status === 409) return "conflict"
  return "temporarily-unavailable"
}

function payloadRelationshipId(value: string): string | number {
  if (!/^[1-9]\d*$/u.test(value)) return value

  const numericValue = Number(value)
  return Number.isSafeInteger(numericValue) ? numericValue : value
}

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

function readInit(accessToken: string): RequestInit {
  return {
    cache: "no-store",
    headers: requestHeaders(accessToken),
    redirect: "error",
    signal: AbortSignal.timeout(8_000),
  }
}

function mutationInit(
  accessToken: string,
  method: "PATCH" | "POST",
  body: Record<string, unknown>,
): RequestInit {
  return {
    body: JSON.stringify(body),
    cache: "no-store",
    headers: {
      ...requestHeaders(accessToken),
      "Content-Type": "application/json",
    },
    method,
    redirect: "error",
    signal: AbortSignal.timeout(8_000),
  }
}

function collectText(value: unknown, output: string[]) {
  if (Array.isArray(value)) {
    for (const item of value) collectText(item, output)
    return
  }
  if (!value || typeof value !== "object") return

  const node = value as Record<string, unknown>
  if (typeof node.text === "string") output.push(node.text)
  for (const [key, child] of Object.entries(node)) {
    if (key !== "text") collectText(child, output)
  }
}

export function extractTreatmentDescriptionText(value: unknown) {
  const parts: string[] = []
  collectText(value, parts)
  return parts.join(" ").replace(/\s+/gu, " ").trim()
}

function mapTreatment(rawTreatment: z.infer<typeof rawTreatmentSchema>): MasterTreatment {
  return {
    descriptionText: extractTreatmentDescriptionText(rawTreatment.description),
    id: rawTreatment.id,
    name: rawTreatment.name,
  }
}

function mapOffering(
  rawOffering: z.infer<typeof rawOfferingSchema>,
  clinicId: string,
): ClinicTreatmentOffering {
  if (relationshipId(rawOffering.clinic) !== clinicId) {
    throw new Error("Clinic treatment clinic mismatch")
  }

  return {
    active: rawOffering.active,
    id: rawOffering.id,
    price: rawOffering.price,
    treatment: mapTreatment(rawOffering.treatment),
  }
}

function clinicOfferingsEndpoint(clinicId: string) {
  const endpoint = endpointFor("/api/clinictreatments")
  endpoint.searchParams.set("depth", "1")
  endpoint.searchParams.set("limit", "1000")
  endpoint.searchParams.set("pagination", "false")
  endpoint.searchParams.set("where[clinic][equals]", clinicId)
  return endpoint
}

function catalogueEndpoint() {
  const endpoint = endpointFor("/api/treatments")
  endpoint.searchParams.set("depth", "0")
  endpoint.searchParams.set("limit", "1000")
  endpoint.searchParams.set("pagination", "false")
  endpoint.searchParams.set("sort", "name")
  return endpoint
}

export function createPayloadClinicTreatmentProvider(
  accessToken: string,
  clinicId: string,
  fetcher: typeof fetch = fetch,
): ClinicTreatmentProvider {
  return {
    async createTreatment(input: ClinicTreatmentCreateInput) {
      const existingEndpoint = clinicOfferingsEndpoint(clinicId)
      existingEndpoint.searchParams.set("where[treatment][equals]", input.treatmentId)
      existingEndpoint.searchParams.set("limit", "1")
      const existing = await requestPayloadJson(existingEndpoint, readInit(accessToken), fetcher)
      if (!existing.ok) return { error: changeErrorForStatus(existing.status), ok: false }
      const existingParsed = offeringListSchema.safeParse(existing.value)
      if (!existingParsed.success) return { error: "invalid-data", ok: false }
      if (existingParsed.data.docs.length > 0) return { error: "conflict", ok: false }

      const response = await requestPayloadJson(
        endpointFor("/api/clinictreatments"),
        mutationInit(accessToken, "POST", {
          active: input.active,
          clinic: payloadRelationshipId(clinicId),
          price: input.price,
          treatment: payloadRelationshipId(input.treatmentId),
        }),
        fetcher,
      )
      if (!response.ok) {
        if (response.status === 400 || response.status === 422) {
          const concurrentDuplicate = await requestPayloadJson(
            existingEndpoint,
            readInit(accessToken),
            fetcher,
          )
          const concurrentDuplicateParsed = concurrentDuplicate.ok
            ? offeringListSchema.safeParse(concurrentDuplicate.value)
            : undefined
          if (concurrentDuplicateParsed?.success && concurrentDuplicateParsed.data.docs.length > 0) {
            return { error: "conflict", ok: false }
          }
        }
        return { error: changeErrorForStatus(response.status), ok: false }
      }
      const parsed = offeringResponseSchema.safeParse(response.value)
      if (!parsed.success) return { error: "invalid-data", ok: false }

      try {
        return {
          ok: true,
          value: mapOffering("doc" in parsed.data ? parsed.data.doc : parsed.data, clinicId),
        }
      } catch {
        return { error: "invalid-data", ok: false }
      }
    },

    async loadTreatments() {
      const [offeringsResponse, catalogueResponse] = await Promise.all([
        requestPayloadJson(clinicOfferingsEndpoint(clinicId), readInit(accessToken), fetcher),
        requestPayloadJson(catalogueEndpoint(), readInit(accessToken), fetcher),
      ])
      if (!offeringsResponse.ok) {
        return { error: readErrorForStatus(offeringsResponse.status), ok: false }
      }
      if (!catalogueResponse.ok) {
        return { error: readErrorForStatus(catalogueResponse.status), ok: false }
      }

      const offerings = offeringListSchema.safeParse(offeringsResponse.value)
      const catalogue = treatmentListSchema.safeParse(catalogueResponse.value)
      if (!offerings.success || !catalogue.success) {
        return { error: "temporarily-unavailable", ok: false }
      }

      try {
        return {
          ok: true,
          value: {
            catalogue: catalogue.data.docs.map(mapTreatment),
            offerings: offerings.data.docs.map((offering) => mapOffering(offering, clinicId)),
            status: "ready",
          },
        }
      } catch {
        return { error: "temporarily-unavailable", ok: false }
      }
    },

    async updateTreatment(offeringId: string, input: ClinicTreatmentUpdateInput) {
      const response = await requestPayloadJson(
        endpointFor(`/api/clinictreatments/${encodeURIComponent(offeringId)}`),
        mutationInit(accessToken, "PATCH", {
          active: input.active,
          price: input.price,
        }),
        fetcher,
      )
      if (!response.ok) return { error: changeErrorForStatus(response.status), ok: false }
      const parsed = offeringResponseSchema.safeParse(response.value)
      if (!parsed.success) return { error: "invalid-data", ok: false }

      try {
        return {
          ok: true,
          value: mapOffering("doc" in parsed.data ? parsed.data.doc : parsed.data, clinicId),
        }
      } catch {
        return { error: "invalid-data", ok: false }
      }
    },
  }
}
