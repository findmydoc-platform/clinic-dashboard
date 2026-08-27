import "server-only"

import { z } from "zod"
import { isLocalInquiryAcceptanceMode, validateEnvironment } from "@/lib/env"
import { clinicDashboardContractHeaders } from "../../payload-contract"
import {
  inquiryHandlingStatusValues,
  inquiryLifecycleValues,
  type InquiryErrorCode,
  type InquiryResult,
  type PatientInquiry,
  type PatientInquiryDetail,
} from "../model/inquiries"
import type { PatientInquiryProvider } from "./patient-inquiry-provider"

const unreadSchema = z.object({
  count: z.number().int().nonnegative(),
  isUnread: z.boolean(),
  lastReadActivityId: z.string().optional(),
})
const bindingSchema = z.discriminatedUnion("kind", [
  z.object({ canReply: z.literal(false), kind: z.literal("guest") }),
  z.object({
    canReply: z.literal(false),
    conversationId: z.string(),
    kind: z.literal("deleted-patient"),
  }),
  z.object({
    canReply: z.boolean(),
    conversationId: z.string(),
    kind: z.literal("patient"),
    patient: z.object({ displayName: z.string(), id: z.string() }),
  }),
])
const attachmentSchema = z.object({
  fileName: z.string(),
  id: z.string(),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp", "application/pdf"]),
  sizeBytes: z.number().int().nonnegative(),
})
const contentStateSchema = z.enum(["available", "hard-deleted", "restricted"])
const contentModerationSchema = z.object({
  appeal: z
    .object({
      caseId: z.string(),
      state: z.enum(["available", "submitted", "unavailable"]),
    })
    .optional(),
  category: z.string().optional(),
  effectiveUntil: z.string().optional(),
  isCurrentActorAffected: z.boolean(),
})
const timelineSchema = z.discriminatedUnion("kind", [
  z.object({
    actor: z.object({
      displayName: z.string(),
      isCurrentActor: z.boolean(),
      kind: z.enum(["patient", "clinic"]),
    }),
    attachment: attachmentSchema.optional(),
    attachmentModeration: contentModerationSchema.optional(),
    attachmentState: contentStateSchema.optional(),
    contentState: contentStateSchema.optional(),
    createdAt: z.string(),
    id: z.string(),
    kind: z.literal("external-message"),
    moderation: contentModerationSchema.optional(),
    text: z.string().optional(),
  }),
  z.object({
    actor: z.object({
      displayName: z.string(),
      isCurrentActor: z.boolean(),
      kind: z.literal("clinic"),
    }),
    createdAt: z.string(),
    id: z.string(),
    kind: z.literal("internal-note"),
    contentState: z.enum(["available", "hard-deleted"]).optional(),
    text: z.string().optional(),
  }),
  z.object({
    actor: z.object({
      displayName: z.string(),
      isCurrentActor: z.boolean(),
      kind: z.enum(["clinic", "system"]),
    }),
    createdAt: z.string(),
    event: z.enum([
      "handling-status-changed",
      "closed",
      "reopened",
      "marked-spam",
      "spam-removed",
      "moderation-restricted",
      "moderation-restored",
      "legacy-closed-migrated",
    ]),
    id: z.string(),
    kind: z.literal("system-event"),
  }),
])
const listItemSchema = z.object({
  binding: bindingSchema,
  createdAt: z.string(),
  handlingStatus: z.enum(inquiryHandlingStatusValues),
  id: z.string(),
  interest: z.object({
    doctorId: z.string().optional(),
    label: z.string(),
    preferredContactWindow: z.string().optional(),
    treatmentId: z.string().optional(),
    treatmentTimeline: z.string().optional(),
  }),
  lastActivityAt: z.string(),
  latestActivityKind: z.enum(["inquiry", "external-message", "internal-note", "system-event"]),
  lifecycle: z.enum(inquiryLifecycleValues),
  patientName: z.string(),
  preview: z.string(),
  revision: z.number().int().nonnegative(),
  unread: unreadSchema,
})
const detailSchema = listItemSchema.extend({
  actions: z.object({
    canAddInternalNote: z.boolean(),
    canChangeHandlingStatus: z.boolean(),
    canChangeLifecycle: z.boolean(),
    canMarkRead: z.boolean(),
    canMarkUnread: z.boolean(),
    canReply: z.boolean(),
    canRevealContact: z.boolean(),
    canView: z.literal(true),
  }),
  attachmentConstraints: z.object({
    acceptedMimeTypes: z.array(z.enum(["image/png", "image/jpeg", "image/webp", "application/pdf"])),
    maxFileBytes: z.number().int().positive(),
    maxFilesPerMessage: z.literal(1),
  }),
  contact: z.discriminatedUnion("mode", [
    z.object({ email: z.string(), mode: z.literal("full"), phoneNumber: z.string() }),
    z.object({ mode: z.literal("collapsed") }),
    z.object({ mode: z.literal("unavailable") }),
    z.object({ email: z.string(), mode: z.literal("masked"), phoneNumber: z.string() }),
  ]),
  originalRequest: z.object({
    contentState: z.enum(["available", "hard-deleted"]).optional(),
    message: z.string().optional(),
    preferredContactWindow: z.string().optional(),
    treatmentTimeline: z.string().optional(),
  }),
  timeline: z.array(timelineSchema),
})
const queueSchema = z.object({
  changeCursor: z.string(),
  items: z.array(listItemSchema),
  nextCursor: z.string().optional(),
  unchanged: z.boolean(),
  unreadCount: z.number().int().nonnegative(),
})
const detailResultSchema = z.object({
  changeCursor: z.string(),
  inquiry: detailSchema,
  unchanged: z.boolean(),
})
const mutationSchema = z.object({ inquiry: detailSchema, replayed: z.boolean().optional() })
const readSchema = z.object({ unread: unreadSchema })
const draftSchema = z.object({
  draftId: z.string(),
  expiresAt: z.string(),
  upload: z.object({
    headers: z.record(z.string(), z.string()),
    method: z.literal("PUT"),
    url: z.string().url(),
  }),
})
const contactRevealSchema = z.object({
  contact: z.object({ email: z.string(), mode: z.literal("full"), phoneNumber: z.string() }),
  inquiryId: z.string(),
})
const attachmentContentTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"] as const)
const MAX_ATTACHMENT_RESPONSE_BYTES = 5 * 1024 * 1024
const safeUploadHeaderNames = new Set(["content-type", "x-amz-checksum-sha256"])
const upstreamErrorSchema = z.object({
  error: z.object({
    code: z.enum([
      "INQUIRY_INVALID_INPUT",
      "INQUIRY_UNAUTHORIZED",
      "INQUIRY_ACCESS_DENIED",
      "INQUIRY_NOT_FOUND",
      "INQUIRY_CONFLICT",
      "INQUIRY_INVALID_STATE",
      "INQUIRY_PAYLOAD_TOO_LARGE",
      "INQUIRY_UNSUPPORTED_MEDIA_TYPE",
      "INQUIRY_RATE_LIMITED",
      "INQUIRY_SERVICE_UNAVAILABLE",
      "INQUIRY_SERVICE_TIMEOUT",
      "INQUIRY_REAUTHENTICATION_REQUIRED",
    ]),
    current: detailSchema.optional(),
  }),
})

type UpstreamDetail = z.infer<typeof detailSchema>

const errorCodeMap = {
  INQUIRY_ACCESS_DENIED: "access-denied",
  INQUIRY_CONFLICT: "conflict",
  INQUIRY_INVALID_INPUT: "invalid-input",
  INQUIRY_INVALID_STATE: "invalid-state",
  INQUIRY_NOT_FOUND: "not-found",
  INQUIRY_PAYLOAD_TOO_LARGE: "payload-too-large",
  INQUIRY_RATE_LIMITED: "rate-limited",
  INQUIRY_REAUTHENTICATION_REQUIRED: "reauthentication-required",
  INQUIRY_SERVICE_TIMEOUT: "service-timeout",
  INQUIRY_SERVICE_UNAVAILABLE: "service-unavailable",
  INQUIRY_UNAUTHORIZED: "unauthorized",
  INQUIRY_UNSUPPORTED_MEDIA_TYPE: "unsupported-media-type",
} as const satisfies Record<z.infer<typeof upstreamErrorSchema>["error"]["code"], InquiryErrorCode>

const systemEventLabels = {
  closed: "Conversation closed.",
  "handling-status-changed": "Inquiry status changed.",
  "legacy-closed-migrated": "Legacy closed inquiry migrated.",
  "marked-spam": "Marked as Spam and conversation closed.",
  "moderation-restricted": "findmydoc restricted communication.",
  "moderation-restored": "findmydoc restored communication.",
  reopened: "Conversation reopened.",
  "spam-removed": "Spam label removed. Conversation remains closed.",
} as const

function endpointFor(pathname: string, environment: ReturnType<typeof validateEnvironment>) {
  return new URL(pathname, environment.PAYLOAD_API_URL)
}

function requestHeaders(accessToken: string, includeJson = false) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
    ...clinicDashboardContractHeaders(),
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
  }
}

function formatTimestamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error("Invalid inquiry timestamp")
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "Europe/Berlin",
  }).format(date)
}

function initials(name: string) {
  return (
    name
      .split(/\s+/u)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "PI"
  )
}

function mapListItem(raw: z.infer<typeof listItemSchema>, changeCursor: string): PatientInquiry {
  const identityDeleted = raw.binding.kind === "deleted-patient"
  return {
    changeCursor,
    contactWindow: raw.interest.preferredContactWindow ?? "Not specified",
    conversation:
      raw.binding.kind === "patient"
        ? { id: raw.binding.conversationId, kind: "bound" }
        : raw.binding.kind === "deleted-patient"
          ? { id: raw.binding.conversationId, kind: "deleted-patient" }
          : { kind: "guest" },
    createdAt: raw.createdAt,
    handlingStatus: raw.handlingStatus,
    id: raw.id,
    interest: raw.interest.label,
    lastActivityAt: raw.lastActivityAt,
    lastActivityLabel: formatTimestamp(raw.lastActivityAt),
    lastActivityPreview: raw.preview,
    latestActivityKind: raw.latestActivityKind,
    lifecycle: raw.lifecycle,
    originalRequestPreview: raw.preview,
    patient: identityDeleted
      ? { kind: "deleted", name: "Deleted patient" }
      : {
          initials: initials(raw.patientName),
          kind: raw.binding.kind === "patient" ? "verified" : "guest",
          name: raw.patientName,
        },
    receivedLabel: formatTimestamp(raw.createdAt),
    revision: raw.revision,
    treatmentTimeline: raw.interest.treatmentTimeline ?? "Not specified",
    unread: raw.unread,
  }
}

function mapDetail(raw: UpstreamDetail, changeCursor = `revision:${raw.revision}`): PatientInquiryDetail {
  const summary = mapListItem(raw, changeCursor)
  const timeline = raw.timeline.map((item) => {
    const timeLabel = formatTimestamp(item.createdAt)
    if (item.kind === "external-message") {
      return {
        ...(item.attachment
          ? {
              attachment: {
                id: item.attachment.id,
                mimeType: item.attachment.mimeType,
                name: item.attachment.fileName,
                sizeBytes: item.attachment.sizeBytes,
              },
            }
          : {}),
        ...(item.attachmentModeration ? { attachmentModeration: item.attachmentModeration } : {}),
        ...(item.attachmentState ? { attachmentState: item.attachmentState } : {}),
        author: {
          kind: item.actor.kind,
          label: item.actor.kind === "clinic" ? "Clinic" : "Patient",
          ...(item.actor.kind === "clinic" ? { staffName: item.actor.displayName } : {}),
        },
        body: item.text ?? "",
        contentState: item.contentState ?? "available",
        createdAt: item.createdAt,
        id: item.id,
        kind: "external-message" as const,
        ...(item.moderation ? { moderation: item.moderation } : {}),
        timeLabel,
      }
    }
    if (item.kind === "internal-note") {
      return {
        ...(item.actor.displayName ? { authorName: item.actor.displayName } : {}),
        ...(item.text ? { body: item.text } : {}),
        contentState: item.contentState ?? "available",
        createdAt: item.createdAt,
        id: item.id,
        kind: "internal-note" as const,
        timeLabel,
      }
    }
    return {
      actorName: item.actor.displayName,
      body: systemEventLabels[item.event],
      createdAt: item.createdAt,
      id: item.id,
      kind: "system-event" as const,
      timeLabel,
    }
  })
  const contact =
    raw.contact.mode === "full"
      ? { email: raw.contact.email, phone: raw.contact.phoneNumber, state: "full" as const }
      : raw.contact.mode === "masked"
        ? { state: "masked" as const }
        : raw.contact.mode === "unavailable"
          ? { state: "unavailable" as const }
          : { state: "collapsed" as const }
  return {
    ...summary,
    actions: {
      canAddInternalNote: raw.actions.canAddInternalNote,
      canChangeHandlingStatus: raw.actions.canChangeHandlingStatus,
      canChangeLifecycle: raw.actions.canChangeLifecycle,
      canMarkRead: raw.actions.canMarkRead,
      canMarkUnread: raw.actions.canMarkUnread,
      canReply: raw.actions.canReply,
      canRevealContact: raw.actions.canRevealContact,
    },
    contact,
    contactWindow:
      raw.originalRequest.preferredContactWindow ?? raw.interest.preferredContactWindow ?? "Not specified",
    ...(raw.originalRequest.message ? { originalRequest: raw.originalRequest.message } : {}),
    originalRequestContentState: raw.originalRequest.contentState ?? "available",
    originalRequestPreview: raw.originalRequest.message ?? "Inquiry deleted",
    timeline,
    treatmentTimeline:
      raw.originalRequest.treatmentTimeline ?? raw.interest.treatmentTimeline ?? "Not specified",
  }
}

type UpstreamResponse =
  | Readonly<{ body: unknown; ok: true; response: Response }>
  | Readonly<{
      body: unknown
      failure?: "network" | "timeout"
      ok: false
      response?: Response
    }>

function isTimeoutError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  )
}

async function requestPayload(
  endpoint: URL,
  init: RequestInit,
  fetcher: typeof fetch,
): Promise<UpstreamResponse> {
  try {
    const response = await fetcher(endpoint, init)
    const body = await response.json().catch(() => null)
    return response.ok ? { body, ok: true, response } : { body, ok: false, response }
  } catch (error) {
    return {
      body: null,
      failure: isTimeoutError(error) ? "timeout" : "network",
      ok: false,
    }
  }
}

function mapError(response: Extract<UpstreamResponse, { ok: false }>): InquiryResult<never> {
  const parsed = upstreamErrorSchema.safeParse(response.body)
  if (parsed.success) {
    return {
      error: {
        code: errorCodeMap[parsed.data.error.code],
        ...(parsed.data.error.current ? { current: mapDetail(parsed.data.error.current) } : {}),
      },
      ok: false,
    }
  }
  const status = response.response?.status
  return {
    error: {
      code:
        response.failure === "timeout"
          ? "service-timeout"
          : status === 401
            ? "unauthorized"
            : status === 403
              ? "access-denied"
              : status === 404
                ? "not-found"
                : status === 408 || status === 504
                  ? "service-timeout"
                  : "service-unavailable",
    },
    ok: false,
  }
}

function sanitizeUploadDescriptor(
  draft: z.infer<typeof draftSchema>,
  expectedMimeType: string,
  environment: ReturnType<typeof validateEnvironment>,
) {
  let url: URL
  try {
    url = new URL(draft.upload.url)
  } catch {
    return undefined
  }
  const localhostTestUpload =
    (environment.NODE_ENV === "test" || isLocalInquiryAcceptanceMode(environment)) &&
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1")
  if ((url.protocol !== "https:" && !localhostTestUpload) || url.username || url.password || url.hash) {
    return undefined
  }

  const headers: Record<string, string> = {}
  for (const [rawName, value] of Object.entries(draft.upload.headers)) {
    const name = rawName.toLowerCase()
    if (
      !safeUploadHeaderNames.has(name) ||
      name in headers ||
      value.length > 1_024 ||
      /[\0\r\n]/u.test(rawName) ||
      /[\0\r\n]/u.test(value)
    ) {
      return undefined
    }
    headers[name] = value
  }
  if (headers["content-type"] !== expectedMimeType) return undefined
  return { ...draft, upload: { ...draft.upload, headers, url: url.toString() } }
}

async function readBoundedBody(response: Response) {
  const reader = response.body?.getReader()
  if (!reader) return undefined
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const chunk = await reader.read()
    if (chunk.done) break
    total += chunk.value.byteLength
    if (total > MAX_ATTACHMENT_RESPONSE_BYTES) {
      await reader.cancel().catch(() => undefined)
      return undefined
    }
    chunks.push(chunk.value)
  }
  const body = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body.buffer
}

async function safelyInvokeProvider<TValue>(
  invoke: () => Promise<InquiryResult<TValue>>,
): Promise<InquiryResult<TValue>> {
  try {
    return await invoke()
  } catch {
    return { error: { code: "service-unavailable" }, ok: false }
  }
}

function withSafeProviderBoundary(provider: PatientInquiryProvider): PatientInquiryProvider {
  return {
    addInternalNote: (input) => safelyInvokeProvider(() => provider.addInternalNote(input)),
    changeReadPosition: (input) => safelyInvokeProvider(() => provider.changeReadPosition(input)),
    changeState: (input) => safelyInvokeProvider(() => provider.changeState(input)),
    createAttachmentDraft: (input) => safelyInvokeProvider(() => provider.createAttachmentDraft(input)),
    discardAttachmentDraft: (input) => safelyInvokeProvider(() => provider.discardAttachmentDraft(input)),
    downloadAttachment: (input) => safelyInvokeProvider(() => provider.downloadAttachment(input)),
    finalizeAttachmentDraft: (input) => safelyInvokeProvider(() => provider.finalizeAttachmentDraft(input)),
    loadDetail: (input) => safelyInvokeProvider(() => provider.loadDetail(input)),
    loadQueue: (input) => safelyInvokeProvider(() => provider.loadQueue(input)),
    previewAttachment: (input) => safelyInvokeProvider(() => provider.previewAttachment(input)),
    revealContact: (input) => safelyInvokeProvider(() => provider.revealContact(input)),
    sendExternalMessage: (input) => safelyInvokeProvider(() => provider.sendExternalMessage(input)),
  }
}

export function createPayloadPatientInquiryProvider(
  accessToken: string,
  clinicId: string,
  fetcher: typeof fetch = fetch,
  environment: Record<string, string | undefined> = process.env,
): PatientInquiryProvider {
  void clinicId
  const runtimeEnvironment = validateEnvironment(environment)

  const requestJson = async <TValue>(
    pathname: string,
    input: unknown,
    method: "PATCH" | "POST" | "PUT",
    schema: z.ZodType<TValue>,
  ): Promise<InquiryResult<TValue>> => {
    const response = await requestPayload(
      endpointFor(pathname, runtimeEnvironment),
      {
        body: JSON.stringify(input),
        cache: "no-store",
        headers: requestHeaders(accessToken, true),
        method,
        redirect: "error",
        signal: AbortSignal.timeout(8_000),
      },
      fetcher,
    )
    if (!response.ok) return mapError(response)
    const parsed = schema.safeParse(response.body)
    return parsed.success
      ? { ok: true, value: parsed.data }
      : { error: { code: "service-unavailable" }, ok: false }
  }

  const loadDetail = async (
    input: Readonly<{ inquiryId: string; knownChangeCursor?: string; knownRevision?: number }>,
  ) => {
    const endpoint = endpointFor("/api/clinic-dashboard/inquiries/detail", runtimeEnvironment)
    endpoint.searchParams.set("inquiryId", input.inquiryId)
    if (input.knownChangeCursor !== undefined) {
      endpoint.searchParams.set("knownChangeCursor", input.knownChangeCursor)
    }
    if (input.knownRevision !== undefined) {
      endpoint.searchParams.set("knownRevision", String(input.knownRevision))
    }
    const response = await requestPayload(
      endpoint,
      {
        cache: "no-store",
        headers: requestHeaders(accessToken),
        redirect: "error",
        signal: AbortSignal.timeout(8_000),
      },
      fetcher,
    )
    if (!response.ok) return mapError(response)
    const parsed = detailResultSchema.safeParse(response.body)
    return parsed.success
      ? {
          ok: true as const,
          value: {
            changeCursor: parsed.data.changeCursor,
            inquiry: mapDetail(parsed.data.inquiry, parsed.data.changeCursor),
            unchanged: parsed.data.unchanged,
          },
        }
      : ({ error: { code: "service-unavailable" }, ok: false } as const)
  }

  const mapMutation = async (pathname: string, input: unknown, method: "PATCH" | "POST" | "PUT") => {
    const result = await requestJson(pathname, input, method, mutationSchema)
    return result.ok
      ? {
          ok: true as const,
          value: {
            inquiry: mapDetail(result.value.inquiry),
            ...(result.value.replayed === undefined ? {} : { replayed: result.value.replayed }),
          },
        }
      : result
  }

  const loadAttachmentAccess = async (kind: "download" | "preview", attachmentId: string) => {
    const endpoint = endpointFor(`/api/clinic-dashboard/inquiries/attachments/${kind}`, runtimeEnvironment)
    endpoint.searchParams.set("attachmentId", attachmentId)
    let response: Response
    try {
      response = await fetcher(endpoint, {
        cache: "no-store",
        headers: requestHeaders(accessToken),
        redirect: "error",
        signal: AbortSignal.timeout(8_000),
      })
    } catch (error) {
      return {
        error: { code: isTimeoutError(error) ? "service-timeout" : "service-unavailable" },
        ok: false,
      } as const
    }
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      return mapError({ body, ok: false, response })
    }
    const cacheControl = response.headers.get("cache-control")?.toLowerCase() ?? ""
    const contentLength = response.headers.get("content-length")
    const contentType = response.headers.get("content-type")?.toLowerCase()
    const parsedLength = contentLength === null ? undefined : Number(contentLength)
    if (
      !contentType ||
      !attachmentContentTypes.has(contentType as never) ||
      !cacheControl.includes("private") ||
      !cacheControl.includes("no-store") ||
      (parsedLength !== undefined &&
        (!Number.isSafeInteger(parsedLength) ||
          parsedLength < 0 ||
          parsedLength > MAX_ATTACHMENT_RESPONSE_BYTES))
    ) {
      return { error: { code: "service-unavailable" }, ok: false } as const
    }
    const body = await readBoundedBody(response).catch(() => undefined)
    return body
      ? {
          ok: true as const,
          value: {
            body,
            contentType: contentType as "application/pdf" | "image/jpeg" | "image/png" | "image/webp",
          },
        }
      : ({ error: { code: "service-unavailable" }, ok: false } as const)
  }

  return withSafeProviderBoundary({
    addInternalNote: (input) => mapMutation("/api/clinic-dashboard/inquiries/notes", input, "POST"),
    async changeReadPosition(input) {
      return requestJson("/api/clinic-dashboard/inquiries/read-position", input, "PUT", readSchema)
    },
    changeState: (input) => mapMutation("/api/clinic-dashboard/inquiries/state", input, "PATCH"),
    async createAttachmentDraft(input) {
      const result = await requestJson(
        "/api/clinic-dashboard/inquiries/attachments/drafts",
        input,
        "POST",
        draftSchema,
      )
      if (!result.ok) return result
      const safeDraft = sanitizeUploadDescriptor(result.value, input.mimeType, runtimeEnvironment)
      return safeDraft
        ? { ok: true, value: safeDraft }
        : { error: { code: "service-unavailable" }, ok: false }
    },
    async discardAttachmentDraft(input) {
      const result = await requestJson(
        "/api/clinic-dashboard/inquiries/attachments/drafts/discard",
        input,
        "POST",
        z.object({ discarded: z.boolean() }),
      )
      return result
    },
    downloadAttachment: ({ attachmentId }) => loadAttachmentAccess("download", attachmentId),
    finalizeAttachmentDraft: (input) =>
      requestJson(
        "/api/clinic-dashboard/inquiries/attachments/drafts/finalize",
        input,
        "POST",
        z.object({ finalized: z.boolean() }),
      ),
    loadDetail,
    async loadQueue(input) {
      const endpoint = endpointFor("/api/clinic-dashboard/inquiries", runtimeEnvironment)
      endpoint.searchParams.set("lifecycle", input.lifecycle)
      endpoint.searchParams.set("limit", "25")
      endpoint.searchParams.set("unreadOnly", String(input.unreadOnly))
      if (input.cursor) endpoint.searchParams.set("cursor", input.cursor)
      if (input.knownChangeCursor) {
        endpoint.searchParams.set("knownChangeCursor", input.knownChangeCursor)
      }
      if (input.handlingStatus?.length) {
        endpoint.searchParams.set("handlingStatus", input.handlingStatus.join(","))
      }
      if (input.query) endpoint.searchParams.set("query", input.query)
      const response = await requestPayload(
        endpoint,
        {
          cache: "no-store",
          headers: requestHeaders(accessToken),
          redirect: "error",
          signal: AbortSignal.timeout(8_000),
        },
        fetcher,
      )
      if (!response.ok) return mapError(response)
      const parsed = queueSchema.safeParse(response.body)
      return parsed.success
        ? {
            ok: true,
            value: {
              changeCursor: parsed.data.changeCursor,
              inquiries: parsed.data.items.map((item) => mapListItem(item, parsed.data.changeCursor)),
              ...(parsed.data.nextCursor ? { nextCursor: parsed.data.nextCursor } : {}),
              status: "ready",
              unchanged: parsed.data.unchanged,
              unreadCount: parsed.data.unreadCount,
            },
          }
        : { error: { code: "service-unavailable" }, ok: false }
    },
    async revealContact(input) {
      const revealed = await requestJson(
        "/api/clinic-dashboard/inquiries/contact/reveal",
        input,
        "POST",
        contactRevealSchema,
      )
      if (!revealed.ok) return revealed
      const detail = await loadDetail({ inquiryId: input.inquiryId })
      if (!detail.ok) return detail
      return {
        ok: true,
        value: {
          inquiry: {
            ...detail.value.inquiry,
            contact: {
              email: revealed.value.contact.email,
              phone: revealed.value.contact.phoneNumber,
              state: "full",
            },
          },
        },
      }
    },
    previewAttachment: ({ attachmentId }) => loadAttachmentAccess("preview", attachmentId),
    sendExternalMessage: (input) => mapMutation("/api/clinic-dashboard/inquiries/messages", input, "POST"),
  })
}
