import "server-only"

import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { resolveClinicDashboardMutationAccess } from "@/features/clinic-dashboard/auth/server/public"
import { validateMultipartMutationRequest, validateMutationRequest } from "@/lib/security/csrf"
import { applyPrivateResponseHeaders } from "@/lib/security/private-response"
import {
  doctorGenderValues,
  doctorLanguageValues,
  doctorProfileFieldLimits,
  doctorSpecializationLevelValues,
  doctorTitleValues,
} from "../model/doctor-profile"
import type { DoctorProfileChangeError, DoctorProfileProviderFactory } from "./doctor-profile-provider"

const doctorIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/u)
const shortTextSchema = z.string().trim().min(1).max(doctorProfileFieldLimits.shortTextLength)
const biographySchema = z.string().trim().max(doctorProfileFieldLimits.biographyLength)
const qualificationsSchema = z.array(shortTextSchema).min(1).max(doctorProfileFieldLimits.qualificationCount)
const languagesSchema = z
  .array(z.enum(doctorLanguageValues))
  .min(1)
  .max(doctorLanguageValues.length)
  .refine((languages) => new Set(languages).size === languages.length)
const doctorCreateSchema = z
  .object({
    biography: biographySchema.optional(),
    experienceYears: z.number().int().nonnegative().optional(),
    firstName: shortTextSchema,
    gender: z.enum(doctorGenderValues),
    languages: languagesSchema,
    lastName: shortTextSchema,
    qualifications: qualificationsSchema,
    title: z.enum(doctorTitleValues).optional(),
  })
  .strict()
const doctorUpdateSchema = z
  .object({
    active: z.boolean().optional(),
    biography: biographySchema.nullable().optional(),
    experienceYears: z.number().int().nonnegative().nullable().optional(),
    firstName: shortTextSchema.optional(),
    gender: z.enum(doctorGenderValues).optional(),
    languages: languagesSchema.optional(),
    lastName: shortTextSchema.optional(),
    qualifications: qualificationsSchema.optional(),
    title: z.enum(doctorTitleValues).nullable().optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0)
const doctorSpecialtySchema = z
  .object({
    medicalSpecialtyId: doctorIdSchema,
    specializationLevel: z.enum(doctorSpecializationLevelValues),
  })
  .strict()

const MAX_JSON_REQUEST_BODY_BYTES = 64 * 1024
const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const MAX_IMAGE_REQUEST_BODY_BYTES = MAX_IMAGE_BYTES + 64 * 1024
const ACCEPTED_IMAGE_MIME_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
])

const IMAGE_EXTENSION_BY_MIME_TYPE = {
  "image/avif": "avif",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const

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
  status: Exclude<Awaited<ReturnType<typeof resolveClinicDashboardMutationAccess>>["status"], "approved">,
) {
  if (status === "denied") return privateJson({ code: "DOCTOR_ACCESS_DENIED" }, 403)
  if (status === "temporarily-unavailable") {
    return privateJson({ code: "DOCTOR_SERVICE_UNAVAILABLE" }, 503)
  }
  return privateJson({ code: "DOCTOR_UNAUTHORIZED" }, 401)
}

function providerErrorResponse(error: DoctorProfileChangeError) {
  if (error === "unauthorized") return privateJson({ code: "DOCTOR_UNAUTHORIZED" }, 401)
  if (error === "forbidden") return privateJson({ code: "DOCTOR_ACCESS_DENIED" }, 403)
  if (error === "not-found") return privateJson({ code: "DOCTOR_NOT_FOUND" }, 404)
  if (error === "invalid-input") return privateJson({ code: "INVALID_INPUT" }, 400)
  if (error === "conflict") return privateJson({ code: "DOCTOR_CONFLICT" }, 409)
  if (error === "invalid-data") return privateJson({ code: "DOCTOR_INVALID_RESPONSE" }, 502)
  return privateJson({ code: "DOCTOR_SERVICE_UNAVAILABLE" }, 503)
}

function validatedId(value: string) {
  const parsed = doctorIdSchema.safeParse(value)
  return parsed.success ? parsed.data : undefined
}

function sanitizeFileName(value: string) {
  const sanitized = value
    .normalize("NFKC")
    .replace(/[^A-Za-z0-9._-]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 180)
  return sanitized || "doctor-profile-image"
}

function ascii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.slice(start, start + length))
}

function detectImageMimeType(bytes: Uint8Array) {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    ascii(bytes, 1, 3) === "PNG" &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png"
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg"
  }
  if (bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(ascii(bytes, 0, 6))) {
    return "image/gif"
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return "image/webp"
  }
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp") {
    const brands = ascii(bytes, 8, Math.min(bytes.length, 64) - 8)
    if (brands.includes("avif") || brands.includes("avis")) return "image/avif"
  }
  return undefined
}

function fileNameForMimeType(value: string, mimeType: keyof typeof IMAGE_EXTENSION_BY_MIME_TYPE) {
  const sanitized = sanitizeFileName(value)
  const baseName = sanitized.replace(/\.[^.]*$/u, "") || "doctor-profile-image"
  return `${baseName}.${IMAGE_EXTENSION_BY_MIME_TYPE[mimeType]}`
}

export async function handleDoctorCreate(request: NextRequest, createProvider: DoctorProfileProviderFactory) {
  if (!validateMutationRequest(request)) return privateJson({ code: "REQUEST_REJECTED" }, 403)

  const input = doctorCreateSchema.safeParse(await readJson(request))
  if (!input.success) return privateJson({ code: "INVALID_INPUT" }, 400)

  const authorization = await resolveClinicDashboardMutationAccess(request)
  if (authorization.status !== "approved") {
    return authorization.applyToResponse(accessErrorResponse(authorization.status))
  }

  try {
    const result = await createProvider(authorization.accessToken, authorization.clinicId).createDoctor(
      input.data,
    )
    const response = result.ok ? privateJson(result.value, 201) : providerErrorResponse(result.error)
    return authorization.applyToResponse(response)
  } catch {
    return authorization.applyToResponse(privateJson({ code: "DOCTOR_SERVICE_UNAVAILABLE" }, 503))
  }
}

export async function handleDoctorUpdate(
  request: NextRequest,
  doctorIdValue: string,
  createProvider: DoctorProfileProviderFactory,
) {
  if (!validateMutationRequest(request)) return privateJson({ code: "REQUEST_REJECTED" }, 403)

  const doctorId = validatedId(doctorIdValue)
  const input = doctorUpdateSchema.safeParse(await readJson(request))
  if (!doctorId || !input.success) return privateJson({ code: "INVALID_INPUT" }, 400)

  const authorization = await resolveClinicDashboardMutationAccess(request)
  if (authorization.status !== "approved") {
    return authorization.applyToResponse(accessErrorResponse(authorization.status))
  }

  try {
    const result = await createProvider(authorization.accessToken, authorization.clinicId).updateDoctor(
      doctorId,
      input.data,
    )
    const response = result.ok ? privateJson(result.value) : providerErrorResponse(result.error)
    return authorization.applyToResponse(response)
  } catch {
    return authorization.applyToResponse(privateJson({ code: "DOCTOR_SERVICE_UNAVAILABLE" }, 503))
  }
}

export async function handleDoctorSpecialtyCreate(
  request: NextRequest,
  doctorIdValue: string,
  createProvider: DoctorProfileProviderFactory,
) {
  if (!validateMutationRequest(request)) return privateJson({ code: "REQUEST_REJECTED" }, 403)

  const doctorId = validatedId(doctorIdValue)
  const input = doctorSpecialtySchema.safeParse(await readJson(request))
  if (!doctorId || !input.success) return privateJson({ code: "INVALID_INPUT" }, 400)

  const authorization = await resolveClinicDashboardMutationAccess(request)
  if (authorization.status !== "approved") {
    return authorization.applyToResponse(accessErrorResponse(authorization.status))
  }

  try {
    const result = await createProvider(authorization.accessToken, authorization.clinicId).createSpecialty(
      doctorId,
      input.data,
    )
    const response = result.ok ? privateJson(result.value, 201) : providerErrorResponse(result.error)
    return authorization.applyToResponse(response)
  } catch {
    return authorization.applyToResponse(privateJson({ code: "DOCTOR_SERVICE_UNAVAILABLE" }, 503))
  }
}

export async function handleDoctorSpecialtyUpdate(
  request: NextRequest,
  doctorIdValue: string,
  assignmentIdValue: string,
  createProvider: DoctorProfileProviderFactory,
) {
  if (!validateMutationRequest(request)) return privateJson({ code: "REQUEST_REJECTED" }, 403)

  const doctorId = validatedId(doctorIdValue)
  const assignmentId = validatedId(assignmentIdValue)
  const input = doctorSpecialtySchema.safeParse(await readJson(request))
  if (!doctorId || !assignmentId || !input.success) {
    return privateJson({ code: "INVALID_INPUT" }, 400)
  }

  const authorization = await resolveClinicDashboardMutationAccess(request)
  if (authorization.status !== "approved") {
    return authorization.applyToResponse(accessErrorResponse(authorization.status))
  }

  try {
    const result = await createProvider(authorization.accessToken, authorization.clinicId).updateSpecialty(
      doctorId,
      assignmentId,
      input.data,
    )
    const response = result.ok ? privateJson(result.value) : providerErrorResponse(result.error)
    return authorization.applyToResponse(response)
  } catch {
    return authorization.applyToResponse(privateJson({ code: "DOCTOR_SERVICE_UNAVAILABLE" }, 503))
  }
}

export async function handleDoctorImageReplace(
  request: NextRequest,
  doctorIdValue: string,
  createProvider: DoctorProfileProviderFactory,
) {
  if (!validateMultipartMutationRequest(request)) {
    return privateJson({ code: "REQUEST_REJECTED" }, 403)
  }

  const doctorId = validatedId(doctorIdValue)
  const contentLength = Number(request.headers.get("content-length") ?? 0)
  if (
    !doctorId ||
    !Number.isSafeInteger(contentLength) ||
    contentLength < 0 ||
    contentLength > MAX_IMAGE_REQUEST_BODY_BYTES
  ) {
    return privateJson({ code: "INVALID_INPUT" }, 400)
  }

  const formData = await request.formData().catch(() => undefined)
  const file = formData?.get("file")
  const alt = formData?.get("alt")
  if (!(file instanceof File) || typeof alt !== "string" || !alt.trim() || alt.trim().length > 300) {
    return privateJson({ code: "INVALID_INPUT" }, 400)
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return privateJson({ code: "DOCTOR_IMAGE_TOO_LARGE" }, 413)
  }
  if (!ACCEPTED_IMAGE_MIME_TYPES.has(file.type)) {
    return privateJson({ code: "DOCTOR_IMAGE_UNSUPPORTED" }, 415)
  }

  const authorization = await resolveClinicDashboardMutationAccess(request)
  if (authorization.status !== "approved") {
    return authorization.applyToResponse(accessErrorResponse(authorization.status))
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const detectedMimeType = detectImageMimeType(bytes)
    if (!detectedMimeType || detectedMimeType !== file.type) {
      return authorization.applyToResponse(privateJson({ code: "DOCTOR_IMAGE_UNSUPPORTED" }, 415))
    }
    const result = await createProvider(authorization.accessToken, authorization.clinicId).replaceImage(
      doctorId,
      {
        alt: alt.trim(),
        bytes,
        fileName: fileNameForMimeType(
          file.name,
          detectedMimeType as keyof typeof IMAGE_EXTENSION_BY_MIME_TYPE,
        ),
        mimeType: detectedMimeType,
      },
    )
    const response = result.ok ? privateJson(result.value) : providerErrorResponse(result.error)
    return authorization.applyToResponse(response)
  } catch {
    return authorization.applyToResponse(privateJson({ code: "DOCTOR_SERVICE_UNAVAILABLE" }, 503))
  }
}
