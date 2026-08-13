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

const masterTreatmentSchema = z.object({
  descriptionText: z.string(),
  id: z.string(),
  name: z.string().min(1),
})
const offeringSchema = z.object({
  active: z.boolean(),
  id: z.string(),
  priceEUR: z.number().nonnegative(),
  revision: z.string().datetime({ offset: true }),
  treatment: masterTreatmentSchema,
})
const snapshotSchema = z.object({
  catalogue: z.array(masterTreatmentSchema),
  offerings: z.array(offeringSchema),
})

type PayloadResponse = Readonly<{ ok: true; value: unknown }> | Readonly<{ ok: false; status?: number }>

function endpoint() {
  return new URL("/api/clinic-dashboard/treatments", validateEnvironment().PAYLOAD_API_URL)
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

async function requestPayloadJson(
  accessToken: string,
  init: RequestInit,
  fetcher: typeof fetch,
): Promise<PayloadResponse> {
  try {
    const response = await fetcher(endpoint(), {
      ...init,
      cache: "no-store",
      headers: {
        ...requestHeaders(accessToken),
        ...init.headers,
      },
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) return { ok: false, status: response.status }
    return { ok: true, value: await response.json().catch(() => null) }
  } catch {
    return { ok: false }
  }
}

function mutationInit(method: "PATCH" | "POST", body: Record<string, unknown>): RequestInit {
  return {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method,
  }
}

function mapMasterTreatment(treatment: z.infer<typeof masterTreatmentSchema>): MasterTreatment {
  return treatment
}

function mapOffering(offering: z.infer<typeof offeringSchema>): ClinicTreatmentOffering {
  return {
    active: offering.active,
    id: offering.id,
    price: offering.priceEUR,
    revision: offering.revision,
    treatment: mapMasterTreatment(offering.treatment),
  }
}

export function createPayloadClinicTreatmentProvider(
  accessToken: string,
  _clinicId: string,
  fetcher: typeof fetch = fetch,
): ClinicTreatmentProvider {
  return {
    async createTreatment(input: ClinicTreatmentCreateInput) {
      const response = await requestPayloadJson(
        accessToken,
        mutationInit("POST", {
          priceEUR: input.price,
          treatmentId: input.treatmentId,
        }),
        fetcher,
      )
      if (!response.ok) return { error: changeErrorForStatus(response.status), ok: false }
      const parsed = offeringSchema.safeParse(response.value)
      return parsed.success
        ? { ok: true, value: mapOffering(parsed.data) }
        : { error: "invalid-data", ok: false }
    },

    async loadTreatments() {
      const response = await requestPayloadJson(accessToken, {}, fetcher)
      if (!response.ok) return { error: readErrorForStatus(response.status), ok: false }
      const parsed = snapshotSchema.safeParse(response.value)
      if (!parsed.success) return { error: "temporarily-unavailable", ok: false }

      return {
        ok: true,
        value: {
          catalogue: parsed.data.catalogue.map(mapMasterTreatment),
          offerings: parsed.data.offerings.map(mapOffering),
          status: "ready",
        },
      }
    },

    async updateTreatment(offeringId: string, input: ClinicTreatmentUpdateInput) {
      const response = await requestPayloadJson(
        accessToken,
        mutationInit("PATCH", {
          active: input.active,
          expectedRevision: input.expectedRevision,
          offeringId,
          priceEUR: input.price,
        }),
        fetcher,
      )
      if (!response.ok) return { error: changeErrorForStatus(response.status), ok: false }
      const parsed = offeringSchema.safeParse(response.value)
      return parsed.success
        ? { ok: true, value: mapOffering(parsed.data) }
        : { error: "invalid-data", ok: false }
    },
  }
}
