import "server-only"

import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import type { ClinicDashboardCapability } from "@/features/clinic-dashboard/auth/public"
import { resolveClinicDashboardMutationAccess } from "@/features/clinic-dashboard/auth/server/public"
import { validateMultipartMutationRequest, validateMutationRequest } from "@/lib/security/csrf"
import { applyPrivateResponseHeaders } from "@/lib/security/private-response"
import type { ClinicGalleryErrorCode } from "../model/clinic-gallery"
import type { ClinicGalleryProviderFactory } from "./clinic-gallery-provider"
import { toDashboardClinicGalleryMedia, toDashboardClinicGallerySnapshot } from "./clinic-gallery-dto"
import { openClinicGalleryImageSource } from "./clinic-gallery-image-token"

const identifierSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/u)
const saveSchema = z
  .object({
    expectedRevision: z.number().int().nonnegative(),
    items: z
      .array(
        z
          .object({
            alt: z.string().trim().min(1).max(2_000),
            captionText: z.string().trim().max(10_000).optional(),
            mediaId: identifierSchema,
          })
          .strict(),
      )
      .max(12),
  })
  .strict()
  .refine(({ items }) => new Set(items.map((item) => item.mediaId)).size === items.length)
const discardSchema = z.object({ mediaIds: z.array(identifierSchema).min(1).max(12) }).strict()
const MAX_JSON_BODY_BYTES = 160 * 1024
const MAX_MULTIPART_BODY_BYTES = 5 * 1024 * 1024

function privateJson(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status })
  applyPrivateResponseHeaders(response.headers)
  response.headers.set("Vary", "Cookie")
  return response
}

function accessError(status: "denied" | "temporarily-unavailable" | "unauthenticated" | "unauthorized") {
  if (status === "denied" || status === "unauthorized") {
    return privateJson({ code: "CLINIC_GALLERY_ACCESS_DENIED" }, 403)
  }
  if (status === "unauthenticated") return privateJson({ code: "CLINIC_GALLERY_UNAUTHORIZED" }, 401)
  return privateJson({ code: "CLINIC_GALLERY_UNAVAILABLE" }, 503)
}

function providerError(error: ClinicGalleryErrorCode) {
  if (error === "unauthorized") return privateJson({ code: "CLINIC_GALLERY_UNAUTHORIZED" }, 401)
  if (error === "forbidden") return privateJson({ code: "CLINIC_GALLERY_ACCESS_DENIED" }, 403)
  if (error === "media-not-found") return privateJson({ code: "CLINIC_GALLERY_MEDIA_NOT_FOUND" }, 404)
  if (error === "conflict") return privateJson({ code: "CLINIC_GALLERY_CONFLICT" }, 409)
  if (error === "upload-too-large") return privateJson({ code: "CLINIC_GALLERY_UPLOAD_TOO_LARGE" }, 413)
  if (error === "unsupported-media-type") {
    return privateJson({ code: "CLINIC_GALLERY_UNSUPPORTED_MEDIA_TYPE" }, 415)
  }
  if (error === "invalid-input") return privateJson({ code: "CLINIC_GALLERY_INVALID_INPUT" }, 422)
  return privateJson({ code: "CLINIC_GALLERY_UNAVAILABLE" }, 503)
}

function hasCapability(
  capabilities: readonly ClinicDashboardCapability[],
  capability: ClinicDashboardCapability,
) {
  return capabilities.includes(capability)
}

async function readJson(request: NextRequest) {
  const length = Number(request.headers.get("content-length") ?? 0)
  if (!Number.isSafeInteger(length) || length < 0 || length > MAX_JSON_BODY_BYTES) return null
  const body = await request.text().catch(() => "")
  if (!body || Buffer.byteLength(body, "utf8") > MAX_JSON_BODY_BYTES) return null
  try {
    return JSON.parse(body) as unknown
  } catch {
    return null
  }
}

async function authorize(request: NextRequest, capability: ClinicDashboardCapability) {
  const authorization = await resolveClinicDashboardMutationAccess(request)
  if (authorization.status !== "approved")
    return { authorization, response: accessError(authorization.status) }
  if (!hasCapability(authorization.capabilities, capability)) {
    return { authorization, response: privateJson({ code: "CLINIC_GALLERY_ACCESS_DENIED" }, 403) }
  }
  return { authorization }
}

export async function handleClinicGalleryRead(
  request: NextRequest,
  createProvider: ClinicGalleryProviderFactory,
) {
  const access = await authorize(request, "clinic-gallery:view")
  if (access.response) return access.authorization.applyToResponse(access.response)
  const { authorization } = access
  if (authorization.status !== "approved") return privateJson({ code: "CLINIC_GALLERY_UNAVAILABLE" }, 503)
  try {
    const result = await createProvider(authorization.accessToken, authorization.clinicId).loadGallery()
    return authorization.applyToResponse(
      result.ok ? privateJson(toDashboardClinicGallerySnapshot(result.value)) : providerError(result.error),
    )
  } catch {
    return authorization.applyToResponse(privateJson({ code: "CLINIC_GALLERY_UNAVAILABLE" }, 503))
  }
}

export async function handleClinicGallerySave(
  request: NextRequest,
  createProvider: ClinicGalleryProviderFactory,
) {
  if (!validateMutationRequest(request)) return privateJson({ code: "REQUEST_REJECTED" }, 403)
  const input = saveSchema.safeParse(await readJson(request))
  if (!input.success) return privateJson({ code: "CLINIC_GALLERY_INVALID_INPUT" }, 400)
  const access = await authorize(request, "clinic-gallery:edit")
  if (access.response) return access.authorization.applyToResponse(access.response)
  const { authorization } = access
  if (authorization.status !== "approved") return privateJson({ code: "CLINIC_GALLERY_UNAVAILABLE" }, 503)
  try {
    const result = await createProvider(authorization.accessToken, authorization.clinicId).saveGallery(
      input.data,
    )
    return authorization.applyToResponse(
      result.ok ? privateJson(toDashboardClinicGallerySnapshot(result.value)) : providerError(result.error),
    )
  } catch {
    return authorization.applyToResponse(privateJson({ code: "CLINIC_GALLERY_UNAVAILABLE" }, 503))
  }
}

export async function handleClinicGalleryUpload(
  request: NextRequest,
  createProvider: ClinicGalleryProviderFactory,
) {
  if (!validateMultipartMutationRequest(request)) return privateJson({ code: "REQUEST_REJECTED" }, 403)
  const contentLength = request.headers.get("content-length")
  if (contentLength) {
    const length = Number(contentLength)
    if (!Number.isSafeInteger(length) || length <= 0 || length > MAX_MULTIPART_BODY_BYTES) {
      return privateJson({ code: "CLINIC_GALLERY_UPLOAD_TOO_LARGE" }, 413)
    }
  }
  const access = await authorize(request, "clinic-gallery:edit")
  if (access.response) return access.authorization.applyToResponse(access.response)
  const { authorization } = access
  if (authorization.status !== "approved") return privateJson({ code: "CLINIC_GALLERY_UNAVAILABLE" }, 503)
  const form = await request.formData().catch(() => null)
  const file = form?.get("file")
  const alt = form?.get("alt")
  const captionText = form?.get("captionText")
  if (
    !(file instanceof File) ||
    (alt !== null && typeof alt !== "string") ||
    (captionText !== null && typeof captionText !== "string")
  ) {
    return authorization.applyToResponse(privateJson({ code: "CLINIC_GALLERY_INVALID_INPUT" }, 400))
  }
  if (file.size > 4 * 1024 * 1024) {
    return authorization.applyToResponse(privateJson({ code: "CLINIC_GALLERY_UPLOAD_TOO_LARGE" }, 413))
  }
  try {
    const result = await createProvider(authorization.accessToken, authorization.clinicId).uploadMedia({
      ...(typeof alt === "string" ? { alt } : {}),
      ...(typeof captionText === "string" ? { captionText } : {}),
      file,
    })
    return authorization.applyToResponse(
      result.ok ? privateJson(toDashboardClinicGalleryMedia(result.value), 201) : providerError(result.error),
    )
  } catch {
    return authorization.applyToResponse(privateJson({ code: "CLINIC_GALLERY_UNAVAILABLE" }, 503))
  }
}

export async function handleClinicGalleryImage(
  request: NextRequest,
  createProvider: ClinicGalleryProviderFactory,
) {
  const token = request.nextUrl.searchParams.get("token")
  if (!token || token.length > 4_096) return privateJson({ code: "CLINIC_GALLERY_INVALID_INPUT" }, 400)
  const source = openClinicGalleryImageSource(token)
  if (!source || source.length > 2_048) return privateJson({ code: "CLINIC_GALLERY_INVALID_INPUT" }, 400)
  const access = await authorize(request, "clinic-gallery:view")
  if (access.response) return access.authorization.applyToResponse(access.response)
  const { authorization } = access
  if (authorization.status !== "approved") return privateJson({ code: "CLINIC_GALLERY_UNAVAILABLE" }, 503)
  try {
    const result = await createProvider(authorization.accessToken, authorization.clinicId).loadImage(source)
    if (!result.ok) return authorization.applyToResponse(providerError(result.error))
    const response = new NextResponse(result.value.body, {
      headers: { "Content-Type": result.value.contentType },
      status: 200,
    })
    applyPrivateResponseHeaders(response.headers)
    response.headers.set("Vary", "Cookie")
    response.headers.set("X-Content-Type-Options", "nosniff")
    return authorization.applyToResponse(response)
  } catch {
    return authorization.applyToResponse(privateJson({ code: "CLINIC_GALLERY_UNAVAILABLE" }, 503))
  }
}

export async function handleClinicGalleryDiscard(
  request: NextRequest,
  createProvider: ClinicGalleryProviderFactory,
) {
  if (!validateMutationRequest(request)) return privateJson({ code: "REQUEST_REJECTED" }, 403)
  const input = discardSchema.safeParse(await readJson(request))
  if (!input.success) return privateJson({ code: "CLINIC_GALLERY_INVALID_INPUT" }, 400)
  const access = await authorize(request, "clinic-gallery:edit")
  if (access.response) return access.authorization.applyToResponse(access.response)
  const { authorization } = access
  if (authorization.status !== "approved") return privateJson({ code: "CLINIC_GALLERY_UNAVAILABLE" }, 503)
  try {
    const result = await createProvider(authorization.accessToken, authorization.clinicId).discardDrafts(
      input.data.mediaIds,
    )
    return authorization.applyToResponse(
      result.ok ? privateJson({ mediaIds: input.data.mediaIds }, 202) : providerError(result.error),
    )
  } catch {
    return authorization.applyToResponse(privateJson({ code: "CLINIC_GALLERY_UNAVAILABLE" }, 503))
  }
}
