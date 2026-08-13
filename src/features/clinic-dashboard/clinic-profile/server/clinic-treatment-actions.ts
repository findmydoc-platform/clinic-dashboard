import "server-only"

import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import type { ClinicDashboardCapability } from "@/features/clinic-dashboard/auth/public"
import { resolveClinicDashboardMutationAccess } from "@/features/clinic-dashboard/auth/server/public"
import { validateMutationRequest } from "@/lib/security/csrf"
import { applyPrivateResponseHeaders } from "@/lib/security/private-response"
import type {
  ClinicTreatmentChangeError,
  ClinicTreatmentProviderFactory,
  ClinicTreatmentReadError,
} from "./clinic-treatment-provider"

const identifierSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/u)
const priceSchema = z
  .number()
  .finite()
  .nonnegative()
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) <= 1e-8)
const createSchema = z
  .object({
    price: priceSchema,
    treatmentId: identifierSchema,
  })
  .strict()
const updateSchema = z
  .object({
    active: z.boolean(),
    expectedRevision: z.string().datetime({ offset: true }),
    price: priceSchema,
  })
  .strict()

const MAX_JSON_REQUEST_BODY_BYTES = 16 * 1024

function privateJson(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status })
  applyPrivateResponseHeaders(response.headers)
  response.headers.set("Vary", "Cookie")
  return response
}

async function readJson(request: NextRequest) {
  const contentLength = request.headers.get("content-length")
  if (contentLength) {
    const parsedLength = Number(contentLength)
    if (
      !Number.isSafeInteger(parsedLength) ||
      parsedLength < 0 ||
      parsedLength > MAX_JSON_REQUEST_BODY_BYTES
    ) {
      return null
    }
  }

  const body = await request.text().catch(() => "")
  if (!body || Buffer.byteLength(body, "utf8") > MAX_JSON_REQUEST_BODY_BYTES) return null

  try {
    return JSON.parse(body) as unknown
  } catch {
    return null
  }
}

function accessErrorResponse(
  status: "denied" | "temporarily-unavailable" | "unauthenticated" | "unauthorized",
) {
  if (status === "denied" || status === "unauthorized") {
    return privateJson({ code: "CLINIC_TREATMENT_ACCESS_DENIED" }, 403)
  }
  if (status === "temporarily-unavailable") {
    return privateJson({ code: "CLINIC_TREATMENT_SERVICE_UNAVAILABLE" }, 503)
  }
  return privateJson({ code: "CLINIC_TREATMENT_UNAUTHORIZED" }, 401)
}

function readErrorResponse(error: ClinicTreatmentReadError) {
  if (error === "unauthorized") return privateJson({ code: "CLINIC_TREATMENT_UNAUTHORIZED" }, 401)
  if (error === "forbidden") return privateJson({ code: "CLINIC_TREATMENT_ACCESS_DENIED" }, 403)
  return privateJson({ code: "CLINIC_TREATMENT_SERVICE_UNAVAILABLE" }, 503)
}

function changeErrorResponse(error: ClinicTreatmentChangeError) {
  if (error === "unauthorized") return privateJson({ code: "CLINIC_TREATMENT_UNAUTHORIZED" }, 401)
  if (error === "forbidden") return privateJson({ code: "CLINIC_TREATMENT_ACCESS_DENIED" }, 403)
  if (error === "not-found") return privateJson({ code: "CLINIC_TREATMENT_NOT_FOUND" }, 404)
  if (error === "invalid-input") return privateJson({ code: "INVALID_INPUT" }, 400)
  if (error === "conflict") return privateJson({ code: "CLINIC_TREATMENT_CONFLICT" }, 409)
  if (error === "invalid-data") return privateJson({ code: "CLINIC_TREATMENT_INVALID_RESPONSE" }, 502)
  return privateJson({ code: "CLINIC_TREATMENT_SERVICE_UNAVAILABLE" }, 503)
}

function hasCapability(
  capabilities: readonly ClinicDashboardCapability[],
  capability: ClinicDashboardCapability,
) {
  return capabilities.includes(capability)
}

export async function handleClinicTreatmentRead(
  request: NextRequest,
  createProvider: ClinicTreatmentProviderFactory,
) {
  const authorization = await resolveClinicDashboardMutationAccess(request)
  if (authorization.status !== "approved") {
    return authorization.applyToResponse(accessErrorResponse(authorization.status))
  }
  if (!hasCapability(authorization.capabilities, "clinic-treatments:view")) {
    return authorization.applyToResponse(privateJson({ code: "CLINIC_TREATMENT_ACCESS_DENIED" }, 403))
  }

  try {
    const result = await createProvider(authorization.accessToken, authorization.clinicId).loadTreatments()
    const response = result.ok ? privateJson(result.value) : readErrorResponse(result.error)
    return authorization.applyToResponse(response)
  } catch {
    return authorization.applyToResponse(privateJson({ code: "CLINIC_TREATMENT_SERVICE_UNAVAILABLE" }, 503))
  }
}

export async function handleClinicTreatmentCreate(
  request: NextRequest,
  createProvider: ClinicTreatmentProviderFactory,
) {
  if (!validateMutationRequest(request)) return privateJson({ code: "REQUEST_REJECTED" }, 403)
  const input = createSchema.safeParse(await readJson(request))
  if (!input.success) return privateJson({ code: "INVALID_INPUT" }, 400)

  const authorization = await resolveClinicDashboardMutationAccess(request)
  if (authorization.status !== "approved") {
    return authorization.applyToResponse(accessErrorResponse(authorization.status))
  }
  if (!hasCapability(authorization.capabilities, "clinic-treatments:edit")) {
    return authorization.applyToResponse(privateJson({ code: "CLINIC_TREATMENT_ACCESS_DENIED" }, 403))
  }

  try {
    const result = await createProvider(authorization.accessToken, authorization.clinicId).createTreatment(
      input.data,
    )
    const response = result.ok ? privateJson(result.value, 201) : changeErrorResponse(result.error)
    return authorization.applyToResponse(response)
  } catch {
    return authorization.applyToResponse(privateJson({ code: "CLINIC_TREATMENT_SERVICE_UNAVAILABLE" }, 503))
  }
}

export async function handleClinicTreatmentUpdate(
  request: NextRequest,
  createProvider: ClinicTreatmentProviderFactory,
) {
  if (!validateMutationRequest(request)) return privateJson({ code: "REQUEST_REJECTED" }, 403)
  const offeringId = identifierSchema.safeParse(request.nextUrl.searchParams.get("offeringId"))
  const input = updateSchema.safeParse(await readJson(request))
  if (!offeringId.success || !input.success) return privateJson({ code: "INVALID_INPUT" }, 400)

  const authorization = await resolveClinicDashboardMutationAccess(request)
  if (authorization.status !== "approved") {
    return authorization.applyToResponse(accessErrorResponse(authorization.status))
  }
  if (!hasCapability(authorization.capabilities, "clinic-treatments:edit")) {
    return authorization.applyToResponse(privateJson({ code: "CLINIC_TREATMENT_ACCESS_DENIED" }, 403))
  }

  try {
    const result = await createProvider(authorization.accessToken, authorization.clinicId).updateTreatment(
      offeringId.data,
      input.data,
    )
    const response = result.ok ? privateJson(result.value) : changeErrorResponse(result.error)
    return authorization.applyToResponse(response)
  } catch {
    return authorization.applyToResponse(privateJson({ code: "CLINIC_TREATMENT_SERVICE_UNAVAILABLE" }, 503))
  }
}
