import "server-only"

import type { NextRequest, NextResponse } from "next/server"
import { resolveClinicDashboardRouteAccess } from "@/features/clinic-dashboard/auth/server/public"
import { validateMutationRequest } from "@/lib/security/csrf"
import { createPrivateJsonResponse as privateJson, readPrivateJson } from "@/lib/security/private-response"
import {
  clinicProfileDraftCreateInputSchema,
  clinicProfileDraftDiscardInputSchema,
  clinicProfileDraftSaveInputSchema,
  clinicProfilePublishInputSchema,
} from "./clinic-profile-dto"
import type {
  ClinicProfileChangeError,
  ClinicProfileProvider,
  ClinicProfileProviderFactory,
  ClinicProfileReadError,
} from "./clinic-profile-provider"

const MAX_PROFILE_REQUEST_BODY_BYTES = 64 * 1024

type ProfileOperation = (provider: ClinicProfileProvider) => Promise<NextResponse>
type PreparedProfileAction = NextResponse | ProfileOperation

function readJson(request: NextRequest) {
  return readPrivateJson(request, MAX_PROFILE_REQUEST_BODY_BYTES, { fatalUtf8: true })
}

function accessErrorResponse(
  status: Exclude<Awaited<ReturnType<typeof resolveClinicDashboardRouteAccess>>["status"], "approved">,
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

async function authorizeProfileTarget(
  request: NextRequest,
  capability: "clinic-profile:view" | "clinic-profile:edit",
) {
  const target = /^\/api\/dashboard\/clinics\/([A-Za-z0-9_-]{1,128})\/profile(?:\/|$)/u.exec(
    request.nextUrl.pathname,
  )?.[1]
  if (!target) return { status: "denied" as const, applyToResponse: (response: Response) => response }
  const access = await resolveClinicDashboardRouteAccess(request, capability, target)
  if (access.status === "approved" && access.clinicId !== target)
    return { ...access, status: "denied" as const }
  return access
}

async function handleAuthorizedProfileAction(
  request: NextRequest,
  createProvider: ClinicProfileProviderFactory,
  capability: "clinic-profile:view" | "clinic-profile:edit",
  prepare: () => PreparedProfileAction | Promise<PreparedProfileAction>,
) {
  const authorization = await authorizeProfileTarget(request, capability)
  if (authorization.status !== "approved") {
    return authorization.applyToResponse(accessErrorResponse(authorization.status))
  }

  const prepared = await prepare()
  if (typeof prepared !== "function") return authorization.applyToResponse(prepared)

  try {
    const provider = createProvider(authorization.accessToken, authorization.clinicId)
    const response = await prepared(provider)
    return authorization.applyToResponse(response)
  } catch {
    return authorization.applyToResponse(privateJson({ code: "CLINIC_PROFILE_SERVICE_UNAVAILABLE" }, 503))
  }
}

export async function handleClinicProfileLoad(
  request: NextRequest,
  createProvider: ClinicProfileProviderFactory,
) {
  return handleAuthorizedProfileAction(
    request,
    createProvider,
    "clinic-profile:view",
    () => async (provider) => {
      const result = await provider.loadSnapshot()
      return result.ok ? privateJson(result.value) : readErrorResponse(result.error)
    },
  )
}

export async function handleClinicProfileDraftSave(
  request: NextRequest,
  createProvider: ClinicProfileProviderFactory,
) {
  if (!validateMutationRequest(request)) return privateJson({ code: "REQUEST_REJECTED" }, 403)

  return handleAuthorizedProfileAction(request, createProvider, "clinic-profile:edit", async () => {
    const input = clinicProfileDraftSaveInputSchema.safeParse(await readJson(request))
    if (!input.success) return privateJson({ code: "INVALID_INPUT" }, 400)

    return async (provider) => {
      const result = await provider.saveDraft(input.data)
      return result.ok ? privateJson(result.value) : changeErrorResponse(result.error)
    }
  })
}

export async function handleClinicProfileDraftCreate(
  request: NextRequest,
  createProvider: ClinicProfileProviderFactory,
) {
  if (!validateMutationRequest(request)) return privateJson({ code: "REQUEST_REJECTED" }, 403)

  return handleAuthorizedProfileAction(request, createProvider, "clinic-profile:edit", async () => {
    const input = clinicProfileDraftCreateInputSchema.safeParse(await readJson(request))
    if (!input.success) return privateJson({ code: "INVALID_INPUT" }, 400)

    return async (provider) => {
      const result = await provider.createDraft(input.data)
      return result.ok ? privateJson(result.value) : changeErrorResponse(result.error)
    }
  })
}

export async function handleClinicProfileDraftDiscard(
  request: NextRequest,
  createProvider: ClinicProfileProviderFactory,
) {
  if (!validateMutationRequest(request)) return privateJson({ code: "REQUEST_REJECTED" }, 403)

  return handleAuthorizedProfileAction(request, createProvider, "clinic-profile:edit", async () => {
    const input = clinicProfileDraftDiscardInputSchema.safeParse(await readJson(request))
    if (!input.success) return privateJson({ code: "INVALID_INPUT" }, 400)

    return async (provider) => {
      const result = await provider.discardDraft(input.data)
      return result.ok ? privateJson(result.value) : changeErrorResponse(result.error)
    }
  })
}

export async function handleClinicProfilePublish(
  request: NextRequest,
  createProvider: ClinicProfileProviderFactory,
) {
  if (!validateMutationRequest(request)) return privateJson({ code: "REQUEST_REJECTED" }, 403)

  return handleAuthorizedProfileAction(request, createProvider, "clinic-profile:edit", async () => {
    const input = clinicProfilePublishInputSchema.safeParse(await readJson(request))
    if (!input.success) return privateJson({ code: "INVALID_INPUT" }, 400)

    return async (provider) => {
      const result = await provider.publishDraft(input.data)
      return result.ok ? privateJson(result.value) : changeErrorResponse(result.error)
    }
  })
}
