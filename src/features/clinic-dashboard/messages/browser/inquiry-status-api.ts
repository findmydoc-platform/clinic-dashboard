"use client"

import { z } from "zod"
import { CLINIC_DASHBOARD_CSRF_HEADER, readBrowserCsrfToken } from "@/lib/security/csrf-contract"
import {
  inquiryErrorCodeValues,
  inquiryHandlingStatusValues,
  inquiryLifecycleValues,
  type InquiryResult,
} from "../model/inquiries"
import type { InquiryWorkspaceCommands } from "../model/inquiry-status-commands"

const unreadSchema = z.object({
  count: z.number().int().nonnegative(),
  isUnread: z.boolean(),
  lastReadActivityId: z.string().optional(),
})
const patientSchema = z.discriminatedUnion("kind", [
  z.object({ initials: z.string(), kind: z.literal("verified"), name: z.string() }),
  z.object({ initials: z.string(), kind: z.literal("guest"), name: z.string() }),
  z.object({ kind: z.literal("deleted"), name: z.literal("Deleted patient") }),
])
const conversationSchema = z.discriminatedUnion("kind", [
  z.object({ id: z.string(), kind: z.literal("bound") }),
  z.object({ kind: z.literal("guest") }),
  z.object({ id: z.string(), kind: z.literal("deleted-patient") }),
])
const queueItemSchema = z.object({
  changeCursor: z.string(),
  contactWindow: z.string(),
  conversation: conversationSchema,
  createdAt: z.string(),
  handlingStatus: z.enum(inquiryHandlingStatusValues),
  id: z.string(),
  interest: z.string(),
  lastActivityAt: z.string(),
  lastActivityLabel: z.string(),
  lastActivityPreview: z.string(),
  latestActivityKind: z.enum(["external-message", "internal-note", "system-event", "inquiry"]),
  lifecycle: z.enum(inquiryLifecycleValues),
  originalRequestPreview: z.string(),
  patient: patientSchema,
  receivedLabel: z.string(),
  revision: z.number().int().nonnegative(),
  treatmentTimeline: z.string(),
  unread: unreadSchema,
})
const attachmentSchema = z.object({
  id: z.string(),
  mimeType: z.string(),
  name: z.string(),
  sizeBytes: z.number().int().nonnegative(),
})
const contentStateSchema = z.enum(["available", "hard-deleted", "restricted"])
const contentModerationSchema = z.object({
  appeal: z
    .object({ caseId: z.string(), state: z.enum(["available", "submitted", "unavailable"]) })
    .optional(),
  category: z.string().optional(),
  effectiveUntil: z.string().optional(),
  isCurrentActorAffected: z.boolean(),
})
const timelineSchema = z.discriminatedUnion("kind", [
  z.object({
    attachment: attachmentSchema.optional(),
    attachmentModeration: contentModerationSchema.optional(),
    attachmentState: contentStateSchema.optional(),
    author: z.object({
      kind: z.enum(["clinic", "patient"]),
      label: z.string(),
      staffName: z.string().optional(),
    }),
    body: z.string(),
    contentState: contentStateSchema.optional(),
    createdAt: z.string(),
    id: z.string(),
    kind: z.literal("external-message"),
    moderation: contentModerationSchema.optional(),
    timeLabel: z.string(),
  }),
  z.object({
    authorName: z.string(),
    body: z.string(),
    createdAt: z.string(),
    id: z.string(),
    kind: z.literal("internal-note"),
    timeLabel: z.string(),
  }),
  z.object({
    actorName: z.string(),
    body: z.string(),
    createdAt: z.string(),
    id: z.string(),
    kind: z.literal("system-event"),
    timeLabel: z.string(),
  }),
])
const contactSchema = z.discriminatedUnion("state", [
  z.object({ email: z.string().optional(), phone: z.string().optional(), state: z.literal("full") }),
  z.object({ state: z.literal("collapsed") }),
  z.object({ state: z.literal("masked") }),
  z.object({ state: z.literal("unavailable") }),
])
const detailSchema = queueItemSchema.extend({
  actions: z.object({
    canAddInternalNote: z.boolean(),
    canChangeHandlingStatus: z.boolean(),
    canChangeLifecycle: z.boolean(),
    canMarkRead: z.boolean(),
    canMarkUnread: z.boolean(),
    canReply: z.boolean(),
    canRevealContact: z.boolean(),
  }),
  contact: contactSchema,
  originalRequest: z.string(),
  timeline: z.array(timelineSchema),
})
const errorSchema = z.object({
  error: z.object({
    code: z.enum(inquiryErrorCodeValues),
    current: detailSchema.optional(),
  }),
})
const queueSchema = z.discriminatedUnion("status", [
  z.object({
    changeCursor: z.string(),
    inquiries: z.array(queueItemSchema),
    nextCursor: z.string().optional(),
    status: z.literal("ready"),
    unchanged: z.boolean(),
    unreadCount: z.number().int().nonnegative(),
  }),
  z.object({ inquiries: z.tuple([]), status: z.literal("temporarily-unavailable") }),
])
const detailResultSchema = z.object({
  changeCursor: z.string(),
  inquiry: detailSchema,
  unchanged: z.boolean(),
})
const mutationSchema = z.object({ inquiry: detailSchema, replayed: z.boolean().optional() })
const readSchema = z.object({ unread: unreadSchema })
const createDraftSchema = z.object({
  draftId: z.string(),
  expiresAt: z.string(),
  upload: z.object({
    headers: z.record(z.string(), z.string()),
    method: z.literal("PUT"),
    url: z.string().min(1).max(2_048),
  }),
})
const safeUploadHeaderNames = new Set(["content-type", "x-amz-checksum-sha256"])
const controlledAttachmentUploadPath = "/api/dashboard/inquiries/attachments/drafts/upload"

function sanitizeUploadDescriptor(
  upload: z.infer<typeof createDraftSchema>["upload"],
  expectedMimeType: string,
) {
  const relativeControlledUpload = upload.url.startsWith("/") && !upload.url.startsWith("//")
  let url: URL
  try {
    url = new URL(upload.url, relativeControlledUpload ? window.location.origin : undefined)
  } catch {
    return undefined
  }
  const controlledUpload =
    relativeControlledUpload &&
    url.origin === window.location.origin &&
    url.pathname === controlledAttachmentUploadPath &&
    url.searchParams.getAll("draftId").length === 1 &&
    (url.searchParams.get("draftId")?.length ?? 0) > 0 &&
    (url.searchParams.get("draftId")?.length ?? 0) <= 100 &&
    [...url.searchParams.keys()].every((key) => key === "draftId")
  const localhostTestUpload =
    (process.env.NODE_ENV === "test" || process.env.NEXT_PUBLIC_CLINIC_DASHBOARD_LOCAL_ACCEPTANCE === "1") &&
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1")
  if (
    (!controlledUpload && url.protocol !== "https:" && !localhostTestUpload) ||
    (relativeControlledUpload && !controlledUpload) ||
    url.username ||
    url.password ||
    url.hash
  ) {
    return undefined
  }
  const headers: Record<string, string> = {}
  for (const [rawName, value] of Object.entries(upload.headers)) {
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
  return { ...upload, controlledUpload, headers, url: url.toString() }
}

function requestVerificationHeaders(includeJson = true) {
  const csrfToken = readBrowserCsrfToken(document.cookie)
  if (!csrfToken) return undefined
  return {
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    [CLINIC_DASHBOARD_CSRF_HEADER]: csrfToken,
  }
}

async function parseResult<TSchema extends z.ZodTypeAny>(
  response: Response | undefined,
  schema: TSchema,
): Promise<InquiryResult<z.infer<TSchema>>> {
  if (!response) return { error: { code: "service-unavailable" }, ok: false }
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const parsed = errorSchema.safeParse(body)
    return parsed.success
      ? { error: parsed.data.error, ok: false }
      : { error: { code: response.status === 401 ? "unauthorized" : "service-unavailable" }, ok: false }
  }
  const parsed = schema.safeParse(body)
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { error: { code: "service-unavailable" }, ok: false }
}

type SafeFetchResult =
  | Readonly<{ ok: true; response: Response }>
  | Readonly<{ error: "service-timeout" | "service-unavailable"; ok: false }>

function safeFetchError(code: "service-timeout" | "service-unavailable"): InquiryResult<never> {
  return { error: { code }, ok: false }
}

async function fetchWithSafeFailure(input: RequestInfo | URL, init: RequestInit): Promise<SafeFetchResult> {
  try {
    return { ok: true, response: await fetch(input, init) }
  } catch (error) {
    const errorName =
      typeof error === "object" && error !== null && "name" in error && typeof error.name === "string"
        ? error.name
        : ""
    return {
      error:
        errorName === "TimeoutError" || errorName === "AbortError"
          ? "service-timeout"
          : "service-unavailable",
      ok: false,
    }
  }
}

async function jsonMutation<TSchema extends z.ZodTypeAny>(
  path: string,
  method: "PATCH" | "POST" | "PUT",
  body: unknown,
  schema: TSchema,
): Promise<InquiryResult<z.infer<TSchema>>> {
  const headers = requestVerificationHeaders()
  if (!headers) return { error: { code: "unauthorized" as const }, ok: false as const }
  const request = await fetchWithSafeFailure(path, {
    body: JSON.stringify(body),
    credentials: "same-origin",
    headers,
    method,
    redirect: "error",
    signal: AbortSignal.timeout(8_000),
  })
  return request.ok ? parseResult(request.response, schema) : safeFetchError(request.error)
}

async function discardCreatedAttachmentDraft(input: { draftId: string; inquiryId: string }) {
  return jsonMutation(
    "/api/dashboard/inquiries/attachments/drafts/discard",
    "POST",
    input,
    z.object({ discarded: z.boolean() }),
  )
}

function preferDefinitiveCleanupFailure<TValue>(
  primary: InquiryResult<TValue>,
  cleanup: Awaited<ReturnType<typeof discardCreatedAttachmentDraft>>,
): InquiryResult<TValue> {
  if (
    !cleanup.ok &&
    (cleanup.error.code === "unauthorized" ||
      cleanup.error.code === "access-denied" ||
      cleanup.error.code === "not-found")
  ) {
    return cleanup
  }
  return primary
}

export function createInquiryWorkspaceApiCommands(): InquiryWorkspaceCommands {
  return {
    addInternalNote: (input) => jsonMutation("/api/dashboard/inquiries/notes", "POST", input, mutationSchema),
    changeReadPosition: (input) =>
      jsonMutation("/api/dashboard/inquiries/read-position", "PUT", input, readSchema),
    changeState: (input) => jsonMutation("/api/dashboard/inquiries/state", "PATCH", input, mutationSchema),
    revealContact: (input) =>
      jsonMutation("/api/dashboard/inquiries/contact/reveal", "POST", input, mutationSchema),
    async createAttachmentDraft({ file, inquiryId }) {
      const created = await jsonMutation(
        "/api/dashboard/inquiries/attachments/drafts",
        "POST",
        { fileName: file.name, inquiryId, mimeType: file.type, sizeBytes: file.size },
        createDraftSchema,
      )
      if (!created.ok) return created
      const safeUpload = sanitizeUploadDescriptor(created.value.upload, file.type)
      if (!safeUpload) {
        const failure = { error: { code: "service-unavailable" as const }, ok: false as const }
        const cleanup = await discardCreatedAttachmentDraft({ draftId: created.value.draftId, inquiryId })
        return preferDefinitiveCleanupFailure(failure, cleanup)
      }

      const controlledUploadHeaders = safeUpload.controlledUpload
        ? requestVerificationHeaders(false)
        : undefined
      if (safeUpload.controlledUpload && !controlledUploadHeaders) {
        const failure = { error: { code: "unauthorized" as const }, ok: false as const }
        const cleanup = await discardCreatedAttachmentDraft({ draftId: created.value.draftId, inquiryId })
        return preferDefinitiveCleanupFailure(failure, cleanup)
      }

      const uploadRequest = await fetchWithSafeFailure(safeUpload.url, {
        body: file,
        credentials: safeUpload.controlledUpload ? "same-origin" : "omit",
        headers: { ...safeUpload.headers, ...controlledUploadHeaders },
        method: safeUpload.method,
        redirect: "error",
        signal: AbortSignal.timeout(30_000),
      })
      if (!uploadRequest.ok) {
        const failure = safeFetchError(uploadRequest.error)
        const cleanup = await discardCreatedAttachmentDraft({ draftId: created.value.draftId, inquiryId })
        return preferDefinitiveCleanupFailure(failure, cleanup)
      }
      if (!uploadRequest.response.ok) {
        const failure = { error: { code: "service-unavailable" as const }, ok: false as const }
        const cleanup = await discardCreatedAttachmentDraft({ draftId: created.value.draftId, inquiryId })
        return preferDefinitiveCleanupFailure(failure, cleanup)
      }

      const finalized = await jsonMutation(
        "/api/dashboard/inquiries/attachments/drafts/finalize",
        "POST",
        { draftId: created.value.draftId, inquiryId },
        z.object({ finalized: z.literal(true) }),
      )
      if (!finalized.ok) {
        const cleanup = await discardCreatedAttachmentDraft({ draftId: created.value.draftId, inquiryId })
        return preferDefinitiveCleanupFailure(finalized, cleanup)
      }
      return {
        ok: true,
        value: {
          draftId: created.value.draftId,
          expiresAt: created.value.expiresAt,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          status: "ready",
        },
      }
    },
    discardAttachmentDraft: (input) =>
      jsonMutation(
        "/api/dashboard/inquiries/attachments/drafts/discard",
        "POST",
        input,
        z.object({ discarded: z.boolean() }),
      ),
    async loadDetail(input) {
      const query = new URLSearchParams({ inquiryId: input.inquiryId })
      if (input.knownChangeCursor !== undefined) {
        query.set("knownChangeCursor", input.knownChangeCursor)
      }
      if (input.knownRevision !== undefined) query.set("knownRevision", String(input.knownRevision))
      const request = await fetchWithSafeFailure(`/api/dashboard/inquiries/detail?${query}`, {
        cache: "no-store",
        credentials: "same-origin",
        redirect: "error",
        signal: AbortSignal.timeout(8_000),
      })
      return request.ok ? parseResult(request.response, detailResultSchema) : safeFetchError(request.error)
    },
    async loadQueue(input) {
      const query = new URLSearchParams({
        lifecycle: input.lifecycle,
        unreadOnly: String(input.unreadOnly),
      })
      if (input.cursor) query.set("cursor", input.cursor)
      if (input.knownChangeCursor) query.set("knownChangeCursor", input.knownChangeCursor)
      if (input.handlingStatus?.length) query.set("handlingStatus", input.handlingStatus.join(","))
      if (input.query) query.set("query", input.query)
      const request = await fetchWithSafeFailure(`/api/dashboard/inquiries?${query}`, {
        cache: "no-store",
        credentials: "same-origin",
        redirect: "error",
        signal: AbortSignal.timeout(8_000),
      })
      return request.ok ? parseResult(request.response, queueSchema) : safeFetchError(request.error)
    },
    sendExternalMessage: (input) =>
      jsonMutation("/api/dashboard/inquiries/messages", "POST", input, mutationSchema),
  }
}

/** @deprecated Use createInquiryWorkspaceApiCommands. */
export const createInquiryStatusApiCommands = createInquiryWorkspaceApiCommands
