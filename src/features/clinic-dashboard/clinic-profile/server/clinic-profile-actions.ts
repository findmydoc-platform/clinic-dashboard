import "server-only"

import { NextResponse, type NextRequest } from "next/server"
import { resolveClinicDashboardMutationAccess } from "@/features/clinic-dashboard/auth/server/public"
import { validateMutationRequest } from "@/lib/security/csrf"
import { applyPrivateResponseHeaders } from "@/lib/security/private-response"
import {
  clinicProfileDraftDiscardInputSchema,
  clinicProfileDraftSaveInputSchema,
  clinicProfilePublishInputSchema,
} from "./clinic-profile-dto"
import type {
  ClinicProfileChangeError,
  ClinicProfileProviderFactory,
  ClinicProfileReadError,
} from "./clinic-profile-provider"

const MAX_PROFILE_REQUEST_BODY_BYTES = 64 * 1024

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
      parsedLength > MAX_PROFILE_REQUEST_BODY_BYTES
    ) {
      return null
    }
  }

  const body = await request.text().catch(() => "")
  if (!body || Buffer.byteLength(body, "utf8") > MAX_PROFILE_REQUEST_BODY_BYTES) return null

  try {
    return JSON.parse(body) as unknown
  } catch {
    return null
  }
}

function accessErrorResponse(
  status: Exclude<Awaited<ReturnType<typeof resolveClinicDashboardMutationAccess>>["status"], "approved">,
) {
  if (status === "denied") return privateJson({ code: "CLINIC_PROFILE_ACCESS_DENIED" }, 403)
  if (status === "temporarily-unavailable") {
    return privateJson({ code: "CLINIC_PROFILE_SERVICE_UNAVAILABLE" }, 503)
  }
  return privateJson({ code: "CLINIC_PROFILE_UNAUTHORIZED" }, 401)
}

function readErrorResponse(error: ClinicProfileReadError) {
  if (error === "unauthorized") return privateJson({ code: "CLINIC_PROFILE_UNAUTHORIZED" }, 401)
  if (error === "forbidden") return privateJson({ code: "CLINIC_PROFILE_ACCESS_DENIED" }, 403)
  if (error === "invalid-data") return privateJson({ code: "CLINIC_PROFILE_INVALID_RESPONSE" }, 502)
  return privateJson({ code: "CLINIC_PROFILE_SERVICE_UNAVAILABLE" }, 503)
}

function changeErrorResponse(error: ClinicProfileChangeError) {
  if (error === "conflict") return privateJson({ code: "CLINIC_PROFILE_CONFLICT" }, 409)
  if (error === "invalid-input") return privateJson({ code: "INVALID_INPUT" }, 400)
  if (error === "not-found") return privateJson({ code: "CLINIC_PROFILE_DRAFT_NOT_FOUND" }, 404)
  return readErrorResponse(error)
}

export async function handleClinicProfileLoad(
  request: NextRequest,
  createProvider: ClinicProfileProviderFactory,
) {
  const authorization = await resolveClinicDashboardMutationAccess(request)
  if (authorization.status !== "approved") {
    return authorization.applyToResponse(accessErrorResponse(authorization.status))
  }

  try {
    const result = await createProvider(authorization.accessToken, authorization.clinicId).loadSnapshot()
    const response = result.ok ? privateJson(result.value) : readErrorResponse(result.error)
    return authorization.applyToResponse(response)
  } catch {
    return authorization.applyToResponse(privateJson({ code: "CLINIC_PROFILE_SERVICE_UNAVAILABLE" }, 503))
  }
}

export async function handleClinicProfileDraftSave(
  request: NextRequest,
  createProvider: ClinicProfileProviderFactory,
) {
  if (!validateMutationRequest(request)) return privateJson({ code: "REQUEST_REJECTED" }, 403)

  const input = clinicProfileDraftSaveInputSchema.safeParse(await readJson(request))
  if (!input.success) return privateJson({ code: "INVALID_INPUT" }, 400)

  const authorization = await resolveClinicDashboardMutationAccess(request)
  if (authorization.status !== "approved") {
    return authorization.applyToResponse(accessErrorResponse(authorization.status))
  }

  try {
    const result = await createProvider(authorization.accessToken, authorization.clinicId).saveDraft(
      input.data,
    )
    const response = result.ok ? privateJson(result.value) : changeErrorResponse(result.error)
    return authorization.applyToResponse(response)
  } catch {
    return authorization.applyToResponse(privateJson({ code: "CLINIC_PROFILE_SERVICE_UNAVAILABLE" }, 503))
  }
}

export async function handleClinicProfileDraftDiscard(
  request: NextRequest,
  createProvider: ClinicProfileProviderFactory,
) {
  if (!validateMutationRequest(request)) return privateJson({ code: "REQUEST_REJECTED" }, 403)

  const input = clinicProfileDraftDiscardInputSchema.safeParse(await readJson(request))
  if (!input.success) return privateJson({ code: "INVALID_INPUT" }, 400)

  const authorization = await resolveClinicDashboardMutationAccess(request)
  if (authorization.status !== "approved") {
    return authorization.applyToResponse(accessErrorResponse(authorization.status))
  }

  try {
    const result = await createProvider(authorization.accessToken, authorization.clinicId).discardDraft(
      input.data,
    )
    const response = result.ok ? privateJson(result.value) : changeErrorResponse(result.error)
    return authorization.applyToResponse(response)
  } catch {
    return authorization.applyToResponse(privateJson({ code: "CLINIC_PROFILE_SERVICE_UNAVAILABLE" }, 503))
  }
}

export async function handleClinicProfilePublish(
  request: NextRequest,
  createProvider: ClinicProfileProviderFactory,
) {
  if (!validateMutationRequest(request)) return privateJson({ code: "REQUEST_REJECTED" }, 403)

  const input = clinicProfilePublishInputSchema.safeParse(await readJson(request))
  if (!input.success) return privateJson({ code: "INVALID_INPUT" }, 400)

  const authorization = await resolveClinicDashboardMutationAccess(request)
  if (authorization.status !== "approved") {
    return authorization.applyToResponse(accessErrorResponse(authorization.status))
  }

  try {
    const result = await createProvider(authorization.accessToken, authorization.clinicId).publishDraft(
      input.data,
    )
    const response = result.ok ? privateJson(result.value) : changeErrorResponse(result.error)
    return authorization.applyToResponse(response)
  } catch {
    return authorization.applyToResponse(privateJson({ code: "CLINIC_PROFILE_SERVICE_UNAVAILABLE" }, 503))
  }
}
