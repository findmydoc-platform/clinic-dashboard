import "server-only"

import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import {
  isControlledContactReauthenticationRequired,
  resolveClinicDashboardRouteAccess,
} from "@/features/clinic-dashboard/auth/server/public"
import { validateMutationRequest, validateMutationRequestContentType } from "@/lib/security/csrf"
import { applyPrivateResponseHeaders } from "@/lib/security/private-response"
import {
  inquiryHandlingStatusValues,
  inquiryLifecycleValues,
  type InquiryErrorCode,
  type InquiryResult,
} from "../model/inquiries"
import type {
  PatientInquiryAttachmentDraftUploadFactory,
  PatientInquiryProviderFactory,
} from "./patient-inquiry-provider"

const idSchema = z.string().trim().min(1).max(100)
const changeCursorSchema = z.string().min(1).max(1_000)
const revisionSchema = z.number().int().nonnegative()
const idempotencyKeySchema = z.string().trim().min(8).max(200)
const queueSchema = z.object({
  cursor: changeCursorSchema.optional(),
  handlingStatus: z.array(z.enum(inquiryHandlingStatusValues)).max(4).optional(),
  lifecycle: z.enum([...inquiryLifecycleValues, "all"]).default("open"),
  knownChangeCursor: changeCursorSchema.optional(),
  query: z.string().trim().max(200).optional(),
  unreadOnly: z.boolean().default(false),
})
const detailSchema = z
  .object({
    inquiryId: idSchema,
    knownChangeCursor: changeCursorSchema.optional(),
    knownRevision: revisionSchema.optional(),
  })
  .strict()
const messageSchema = z
  .object({
    attachmentDraftId: idSchema.optional(),
    expectedRevision: revisionSchema,
    idempotencyKey: idempotencyKeySchema,
    inquiryId: idSchema,
    text: z.string().max(3_000).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.text?.trim() && !value.attachmentDraftId) {
      context.addIssue({ code: "custom", message: "Message text or attachment required." })
    }
  })
const noteSchema = z
  .object({
    idempotencyKey: idempotencyKeySchema,
    inquiryId: idSchema,
    text: z
      .string()
      .min(1)
      .max(3_000)
      .refine((value) => value.trim().length > 0, "Note text is required."),
  })
  .strict()
const stateSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("set-handling-status"),
      expectedRevision: revisionSchema,
      handlingStatus: z.enum(["in_review", "contacted"]),
      inquiryId: idSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("close"),
      expectedRevision: revisionSchema,
      inquiryId: idSchema,
      reason: z
        .string()
        .min(1)
        .max(500)
        .refine((value) => value.trim().length > 0, "Reason must not be blank.")
        .optional(),
    })
    .strict(),
  z.object({ action: z.literal("reopen"), expectedRevision: revisionSchema, inquiryId: idSchema }).strict(),
  z
    .object({
      action: z.literal("mark-spam"),
      expectedRevision: revisionSchema,
      inquiryId: idSchema,
      reason: z
        .string()
        .min(1)
        .max(500)
        .refine((value) => value.trim().length > 0, "Reason is required."),
    })
    .strict(),
  z
    .object({ action: z.literal("remove-spam"), expectedRevision: revisionSchema, inquiryId: idSchema })
    .strict(),
])
const readPositionSchema = z
  .object({ activityId: idSchema.optional(), inquiryId: idSchema, mode: z.enum(["read", "unread"]) })
  .strict()
const revealSchema = z.object({ inquiryId: idSchema }).strict()
const draftCreateSchema = z
  .object({
    fileName: z.string().trim().min(1).max(255),
    inquiryId: idSchema,
    mimeType: z.enum(["image/png", "image/jpeg", "image/webp", "application/pdf"]),
    sizeBytes: z
      .number()
      .int()
      .positive()
      .max(5 * 1024 * 1024),
  })
  .strict()
const draftMutationSchema = z.object({ draftId: idSchema, inquiryId: idSchema }).strict()
const attachmentAccessSchema = z.object({ attachmentId: idSchema }).strict()
const MAX_JSON_BODY_BYTES = 16 * 1024
const MAX_ATTACHMENT_BODY_BYTES = 5 * 1024 * 1024
const attachmentMimeTypeSchema = z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"])

function privateJson(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status })
  applyPrivateResponseHeaders(response.headers)
  response.headers.set("Vary", "Cookie")
  return response
}

const attachmentExtensions = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const

function privateAttachment(
  attachment: Readonly<{
    body: ArrayBuffer
    contentType: keyof typeof attachmentExtensions
  }>,
  kind: "download" | "preview",
) {
  const disposition = kind === "preview" ? "inline" : "attachment"
  const response = new NextResponse(attachment.body, {
    headers: {
      "Content-Disposition": `${disposition}; filename="inquiry-attachment.${attachmentExtensions[attachment.contentType]}"`,
      "Content-Length": String(attachment.body.byteLength),
      "Content-Type": attachment.contentType,
      "X-Content-Type-Options": "nosniff",
    },
    status: 200,
  })
  applyPrivateResponseHeaders(response.headers)
  response.headers.set("Vary", "Cookie")
  return response
}

async function readJson(request: NextRequest) {
  const contentLength = request.headers.get("content-length")
  if (contentLength) {
    const parsedLength = Number(contentLength)
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0 || parsedLength > MAX_JSON_BODY_BYTES) {
      return null
    }
  }
  const body = await request.text().catch(() => "")
  if (!body || Buffer.byteLength(body, "utf8") > MAX_JSON_BODY_BYTES) return null
  try {
    return JSON.parse(body) as unknown
  } catch {
    return null
  }
}

function parseBoolean(value: string | null) {
  if (value === null) return undefined
  if (value === "true") return true
  if (value === "false") return false
  return null
}

function errorStatus(code: InquiryErrorCode) {
  if (code === "invalid-input") return 400
  if (code === "unauthorized" || code === "reauthentication-required") return 401
  if (code === "access-denied") return 403
  if (code === "not-found") return 404
  if (code === "conflict") return 409
  if (code === "invalid-state") return 422
  if (code === "payload-too-large") return 413
  if (code === "unsupported-media-type") return 415
  if (code === "rate-limited") return 429
  if (code === "service-timeout") return 504
  return 503
}

function providerResponse<TValue>(result: InquiryResult<TValue>) {
  return result.ok
    ? privateJson(result.value)
    : privateJson({ error: result.error }, errorStatus(result.error.code))
}

function accessErrorResponse(status: string) {
  if (status === "denied") return privateJson({ error: { code: "access-denied" } }, 403)
  if (status === "temporarily-unavailable") {
    return privateJson({ error: { code: "service-unavailable" } }, 503)
  }
  return privateJson({ error: { code: "unauthorized" } }, 401)
}

async function authorize(
  request: NextRequest,
  capability: "clinic-inquiries:edit" | "clinic-inquiries:view",
) {
  const access = await resolveClinicDashboardRouteAccess(request, capability).catch(() => null)
  if (!access) {
    return { response: privateJson({ error: { code: "service-unavailable" } }, 503) } as const
  }
  if (access.status !== "approved") {
    return { access, response: access.applyToResponse(accessErrorResponse(access.status)) } as const
  }
  return { access } as const
}

async function authorizeMutation(request: NextRequest) {
  if (!validateMutationRequest(request)) {
    return { response: privateJson({ error: { code: "access-denied" } }, 403) } as const
  }
  return authorize(request, "clinic-inquiries:edit")
}

function providerFor(
  access: Extract<Awaited<ReturnType<typeof resolveClinicDashboardRouteAccess>>, { status: "approved" }>,
  createProvider: PatientInquiryProviderFactory,
) {
  return createProvider(access.accessToken, access.clinicId)
}

export async function handleInquiryQueueLoad(
  request: NextRequest,
  createProvider: PatientInquiryProviderFactory,
) {
  const authorized = await authorize(request, "clinic-inquiries:view")
  if ("response" in authorized) return authorized.response
  const url = new URL(request.url)
  const unreadOnly = parseBoolean(url.searchParams.get("unreadOnly"))
  const handlingStatusValue = url.searchParams.get("handlingStatus")
  const input = queueSchema.safeParse({
    ...(url.searchParams.get("cursor") ? { cursor: url.searchParams.get("cursor") } : {}),
    ...(handlingStatusValue ? { handlingStatus: handlingStatusValue.split(",").filter(Boolean) } : {}),
    ...(url.searchParams.get("lifecycle") ? { lifecycle: url.searchParams.get("lifecycle") } : {}),
    ...(url.searchParams.get("knownChangeCursor")
      ? { knownChangeCursor: url.searchParams.get("knownChangeCursor") }
      : {}),
    ...(url.searchParams.get("query") ? { query: url.searchParams.get("query") } : {}),
    ...(unreadOnly === undefined ? {} : { unreadOnly }),
  })
  if (!input.success || unreadOnly === null) {
    return authorized.access.applyToResponse(privateJson({ error: { code: "invalid-input" } }, 400))
  }
  const result = await Promise.resolve()
    .then(() => providerFor(authorized.access, createProvider).loadQueue(input.data))
    .catch(() => ({ error: { code: "service-unavailable" }, ok: false }) as const)
  return authorized.access.applyToResponse(providerResponse(result))
}

export async function handleInquiryDetailLoad(
  request: NextRequest,
  createProvider: PatientInquiryProviderFactory,
) {
  const authorized = await authorize(request, "clinic-inquiries:view")
  if ("response" in authorized) return authorized.response
  const url = new URL(request.url)
  const knownRevisionValue = url.searchParams.get("knownRevision")
  const input = detailSchema.safeParse({
    inquiryId: url.searchParams.get("inquiryId"),
    ...(url.searchParams.get("knownChangeCursor")
      ? { knownChangeCursor: url.searchParams.get("knownChangeCursor") }
      : {}),
    ...(knownRevisionValue ? { knownRevision: Number(knownRevisionValue) } : {}),
  })
  if (!input.success) {
    return authorized.access.applyToResponse(privateJson({ error: { code: "invalid-input" } }, 400))
  }
  const result = await Promise.resolve()
    .then(() => providerFor(authorized.access, createProvider).loadDetail(input.data))
    .catch(() => ({ error: { code: "service-unavailable" }, ok: false }) as const)
  return authorized.access.applyToResponse(providerResponse(result))
}

async function handleJsonMutation<TInput, TValue>(
  request: NextRequest,
  createProvider: PatientInquiryProviderFactory,
  schema: z.ZodType<TInput>,
  invoke: (
    provider: ReturnType<PatientInquiryProviderFactory>,
    input: TInput,
  ) => Promise<InquiryResult<TValue>>,
  capability: "clinic-inquiries:edit" | "clinic-inquiries:view" = "clinic-inquiries:edit",
) {
  const authorized =
    capability === "clinic-inquiries:edit"
      ? await authorizeMutation(request)
      : !validateMutationRequest(request)
        ? ({ response: privateJson({ error: { code: "access-denied" } }, 403) } as const)
        : await authorize(request, capability)
  if ("response" in authorized) return authorized.response
  const input = schema.safeParse(await readJson(request))
  if (!input.success) {
    return authorized.access.applyToResponse(privateJson({ error: { code: "invalid-input" } }, 400))
  }
  const result = await Promise.resolve()
    .then(() => invoke(providerFor(authorized.access, createProvider), input.data))
    .catch(() => ({ error: { code: "service-unavailable" }, ok: false }) as const)
  return authorized.access.applyToResponse(providerResponse(result))
}

export function handleInquiryMessageSend(
  request: NextRequest,
  createProvider: PatientInquiryProviderFactory,
) {
  return handleJsonMutation(request, createProvider, messageSchema, (provider, input) =>
    provider.sendExternalMessage(input),
  )
}

export function handleInquiryNoteAdd(request: NextRequest, createProvider: PatientInquiryProviderFactory) {
  return handleJsonMutation(request, createProvider, noteSchema, (provider, input) =>
    provider.addInternalNote(input),
  )
}

export function handleInquiryStateChange(
  request: NextRequest,
  createProvider: PatientInquiryProviderFactory,
) {
  return handleJsonMutation(request, createProvider, stateSchema, (provider, input) =>
    provider.changeState(input),
  )
}

export function handleInquiryReadPositionChange(
  request: NextRequest,
  createProvider: PatientInquiryProviderFactory,
) {
  return handleJsonMutation(
    request,
    createProvider,
    readPositionSchema,
    (provider, input) => provider.changeReadPosition(input),
    "clinic-inquiries:view",
  )
}

export function handleInquiryContactReveal(
  request: NextRequest,
  createProvider: PatientInquiryProviderFactory,
) {
  return handleJsonMutation(
    request,
    createProvider,
    revealSchema,
    (provider, input) =>
      isControlledContactReauthenticationRequired(request.cookies)
        ? Promise.resolve({
            error: { code: "reauthentication-required" as const },
            ok: false as const,
          })
        : provider.revealContact(input),
    "clinic-inquiries:view",
  )
}

export function handleInquiryAttachmentDraftCreate(
  request: NextRequest,
  createProvider: PatientInquiryProviderFactory,
) {
  return handleJsonMutation(request, createProvider, draftCreateSchema, (provider, input) =>
    provider.createAttachmentDraft(input),
  )
}

export async function handleInquiryAttachmentDraftUpload(
  request: NextRequest,
  createUpload: PatientInquiryAttachmentDraftUploadFactory,
) {
  const rawMimeType = request.headers.get("content-type")?.toLowerCase()
  if (!rawMimeType || rawMimeType.length > 100 || !validateMutationRequestContentType(request, rawMimeType)) {
    return privateJson({ error: { code: "access-denied" } }, 403)
  }
  const authorized = await authorize(request, "clinic-inquiries:edit")
  if ("response" in authorized) return authorized.response
  const mimeType = attachmentMimeTypeSchema.safeParse(rawMimeType)
  if (!mimeType.success) {
    return authorized.access.applyToResponse(privateJson({ error: { code: "unsupported-media-type" } }, 415))
  }
  const url = new URL(request.url)
  const draftIdValues = url.searchParams.getAll("draftId")
  const draftId = idSchema.safeParse(draftIdValues.length === 1 ? draftIdValues[0] : null)
  const contentLength = Number(request.headers.get("content-length"))
  if (
    !draftId.success ||
    [...url.searchParams.keys()].some((key) => key !== "draftId") ||
    !Number.isSafeInteger(contentLength) ||
    contentLength <= 0
  ) {
    return authorized.access.applyToResponse(privateJson({ error: { code: "invalid-input" } }, 400))
  }
  if (contentLength > MAX_ATTACHMENT_BODY_BYTES) {
    return authorized.access.applyToResponse(privateJson({ error: { code: "payload-too-large" } }, 413))
  }
  const body = await request.arrayBuffer().catch(() => undefined)
  if (body && body.byteLength > MAX_ATTACHMENT_BODY_BYTES) {
    return authorized.access.applyToResponse(privateJson({ error: { code: "payload-too-large" } }, 413))
  }
  if (!body || body.byteLength !== contentLength) {
    return authorized.access.applyToResponse(privateJson({ error: { code: "invalid-input" } }, 400))
  }
  const upload = createUpload(authorized.access.accessToken, authorized.access.clinicId)
  if (!upload) {
    return authorized.access.applyToResponse(privateJson({ error: { code: "not-found" } }, 404))
  }
  const result = await Promise.resolve()
    .then(() => upload({ body, draftId: draftId.data, mimeType: mimeType.data }))
    .catch(() => ({ error: { code: "service-unavailable" }, ok: false }) as const)
  return authorized.access.applyToResponse(providerResponse(result))
}

export function handleInquiryAttachmentDraftFinalize(
  request: NextRequest,
  createProvider: PatientInquiryProviderFactory,
) {
  return handleJsonMutation(request, createProvider, draftMutationSchema, (provider, input) =>
    provider.finalizeAttachmentDraft(input),
  )
}

export function handleInquiryAttachmentDraftDiscard(
  request: NextRequest,
  createProvider: PatientInquiryProviderFactory,
) {
  return handleJsonMutation(request, createProvider, draftMutationSchema, (provider, input) =>
    provider.discardAttachmentDraft(input),
  )
}

async function handleAttachmentAccess(
  request: NextRequest,
  createProvider: PatientInquiryProviderFactory,
  kind: "download" | "preview",
) {
  const authorized = await authorize(request, "clinic-inquiries:view")
  if ("response" in authorized) return authorized.response
  const url = new URL(request.url)
  const input = attachmentAccessSchema.safeParse({ attachmentId: url.searchParams.get("attachmentId") })
  if (!input.success) {
    return authorized.access.applyToResponse(privateJson({ error: { code: "invalid-input" } }, 400))
  }
  const result = await Promise.resolve()
    .then(() => {
      const provider = providerFor(authorized.access, createProvider)
      return kind === "download"
        ? provider.downloadAttachment(input.data)
        : provider.previewAttachment(input.data)
    })
    .catch(() => ({ error: { code: "service-unavailable" }, ok: false }) as const)
  const response = result.ok ? privateAttachment(result.value, kind) : providerResponse(result)
  return authorized.access.applyToResponse(response)
}

export function handleInquiryAttachmentDownload(
  request: NextRequest,
  createProvider: PatientInquiryProviderFactory,
) {
  return handleAttachmentAccess(request, createProvider, "download")
}

export function handleInquiryAttachmentPreview(
  request: NextRequest,
  createProvider: PatientInquiryProviderFactory,
) {
  return handleAttachmentAccess(request, createProvider, "preview")
}
